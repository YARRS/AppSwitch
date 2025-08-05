from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime
import uuid

from models import (
    CartItem, CartResponse, CartInDB, ProductInDB,
    APIResponse, UserInDB, GuestCart, GuestCartItem, CartMergeRequest
)
from auth import get_current_active_user, get_optional_current_user

router = APIRouter(prefix="/api/cart", tags=["Shopping Cart"])

# Database dependency
async def get_db():
    from server import db
    return db

class CartService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.carts_collection = db.carts
        self.guest_carts_collection = db.guest_carts
        self.products_collection = db.products
    
    async def get_cart(self, user_id: str) -> Optional[CartInDB]:
        """Get user's cart"""
        cart_doc = await self.carts_collection.find_one({"user_id": user_id})
        if cart_doc:
            return CartInDB(**cart_doc)
        return None
    
    async def get_guest_cart(self, session_id: str) -> Optional[GuestCart]:
        """Get guest cart by session ID"""
        cart_doc = await self.guest_carts_collection.find_one({"session_id": session_id})
        if cart_doc:
            return GuestCart(**cart_doc)
        return None
    
    async def create_cart(self, user_id: str) -> CartInDB:
        """Create new cart for user"""
        cart = CartInDB(user_id=user_id, items=[], total_amount=0.0, total_items=0)
        cart_dict = cart.dict()
        
        await self.carts_collection.insert_one(cart_dict)
        return cart
    
    async def create_guest_cart(self, session_id: str) -> GuestCart:
        """Create new guest cart"""
        cart = GuestCart(session_id=session_id, items=[], total_amount=0.0, total_items=0)
        cart_dict = cart.dict()
        
        await self.guest_carts_collection.insert_one(cart_dict)
        return cart
    
    async def update_cart(self, cart: CartInDB) -> CartInDB:
        """Update cart in database"""
        # Recalculate totals
        cart.total_amount = sum(item.price * item.quantity for item in cart.items)
        cart.total_items = sum(item.quantity for item in cart.items)
        cart.updated_at = datetime.utcnow()
        
        await self.carts_collection.update_one(
            {"user_id": cart.user_id},
            {"$set": cart.dict()}
        )
        
        return cart
    
    async def update_guest_cart(self, cart: GuestCart) -> GuestCart:
        """Update guest cart in database"""
        # Recalculate totals
        cart.total_amount = sum(item.price * item.quantity for item in cart.items)
        cart.total_items = sum(item.quantity for item in cart.items)
        cart.updated_at = datetime.utcnow()
        
        await self.guest_carts_collection.update_one(
            {"session_id": cart.session_id},
            {"$set": cart.dict()}
        )
        
        return cart
    
    async def add_item_to_cart(self, user_id: str, product_id: str, quantity: int = 1) -> CartInDB:
        """Add item to user cart"""
        # Get or create cart
        cart = await self.get_cart(user_id)
        if not cart:
            cart = await self.create_cart(user_id)
        
        return await self._add_item_logic(cart, product_id, quantity, is_guest=False)
    
    async def add_item_to_guest_cart(self, session_id: str, product_id: str, quantity: int = 1) -> GuestCart:
        """Add item to guest cart"""
        # Get or create guest cart
        cart = await self.get_guest_cart(session_id)
        if not cart:
            cart = await self.create_guest_cart(session_id)
        
        return await self._add_item_logic_guest(cart, product_id, quantity)
    
    async def _add_item_logic(self, cart: CartInDB, product_id: str, quantity: int, is_guest: bool = False):
        """Common logic for adding items to cart"""
        # Get product details
        product_doc = await self.products_collection.find_one({"id": product_id})
        if not product_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        product = ProductInDB(**product_doc)
        
        # Check if product is active and in stock
        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product is not available"
            )
        
        if product.stock_quantity < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient stock"
            )
        
        # Check if item already exists in cart
        existing_item = None
        for item in cart.items:
            if item.product_id == product_id:
                existing_item = item
                break
        
        if existing_item:
            # Update quantity
            new_quantity = existing_item.quantity + quantity
            if new_quantity > product.stock_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient stock"
                )
            existing_item.quantity = new_quantity
        else:
            # Add new item
            cart_item = CartItem(
                product_id=product_id,
                quantity=quantity,
                price=product.discount_price if product.discount_price else product.price,
                product_name=product.name,
                product_image=product.images[0] if product.images else None
            )
            cart.items.append(cart_item)
        
        # Update cart
        return await self.update_cart(cart)
    
    async def _add_item_logic_guest(self, cart: GuestCart, product_id: str, quantity: int):
        """Common logic for adding items to guest cart"""
        # Get product details
        product_doc = await self.products_collection.find_one({"id": product_id})
        if not product_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        product = ProductInDB(**product_doc)
        
        # Check if product is active and in stock
        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product is not available"
            )
        
        if product.stock_quantity < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient stock"
            )
        
        # Check if item already exists in cart
        existing_item = None
        for item in cart.items:
            if item.product_id == product_id:
                existing_item = item
                break
        
        if existing_item:
            # Update quantity
            new_quantity = existing_item.quantity + quantity
            if new_quantity > product.stock_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient stock"
                )
            existing_item.quantity = new_quantity
        else:
            # Add new item
            cart_item = GuestCartItem(
                product_id=product_id,
                quantity=quantity,
                price=product.discount_price if product.discount_price else product.price,
                product_name=product.name,
                product_image=product.images[0] if product.images else None
            )
            cart.items.append(cart_item)
        
        # Update cart
        return await self.update_guest_cart(cart)
    
    async def merge_guest_cart_with_user_cart(self, user_id: str, guest_session_id: str) -> CartInDB:
        """Merge guest cart with user cart when user logs in"""
        # Get guest cart
        guest_cart = await self.get_guest_cart(guest_session_id)
        if not guest_cart or not guest_cart.items:
            # No guest cart or empty cart, just return user's cart or create new one
            user_cart = await self.get_cart(user_id)
            if not user_cart:
                user_cart = await self.create_cart(user_id)
            return user_cart
        
        # Get or create user cart
        user_cart = await self.get_cart(user_id)
        if not user_cart:
            user_cart = await self.create_cart(user_id)
        
        # Merge items from guest cart
        for guest_item in guest_cart.items:
            # Check if item exists in user cart
            existing_item = None
            for user_item in user_cart.items:
                if user_item.product_id == guest_item.product_id:
                    existing_item = user_item
                    break
            
            if existing_item:
                # Combine quantities
                existing_item.quantity += guest_item.quantity
            else:
                # Add new item to user cart
                cart_item = CartItem(
                    product_id=guest_item.product_id,
                    quantity=guest_item.quantity,
                    price=guest_item.price,
                    product_name=guest_item.product_name,
                    product_image=guest_item.product_image
                )
                user_cart.items.append(cart_item)
        
        # Update user cart
        updated_cart = await self.update_cart(user_cart)
        
        # Delete guest cart after merging
        await self.guest_carts_collection.delete_one({"session_id": guest_session_id})
        
        return updated_cart
    
    async def remove_item_from_cart(self, user_id: str, product_id: str) -> CartInDB:
        """Remove item from cart"""
        cart = await self.get_cart(user_id)
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cart not found"
            )
        
        # Remove item
        cart.items = [item for item in cart.items if item.product_id != product_id]
        
        # Update cart
        return await self.update_cart(cart)
    
    async def update_item_quantity(self, user_id: str, product_id: str, quantity: int) -> CartInDB:
        """Update item quantity in cart"""
        cart = await self.get_cart(user_id)
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cart not found"
            )
        
        # Find item
        item = None
        for cart_item in cart.items:
            if cart_item.product_id == product_id:
                item = cart_item
                break
        
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found in cart"
            )
        
        # Check stock
        product_doc = await self.products_collection.find_one({"id": product_id})
        if product_doc:
            product = ProductInDB(**product_doc)
            if quantity > product.stock_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient stock"
                )
        
        # Update quantity
        if quantity <= 0:
            # Remove item if quantity is 0 or negative
            cart.items = [item for item in cart.items if item.product_id != product_id]
        else:
            item.quantity = quantity
        
        # Update cart
        return await self.update_cart(cart)
    
    async def clear_cart(self, user_id: str) -> CartInDB:
        """Clear all items from cart"""
        cart = await self.get_cart(user_id)
        if not cart:
            cart = await self.create_cart(user_id)
        
        cart.items = []
        return await self.update_cart(cart)

