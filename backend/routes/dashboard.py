from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, List
from datetime import datetime, timedelta

from models import (
    SalespersonDashboard, StoreAdminDashboard, SalesManagerDashboard,
    StoreOwnerDashboard, SupportExecutiveDashboard, MarketingManagerDashboard,
    APIResponse, UserInDB, UserRole
)
from auth import get_current_active_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

# Database dependency
async def get_db():
    from server import db
    return db

class DashboardService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.products_collection = db.products
        self.orders_collection = db.orders
        self.users_collection = db.users
        self.campaigns_collection = db.campaigns
        self.commission_earnings_collection = db.commission_earnings
        self.inventory_logs_collection = db.inventory_logs
        self.inquiries_collection = db.inquiries
    
    async def get_basic_stats(self) -> Dict[str, Any]:
        """Get basic statistics for all dashboards"""
        # Get total products
        total_products = await self.products_collection.count_documents({})
        
        # Get total orders
        total_orders = await self.orders_collection.count_documents({})
        
        # Get total revenue
        revenue_pipeline = [
            {"$group": {"_id": None, "total": {"$sum": "$final_amount"}}}
        ]
        revenue_result = await self.orders_collection.aggregate(revenue_pipeline).to_list(length=1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        
        # Get total customers
        total_customers = await self.users_collection.count_documents({"role": "customer"})
        
        # Get low stock products
        low_stock_products = await self.products_collection.count_documents({
            "$expr": {"$lte": ["$stock_quantity", "$min_stock_level"]}
        })
        
        # Get pending orders
        pending_orders = await self.orders_collection.count_documents({"status": "pending"})
        
        # Get active campaigns
        active_campaigns = await self.campaigns_collection.count_documents({"status": "active"})
        
        # Get total commissions
        commission_pipeline = [
            {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
        ]
        commission_result = await self.commission_earnings_collection.aggregate(commission_pipeline).to_list(length=1)
        total_commissions = commission_result[0]["total"] if commission_result else 0
        
        return {
            "total_products": total_products,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "total_customers": total_customers,
            "low_stock_products": low_stock_products,
            "pending_orders": pending_orders,
            "active_campaigns": active_campaigns,
            "total_commissions": total_commissions
        }
    
    async def get_salesperson_dashboard(self, user_id: str) -> SalespersonDashboard:
        """Get dashboard data for salesperson"""
        basic_stats = await self.get_basic_stats()
        
        # Get my sales
        my_sales_pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": None, "total": {"$sum": "$final_amount"}}}
        ]
        my_sales_result = await self.orders_collection.aggregate(my_sales_pipeline).to_list(length=1)
        my_sales = my_sales_result[0]["total"] if my_sales_result else 0
        
        # Get my commissions
        my_commissions_pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
        ]
        my_commissions_result = await self.commission_earnings_collection.aggregate(my_commissions_pipeline).to_list(length=1)
        my_commissions = my_commissions_result[0]["total"] if my_commissions_result else 0
        
        # Get my products count (if products are assigned to salesperson)
        my_products = await self.products_collection.count_documents({"assigned_to": user_id})
        
        # Get my customers (orders I've handled)
        my_customers_pipeline = [
            {"$match": {"salesperson_id": user_id}},
            {"$group": {"_id": "$user_id"}},
            {"$count": "total"}
        ]
        my_customers_result = await self.orders_collection.aggregate(my_customers_pipeline).to_list(length=1)
        my_customers = my_customers_result[0]["total"] if my_customers_result else 0
        
        return SalespersonDashboard(
            **basic_stats,
            my_sales=my_sales,
            my_commissions=my_commissions,
            my_products=my_products,
            my_customers=my_customers
        )
    
    async def get_store_admin_dashboard(self, user_id: str) -> StoreAdminDashboard:
        """Get dashboard data for store admin"""
        basic_stats = await self.get_basic_stats()
        
        # Get inventory alerts (low stock + recent stock movements)
        inventory_alerts = basic_stats["low_stock_products"]
        
        # Get recent stock movements as alerts
        recent_movements = await self.inventory_logs_collection.count_documents({
            "created_at": {"$gte": now_ist() - timedelta(days=1)}
        })
        inventory_alerts += recent_movements
        
        # Get reassignment requests (you might need to implement this in your system)
        reassignment_requests = await self.inventory_logs_collection.count_documents({
            "action": "reassignment",
            "created_at": {"$gte": now_ist() - timedelta(days=7)}
        })
        
        return StoreAdminDashboard(
            **basic_stats,
            inventory_alerts=inventory_alerts,
            reassignment_requests=reassignment_requests
        )
    
    async def get_sales_manager_dashboard(self, user_id: str) -> SalesManagerDashboard:
        """Get dashboard data for sales manager"""
        basic_stats = await self.get_basic_stats()
        
        # Get team performance
        team_performance_pipeline = [
            {"$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "id",
                "as": "user"
            }},
            {"$unwind": "$user"},
            {"$match": {"user.role": "salesperson"}},
            {"$group": {
                "_id": "$user_id",
                "username": {"$first": "$user.username"},
                "total_sales": {"$sum": "$final_amount"},
                "order_count": {"$sum": 1}
            }},
            {"$sort": {"total_sales": -1}},
            {"$limit": 10}
        ]
        team_performance = await self.orders_collection.aggregate(team_performance_pipeline).to_list(length=10)
        
        # Get campaign performance
        campaign_performance_pipeline = [
            {"$match": {"status": "active"}},
            {"$project": {
                "name": 1,
                "usage_count": 1,
                "usage_limit": 1,
                "discount_value": 1,
                "start_date": 1,
                "end_date": 1
            }},
            {"$sort": {"usage_count": -1}},
            {"$limit": 10}
        ]
        campaign_performance = await self.campaigns_collection.aggregate(campaign_performance_pipeline).to_list(length=10)
        
        return SalesManagerDashboard(
            **basic_stats,
            team_performance=team_performance,
            campaign_performance=campaign_performance
        )
    
    async def get_store_owner_dashboard(self, user_id: str) -> StoreOwnerDashboard:
        """Get dashboard data for store owner"""
        basic_stats = await self.get_basic_stats()
        
        # Calculate profit margin (simplified)
        profit_margin = 20.0  # This would be calculated based on actual costs
        
        # Get commission payouts
        commission_payouts_pipeline = [
            {"$match": {"status": "paid"}},
            {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
        ]
        commission_payouts_result = await self.commission_earnings_collection.aggregate(commission_payouts_pipeline).to_list(length=1)
        commission_payouts = commission_payouts_result[0]["total"] if commission_payouts_result else 0
        
        # Get inventory value
        inventory_value_pipeline = [
            {"$group": {"_id": None, "total": {"$sum": {"$multiply": ["$price", "$stock_quantity"]}}}}
        ]
        inventory_value_result = await self.products_collection.aggregate(inventory_value_pipeline).to_list(length=1)
        inventory_value = inventory_value_result[0]["total"] if inventory_value_result else 0
        
        return StoreOwnerDashboard(
            **basic_stats,
            profit_margin=profit_margin,
            commission_payouts=commission_payouts,
            inventory_value=inventory_value
        )
    
    async def get_support_executive_dashboard(self, user_id: str) -> SupportExecutiveDashboard:
        """Get dashboard data for support executive"""
        # Get total tickets (inquiries)
        total_tickets = await self.inquiries_collection.count_documents({})
        
        # Get pending tickets
        pending_tickets = await self.inquiries_collection.count_documents({"status": "pending"})
        
        # Get resolved tickets
        resolved_tickets = await self.inquiries_collection.count_documents({"status": "resolved"})
        
        # Get customer inquiries (recent)
        customer_inquiries = await self.inquiries_collection.count_documents({
            "created_at": {"$gte": now_ist() - timedelta(days=7)}
        })
        
        return SupportExecutiveDashboard(
            total_tickets=total_tickets,
            pending_tickets=pending_tickets,
            resolved_tickets=resolved_tickets,
            customer_inquiries=customer_inquiries
        )
    
    async def get_marketing_manager_dashboard(self, user_id: str) -> MarketingManagerDashboard:
        """Get dashboard data for marketing manager"""
        basic_stats = await self.get_basic_stats()
        
        # Calculate conversion rate (simplified)
        total_visitors = 1000  # This would come from analytics
        conversion_rate = (basic_stats["total_customers"] / total_visitors) * 100 if total_visitors > 0 else 0
        
        # Get customer acquisition (new customers in last 30 days)
        customer_acquisition = await self.users_collection.count_documents({
            "role": "customer",
            "created_at": {"$gte": now_ist() - timedelta(days=30)}
        })
        
        # Get email campaigns (active campaigns)
        email_campaigns = basic_stats["active_campaigns"]
        
        return MarketingManagerDashboard(
            **basic_stats,
            conversion_rate=conversion_rate,
            customer_acquisition=customer_acquisition,
            email_campaigns=email_campaigns
        )

# Dashboard endpoints
@router.get("/", response_model=APIResponse)
async def get_dashboard(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get dashboard data based on user role"""
    try:
        dashboard_service = DashboardService(db)
        
        # Route to appropriate dashboard based on user role
        if current_user.role == UserRole.SALESPERSON:
            dashboard_data = await dashboard_service.get_salesperson_dashboard(current_user.id)
        elif current_user.role == UserRole.STORE_ADMIN:
            dashboard_data = await dashboard_service.get_store_admin_dashboard(current_user.id)
        elif current_user.role == UserRole.SALES_MANAGER:
            dashboard_data = await dashboard_service.get_sales_manager_dashboard(current_user.id)
        elif current_user.role == UserRole.STORE_OWNER:
            dashboard_data = await dashboard_service.get_store_owner_dashboard(current_user.id)
        elif current_user.role == UserRole.SUPPORT_EXECUTIVE:
            dashboard_data = await dashboard_service.get_support_executive_dashboard(current_user.id)
        elif current_user.role == UserRole.MARKETING_MANAGER:
            dashboard_data = await dashboard_service.get_marketing_manager_dashboard(current_user.id)
        elif current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            # Admin gets store owner dashboard with full access
            dashboard_data = await dashboard_service.get_store_owner_dashboard(current_user.id)
        else:
            # Default to basic stats for customers
            dashboard_data = await dashboard_service.get_basic_stats()
        
        return APIResponse(
            success=True,
            message="Dashboard data retrieved successfully",
            data=dashboard_data.dict() if hasattr(dashboard_data, 'dict') else dashboard_data
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard data"
        )

@router.get("/stats", response_model=APIResponse)
async def get_basic_stats(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get basic statistics (available to all roles)"""
    try:
        dashboard_service = DashboardService(db)
        
        stats = await dashboard_service.get_basic_stats()
        
        return APIResponse(
            success=True,
            message="Basic statistics retrieved successfully",
            data=stats
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve basic statistics"
        )

@router.get("/salesperson/{user_id}", response_model=APIResponse)
async def get_salesperson_dashboard(
    user_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get salesperson dashboard (admin access or own data)"""
    try:
        # Check permissions
        if current_user.role not in ["admin", "super_admin", "sales_manager", "store_owner"] and current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this dashboard"
            )
        
        dashboard_service = DashboardService(db)
        dashboard_data = await dashboard_service.get_salesperson_dashboard(user_id)
        
        return APIResponse(
            success=True,
            message="Salesperson dashboard retrieved successfully",
            data=dashboard_data.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve salesperson dashboard"
        )

@router.get("/analytics", response_model=APIResponse)
async def get_analytics_data(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get analytics data for charts and graphs"""
    try:
        # Check permissions
        if current_user.role not in ["admin", "super_admin", "sales_manager", "marketing_manager", "store_owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view analytics"
            )
        
        dashboard_service = DashboardService(db)
        
        # Get sales data for last 30 days
        start_date = now_ist() - timedelta(days=30)
        sales_pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"},
                    "day": {"$dayOfMonth": "$created_at"}
                },
                "total_sales": {"$sum": "$final_amount"},
                "order_count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        sales_data = await dashboard_service.orders_collection.aggregate(sales_pipeline).to_list(length=30)
        
        # Get product category sales
        category_pipeline = [
            {"$lookup": {
                "from": "products",
                "localField": "items.product_id",
                "foreignField": "id",
                "as": "product_info"
            }},
            {"$unwind": "$product_info"},
            {"$group": {
                "_id": "$product_info.category",
                "total_sales": {"$sum": "$final_amount"},
                "order_count": {"$sum": 1}
            }},
            {"$sort": {"total_sales": -1}}
        ]
        category_data = await dashboard_service.orders_collection.aggregate(category_pipeline).to_list(length=10)
        
        analytics_data = {
            "daily_sales": sales_data,
            "category_sales": category_data,
            "generated_at": now_ist()
        }
        
        return APIResponse(
            success=True,
            message="Analytics data retrieved successfully",
            data=analytics_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve analytics data"
        )