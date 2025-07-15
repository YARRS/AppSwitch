from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime

from models import (
    CartItem, CartResponse, CartInDB, ProductInDB,
    APIResponse, UserInDB
)
from auth import get_current_active_user

router = APIRouter(prefix="/api/cart", tags=["Shopping Cart"])

# Database dependency
async def get_db():
    from server import db
    return db

class CartService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.carts_collection = db.carts
        self.products_collection = db.products
    
    async def get_cart(self, user_id: str) -> Optional[CartInDB]:
        """Get user's cart"""
        cart_doc = await self.carts_collection.find_one({"user_id": user_id})
        if cart_doc:
            return CartInDB(**cart_doc)
        return None
    
    async def create_cart(self, user_id: str) -> CartInDB:
        """Create new cart for user"""
        cart = CartInDB(user_id=user_id, items=[], total_amount=0.0, total_items=0)
        cart_dict = cart.dict()
        
        await self.carts_collection.insert_one(cart_dict)
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
    
    async def add_item_to_cart(self, user_id: str, product_id: str, quantity: int = 1) -> CartInDB:
        """Add item to cart"""
        # Get or create cart
        cart = await self.get_cart(user_id)
        if not cart:
            cart = await self.create_cart(user_id)
        
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