@router.get("/", response_model=APIResponse)
async def get_cart(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get user's shopping cart"""
    try:
        cart_service = CartService(db)
        
        cart = await cart_service.get_cart(current_user.id)
        if not cart:
            cart = await cart_service.create_cart(current_user.id)
        
        cart_response = CartResponse(
            **cart.dict()
        )
        
        return APIResponse(
            success=True,
            message="Cart retrieved successfully",
            data=cart_response.dict()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cart"
        )

@router.post("/items/{product_id}", response_model=APIResponse)
async def add_to_cart(
    product_id: str,
    quantity: int = 1,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Add item to cart"""
    try:
        cart_service = CartService(db)
        
        cart = await cart_service.add_item_to_cart(
            current_user.id,
            product_id,
            quantity
        )
        
        cart_response = CartResponse(**cart.dict())
        
        return APIResponse(
            success=True,
            message="Item added to cart successfully",
            data=cart_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add item to cart"
        )

@router.delete("/items/{product_id}", response_model=APIResponse)
async def remove_from_cart(
    product_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Remove item from cart"""
    try:
        cart_service = CartService(db)
        
        cart = await cart_service.remove_item_from_cart(
            current_user.id,
            product_id
        )
        
        cart_response = CartResponse(**cart.dict())
        
        return APIResponse(
            success=True,
            message="Item removed from cart successfully",
            data=cart_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove item from cart"
        )

@router.put("/items/{product_id}", response_model=APIResponse)
async def update_cart_item(
    product_id: str,
    quantity: int,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Update item quantity in cart"""
    try:
        cart_service = CartService(db)
        
        cart = await cart_service.update_item_quantity(
            current_user.id,
            product_id,
            quantity
        )
        
        cart_response = CartResponse(**cart.dict())
        
        return APIResponse(
            success=True,
            message="Cart item updated successfully",
            data=cart_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update cart item"
        )

@router.delete("/", response_model=APIResponse)
async def clear_cart(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Clear all items from cart"""
    try:
        cart_service = CartService(db)
        
        cart = await cart_service.clear_cart(current_user.id)
        
        cart_response = CartResponse(**cart.dict())
        
        return APIResponse(
            success=True,
            message="Cart cleared successfully",
            data=cart_response.dict()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear cart"
        )