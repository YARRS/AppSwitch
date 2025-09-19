from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime, timedelta
from timezone_utils import now_ist
import uuid
from pydantic import BaseModel

from models import (
    OrderCreate, OrderUpdate, OrderResponse, OrderInDB,
    OrderItem, OrderStatus, APIResponse, PaginatedResponse,
    UserInDB, ProductInDB, CartInDB, GuestCart, ShippingAddress,
    UserRole, AuthenticatedOrderCreate, OrderActivityBase, OrderActivityCreate,
    OrderActivityInDB, OrderActivityResponse, OrderActivityType,
    OrderNoteBase, OrderNoteCreate, OrderNoteInDB, OrderNoteResponse,
    OrderReplacementBase, OrderReplacementCreate, OrderReplacementUpdate,
    OrderReplacementInDB, OrderReplacementResponse, ReplacementReason, ReplacementStatus,
    OrderCancellationBase, OrderCancellationCreate, OrderCancellationInDB, OrderCancellationResponse,
    EmailNotificationCreate, EmailNotificationInDB
)
from auth import get_current_active_user, get_admin_user

router = APIRouter(prefix="/api/order-management", tags=["Order Management"])

class EnhancedOrderService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.orders_collection = db.orders
        self.products_collection = db.products
        self.users_collection = db.users
        self.order_activities_collection = db.order_activities
        self.order_notes_collection = db.order_notes
        self.order_replacements_collection = db.order_replacements
        self.order_cancellations_collection = db.order_cancellations
        self.email_notifications_collection = db.email_notifications
    
    # Helper method to check admin permissions
    def can_revert_timeline(self, user_role: str) -> bool:
        """Check if user can revert order timeline"""
        return user_role in ["super_admin", "admin"]
    
    def can_manage_orders(self, user_role: str) -> bool:
        """Check if user can manage orders"""
        return user_role in ["super_admin", "admin", "store_owner", "salesperson", "sales_manager"]
    
    async def create_order_activity(self, activity_data: dict) -> OrderActivityInDB:
        """Create order activity/timeline entry"""
        activity = OrderActivityInDB(**activity_data)
        activity_dict = activity.dict()
        await self.order_activities_collection.insert_one(activity_dict)
        return activity
    
    async def get_order_timeline(self, order_id: str) -> List[OrderActivityResponse]:
        """Get order timeline/activities"""
        activities_cursor = self.order_activities_collection.find(
            {"order_id": order_id}
        ).sort("created_at", 1)
        activities = await activities_cursor.to_list(length=100)
        
        # Enhance with user names
        timeline = []
        for activity_doc in activities:
            activity = OrderActivityResponse(**activity_doc)
            
            # Get user name
            if activity.performed_by:
                user_doc = await self.users_collection.find_one({"id": activity.performed_by})
                if user_doc:
                    activity.performed_by_name = user_doc.get("full_name") or user_doc.get("username")
                    activity.performed_by_role = user_doc.get("role")
            
            timeline.append(activity)
        
        return timeline
    
    async def add_order_note(self, note_data: dict, current_user: UserInDB) -> OrderNoteInDB:
        """Add note to order"""
        note_data["created_by"] = current_user.id
        note = OrderNoteInDB(**note_data)
        note_dict = note.dict()
        await self.order_notes_collection.insert_one(note_dict)
        
        # Create timeline activity
        await self.create_order_activity({
            "id": str(uuid.uuid4()),
            "order_id": note_data["order_id"],
            "activity_type": OrderActivityType.NOTE_ADDED,
            "title": "Note Added",
            "description": f"Admin note: {note_data['note'][:50]}{'...' if len(note_data['note']) > 50 else ''}",
            "performed_by": current_user.id,
            "is_visible_to_customer": not note_data.get("is_internal", False),
            "metadata": {"note_id": note.id},
            "created_at": now_ist(),
            "updated_at": now_ist()
        })
        
        # Send email notification if not internal
        if not note_data.get("is_internal", False):
            await self.queue_email_notification(note_data["order_id"], "note_added", {
                "note": note_data["note"],
                "admin_name": current_user.full_name or current_user.username
            })
        
        return note
    
    async def get_order_notes(self, order_id: str, include_internal: bool = False) -> List[OrderNoteResponse]:
        """Get order notes"""
        query = {"order_id": order_id}
        if not include_internal:
            query["is_internal"] = {"$ne": True}
        
        notes_cursor = self.order_notes_collection.find(query).sort("created_at", 1)
        notes = await notes_cursor.to_list(length=100)
        
        # Enhance with user names
        enhanced_notes = []
        for note_doc in notes:
            note = OrderNoteResponse(**note_doc)
            
            # Get user name
            if note.created_by:
                user_doc = await self.users_collection.find_one({"id": note.created_by})
                if user_doc:
                    note.created_by_name = user_doc.get("full_name") or user_doc.get("username")
                    note.created_by_role = user_doc.get("role")
            
            enhanced_notes.append(note)
        
        return enhanced_notes
    
    async def update_order_status(
        self, 
        order_id: str, 
        new_status: OrderStatus, 
        current_user: UserInDB,
        tracking_number: Optional[str] = None,
        expected_delivery_date: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> OrderInDB:
        """Update order status with timeline tracking"""
        
        # Get current order
        order_doc = await self.orders_collection.find_one({"id": order_id})
        if not order_doc:
            raise HTTPException(status_code=404, detail="Order not found")
        
        current_order = OrderInDB(**order_doc)
        old_status = current_order.status
        
        # Check if user can revert timeline
        status_order = ["pending", "processing", "shipped", "delivered"]
        if (status_order.index(new_status.value) < status_order.index(old_status.value) and 
            not self.can_revert_timeline(current_user.role)):
            raise HTTPException(
                status_code=403, 
                detail="You don't have permission to revert order status"
            )
        
        # Prepare update data
        update_data = {
            "status": new_status.value,
            "updated_at": now_ist()
        }
        
        if tracking_number:
            update_data["tracking_number"] = tracking_number
        if expected_delivery_date:
            update_data["expected_delivery_date"] = expected_delivery_date
        if notes:
            update_data["notes"] = notes
        
        # Add timestamp fields based on status
        if new_status == OrderStatus.SHIPPED:
            update_data["shipped_at"] = now_ist()
        elif new_status == OrderStatus.DELIVERED:
            update_data["delivered_at"] = now_ist()
            # Set replacement deadline (7 days from delivery)
            update_data["replacement_deadline"] = now_ist() + timedelta(days=7)
            update_data["can_be_replaced"] = True
        elif new_status == OrderStatus.CANCELLED:
            update_data["cancelled_at"] = now_ist()
        
        # Update order
        await self.orders_collection.update_one(
            {"id": order_id},
            {"$set": update_data}
        )
        
        # Create timeline activity
        await self.create_order_activity({
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "activity_type": OrderActivityType.STATUS_CHANGE,
            "title": f"Status Changed to {new_status.value.title()}",
            "description": f"Order status changed from {old_status} to {new_status.value}",
            "performed_by": current_user.id,
            "is_visible_to_customer": True,
            "metadata": {
                "old_status": old_status,
                "new_status": new_status.value,
                "tracking_number": tracking_number,
                "expected_delivery_date": expected_delivery_date.isoformat() if expected_delivery_date else None
            },
            "created_at": now_ist(),
            "updated_at": now_ist()
        })
        
        # Send email notifications for key status changes
        if new_status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            await self.queue_email_notification(order_id, f"order_{new_status.value}", {
                "tracking_number": tracking_number,
                "expected_delivery_date": expected_delivery_date.isoformat() if expected_delivery_date else None
            })
        
        # Get updated order
        updated_order_doc = await self.orders_collection.find_one({"id": order_id})
        return OrderInDB(**updated_order_doc)
    
    async def request_order_replacement(
        self, 
        order_id: str, 
        replacement_data: OrderReplacementCreate,
        current_user: UserInDB
    ) -> OrderReplacementInDB:
        """Request order replacement"""
        
        # Check if order exists and can be replaced
        order_doc = await self.orders_collection.find_one({"id": order_id})
        if not order_doc:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = OrderInDB(**order_doc)
        
        # Check if replacement is allowed
        if not order.can_be_replaced or not order.replacement_deadline:
            raise HTTPException(status_code=400, detail="Order cannot be replaced")
        
        if now_ist() > order.replacement_deadline:
            raise HTTPException(status_code=400, detail="Replacement deadline has passed")
        
        # Calculate handling charges based on location
        handling_charges = 99.0 if replacement_data.location_type == "local" else 199.0
        
        # Create replacement request
        replacement_dict = replacement_data.dict()
        replacement_dict["handling_charges"] = handling_charges
        replacement_dict["user_id"] = current_user.id
        replacement = OrderReplacementInDB(**replacement_dict)
        replacement_dict = replacement.dict()
        
        await self.order_replacements_collection.insert_one(replacement_dict)
        
        # Update order status
        await self.orders_collection.update_one(
            {"id": order_id},
            {"$set": {"status": OrderStatus.REPLACEMENT_REQUESTED.value, "updated_at": now_ist()}}
        )
        
        # Create timeline activity
        await self.create_order_activity({
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "activity_type": OrderActivityType.REPLACEMENT_REQUEST,
            "title": "Replacement Requested",
            "description": f"Replacement requested for {replacement_data.reason.value}: {replacement_data.description}",
            "performed_by": current_user.id,
            "is_visible_to_customer": True,
            "metadata": {
                "replacement_id": replacement.id,
                "reason": replacement_data.reason.value,
                "handling_charges": handling_charges
            },
            "created_at": now_ist(),
            "updated_at": now_ist()
        })
        
        return replacement
    
    async def process_replacement_request(
        self,
        replacement_id: str,
        approved: bool,
        current_user: UserInDB,
        rejection_reason: Optional[str] = None
    ) -> OrderReplacementInDB:
        """Approve or reject replacement request"""
        
        replacement_doc = await self.order_replacements_collection.find_one({"id": replacement_id})
        if not replacement_doc:
            raise HTTPException(status_code=404, detail="Replacement request not found")
        
        replacement = OrderReplacementInDB(**replacement_doc)
        
        if approved:
            # Create new replacement order
            original_order_doc = await self.orders_collection.find_one({"id": replacement.original_order_id})
            if not original_order_doc:
                raise HTTPException(status_code=404, detail="Original order not found")
            
            original_order = OrderInDB(**original_order_doc)
            
            # Create new order for replacement
            new_order_data = {
                "id": str(uuid.uuid4()),
                "user_id": replacement.user_id,
                "items": [item.dict() for item in replacement.items_to_replace],
                "shipping_address": original_order.shipping_address.dict(),
                "total_amount": sum(item.price * item.quantity for item in replacement.items_to_replace) + replacement.handling_charges,
                "handling_charges": replacement.handling_charges,
                "final_amount": sum(item.price * item.quantity for item in replacement.items_to_replace) + replacement.handling_charges,
                "status": OrderStatus.PENDING.value,
                "payment_method": "replacement",
                "is_replacement": True,
                "original_order_id": replacement.original_order_id,
                "order_number": f"RP{datetime.now().strftime('%Y%m%d')}{str(uuid.uuid4())[:8].upper()}",
                "created_at": now_ist(),
                "updated_at": now_ist()
            }
            
            new_order = OrderInDB(**new_order_data)
            await self.orders_collection.insert_one(new_order.dict())
            
            # Update replacement request
            await self.order_replacements_collection.update_one(
                {"id": replacement_id},
                {"$set": {
                    "status": ReplacementStatus.APPROVED.value,
                    "approved_by": current_user.id,
                    "new_order_id": new_order.id,
                    "updated_at": now_ist()
                }}
            )
            
            # Update original order status
            await self.orders_collection.update_one(
                {"id": replacement.original_order_id},
                {"$set": {"status": OrderStatus.REPLACEMENT_APPROVED.value, "updated_at": now_ist()}}
            )
            
            status_msg = f"Replacement approved. New order created: {new_order.order_number}"
            
        else:
            # Reject replacement
            await self.order_replacements_collection.update_one(
                {"id": replacement_id},
                {"$set": {
                    "status": ReplacementStatus.REJECTED.value,
                    "approved_by": current_user.id,
                    "rejected_reason": rejection_reason,
                    "updated_at": now_ist()
                }}
            )
            
            # Update original order status back to delivered
            await self.orders_collection.update_one(
                {"id": replacement.original_order_id},
                {"$set": {"status": OrderStatus.DELIVERED.value, "updated_at": now_ist()}}
            )
            
            status_msg = f"Replacement rejected: {rejection_reason}"
        
        # Create timeline activity
        await self.create_order_activity({
            "id": str(uuid.uuid4()),
            "order_id": replacement.original_order_id,
            "activity_type": OrderActivityType.ADMIN_ACTION,
            "title": "Replacement Request Processed",
            "description": status_msg,
            "performed_by": current_user.id,
            "is_visible_to_customer": True,
            "metadata": {
                "replacement_id": replacement_id,
                "approved": approved,
                "rejection_reason": rejection_reason
            },
            "created_at": now_ist(),
            "updated_at": now_ist()
        })
        
        # Get updated replacement
        updated_replacement_doc = await self.order_replacements_collection.find_one({"id": replacement_id})
        return OrderReplacementInDB(**updated_replacement_doc)
    
    async def cancel_order(
        self,
        order_id: str,
        reason: str,
        current_user: UserInDB
    ) -> OrderCancellationInDB:
        """Cancel order (only allowed during processing stage)"""
        
        order_doc = await self.orders_collection.find_one({"id": order_id})
        if not order_doc:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = OrderInDB(**order_doc)
        
        # Check if order can be cancelled
        if order.status not in [OrderStatus.PENDING, OrderStatus.PROCESSING]:
            raise HTTPException(status_code=400, detail="Order cannot be cancelled at this stage")
        
        # Create cancellation record
        cancellation_data = {
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "reason": reason,
            "requested_by": current_user.id,
            "refund_amount": order.final_amount,
            "refund_status": "pending",
            "created_at": now_ist(),
            "updated_at": now_ist()
        }
        
        cancellation = OrderCancellationInDB(**cancellation_data)
        await self.order_cancellations_collection.insert_one(cancellation.dict())
        
        # Update order status
        await self.orders_collection.update_one(
            {"id": order_id},
            {"$set": {"status": OrderStatus.CANCELLED.value, "cancelled_at": now_ist(), "updated_at": now_ist()}}
        )
        
        # Create timeline activity
        await self.create_order_activity({
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "activity_type": OrderActivityType.CANCELLATION_REQUEST,
            "title": "Order Cancelled",
            "description": f"Order cancelled: {reason}",
            "performed_by": current_user.id,
            "is_visible_to_customer": True,
            "metadata": {
                "cancellation_id": cancellation.id,
                "refund_amount": order.final_amount
            },
            "created_at": now_ist(),
            "updated_at": now_ist()
        })
        
        # Restore product stock
        for item in order.items:
            await self.products_collection.update_one(
                {"id": item.product_id},
                {"$inc": {"stock_quantity": item.quantity}}
            )
        
        return cancellation
    
    async def queue_email_notification(self, order_id: str, template_type: str, template_data: dict):
        """Queue email notification for sending"""
        
        # Get order and user details
        order_doc = await self.orders_collection.find_one({"id": order_id})
        if not order_doc:
            return
        
        order = OrderInDB(**order_doc)
        user_doc = await self.users_collection.find_one({"id": order.user_id})
        if not user_doc:
            return
        
        # Create email notification
        notification_data = {
            "id": str(uuid.uuid4()),
            "recipient_email": user_doc.get("email"),
            "recipient_name": user_doc.get("full_name") or user_doc.get("username"),
            "template_type": template_type,
            "subject": self.get_email_subject(template_type, order),
            "order_id": order_id,
            "order_number": order.order_number,
            "template_data": {
                **template_data,
                "order_number": order.order_number,
                "customer_name": user_doc.get("full_name") or user_doc.get("username")
            },
            "status": "pending",
            "created_at": now_ist(),
            "updated_at": now_ist()
        }
        
        notification = EmailNotificationInDB(**notification_data)
        await self.email_notifications_collection.insert_one(notification.dict())
    
    def get_email_subject(self, template_type: str, order: OrderInDB) -> str:
        """Generate email subject based on template type"""
        subjects = {
            "order_shipped": f"Your order {order.order_number} has been shipped!",
            "order_delivered": f"Your order {order.order_number} has been delivered!",
            "note_added": f"Update on your order {order.order_number}",
            "replacement_approved": f"Replacement approved for order {order.order_number}",
            "replacement_rejected": f"Replacement request update for order {order.order_number}"
        }
        return subjects.get(template_type, f"Update on your order {order.order_number}")
    
    async def get_enhanced_order_details(self, order_id: str, include_internal_notes: bool = False) -> OrderResponse:
        """Get complete order details with timeline and notes"""
        
        order_doc = await self.orders_collection.find_one({"id": order_id})
        if not order_doc:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = OrderInDB(**order_doc)
        
        # Get timeline
        timeline = await self.get_order_timeline(order_id)
        
        # Get notes
        notes = await self.get_order_notes(order_id, include_internal_notes)
        
        # Get assigned user name
        assigned_to_name = None
        if order.assigned_to:
            user_doc = await self.users_collection.find_one({"id": order.assigned_to})
            if user_doc:
                assigned_to_name = user_doc.get("full_name") or user_doc.get("username")
        
        # Create enhanced response
        order_response = OrderResponse(**order.dict())
        order_response.timeline = timeline
        order_response.notes = notes
        order_response.assigned_to_name = assigned_to_name
        
        return order_response

async def get_db():
    from server import db
    return db

# API Endpoints

@router.get("/orders/{order_id}/details", response_model=APIResponse)
async def get_enhanced_order_details(
    order_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get complete order details with timeline and notes"""
    try:
        service = EnhancedOrderService(db)
        
        # Check permissions
        order_doc = await service.orders_collection.find_one({"id": order_id})
        if not order_doc:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order = OrderInDB(**order_doc)
        if order.user_id != current_user.id and not service.can_manage_orders(current_user.role):
            raise HTTPException(status_code=403, detail="Not authorized to view this order")
        
        # Include internal notes for admins
        include_internal = service.can_manage_orders(current_user.role)
        order_details = await service.get_enhanced_order_details(order_id, include_internal)
        
        return APIResponse(
            success=True,
            message="Order details retrieved successfully",
            data=order_details.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve order details"
        )

@router.put("/orders/{order_id}/status", response_model=APIResponse)
async def update_order_status(
    order_id: str,
    new_status: OrderStatus,
    tracking_number: Optional[str] = None,
    expected_delivery_date: Optional[datetime] = None,
    notes: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update order status with timeline tracking"""
    try:
        service = EnhancedOrderService(db)
        
        # Check permissions
        if not service.can_manage_orders(current_user.role):
            raise HTTPException(status_code=403, detail="Not authorized to update orders")
        
        updated_order = await service.update_order_status(
            order_id, new_status, current_user, tracking_number, expected_delivery_date, notes
        )
        
        return APIResponse(
            success=True,
            message="Order status updated successfully",
            data=updated_order.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order status"
        )

@router.post("/orders/{order_id}/notes", response_model=APIResponse)
async def add_order_note(
    order_id: str,
    note_data: OrderNoteCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Add note to order"""
    try:
        service = EnhancedOrderService(db)
        
        # Check permissions
        if not service.can_manage_orders(current_user.role):
            raise HTTPException(status_code=403, detail="Not authorized to add notes")
        
        note_data.order_id = order_id
        note = await service.add_order_note(note_data.dict(), current_user)
        
        return APIResponse(
            success=True,
            message="Note added successfully",
            data=note.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add note"
        )

@router.post("/orders/{order_id}/replacement", response_model=APIResponse)
async def request_replacement(
    order_id: str,
    replacement_data: OrderReplacementCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Request order replacement"""
    try:
        service = EnhancedOrderService(db)
        replacement_data.original_order_id = order_id
        
        replacement = await service.request_order_replacement(order_id, replacement_data, current_user)
        
        return APIResponse(
            success=True,
            message="Replacement request submitted successfully",
            data=replacement.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit replacement request"
        )

@router.put("/replacements/{replacement_id}", response_model=APIResponse)
async def process_replacement(
    replacement_id: str,
    approved: bool,
    rejection_reason: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Process replacement request (approve/reject)"""
    try:
        service = EnhancedOrderService(db)
        
        # Check permissions
        if not service.can_manage_orders(current_user.role):
            raise HTTPException(status_code=403, detail="Not authorized to process replacements")
        
        replacement = await service.process_replacement_request(
            replacement_id, approved, current_user, rejection_reason
        )
        
        return APIResponse(
            success=True,
            message="Replacement request processed successfully",
            data=replacement.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process replacement request"
        )

@router.post("/orders/{order_id}/cancel", response_model=APIResponse)
async def cancel_order(
    order_id: str,
    reason: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Cancel order (only during processing stage)"""
    try:
        service = EnhancedOrderService(db)
        
        cancellation = await service.cancel_order(order_id, reason, current_user)
        
        return APIResponse(
            success=True,
            message="Order cancelled successfully",
            data=cancellation.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel order"
        )

@router.get("/orders/admin/dashboard", response_model=PaginatedResponse)
async def get_admin_orders_dashboard(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    priority: Optional[int] = None,
    search: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get orders dashboard for admin with advanced filtering"""
    try:
        service = EnhancedOrderService(db)
        
        # Check permissions
        if not service.can_manage_orders(current_user.role):
            raise HTTPException(status_code=403, detail="Not authorized to access admin dashboard")
        
        # Build query
        query = {}
        if status:
            query["status"] = status
        if assigned_to:
            query["assigned_to"] = assigned_to
        if priority is not None:
            query["priority"] = priority
        if search:
            query["$or"] = [
                {"order_number": {"$regex": search, "$options": "i"}},
                {"shipping_address.full_name": {"$regex": search, "$options": "i"}},
                {"shipping_address.phone": {"$regex": search, "$options": "i"}}
            ]
        
        # Calculate skip and get orders
        skip = (page - 1) * per_page
        cursor = service.orders_collection.find(query).sort("created_at", -1).skip(skip).limit(per_page)
        orders = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await service.orders_collection.count_documents(query)
        
        # Enhance orders with additional data
        enhanced_orders = []
        for order_doc in orders:
            order = OrderResponse(**order_doc)
            
            # Get assigned user name
            if order.assigned_to:
                user_doc = await service.users_collection.find_one({"id": order.assigned_to})
                if user_doc:
                    order.assigned_to_name = user_doc.get("full_name") or user_doc.get("username")
            
            # Get recent activity count
            activity_count = await service.order_activities_collection.count_documents({"order_id": order.id})
            order_dict = order.dict()
            order_dict["activity_count"] = activity_count
            
            enhanced_orders.append(order_dict)
        
        return PaginatedResponse(
            success=True,
            message="Admin orders dashboard retrieved successfully",
            data=enhanced_orders,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=(total + per_page - 1) // per_page
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve admin orders dashboard"
        )