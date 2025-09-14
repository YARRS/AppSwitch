from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List, Dict, Any
from datetime import datetime
from timezone_utils import now_ist

from models import (
    TaxSlabBase, TaxSlabInDB, TaxSlabResponse,
    TaxConfigurationBase, TaxConfigurationCreate, TaxConfigurationUpdate, 
    TaxConfigurationInDB, TaxConfigurationResponse,
    TaxCalculationRequest, TaxCalculationResponse,
    TaxBreakdown, ProductTaxCalculation, OrderTaxBreakdown,
    HiddenTaxCategory, TaxCalculationType, GSTType,
    APIResponse, PaginatedResponse, UserInDB, ProductInDB
)
from auth import get_current_active_user, get_admin_user

router = APIRouter(prefix="/api/tax", tags=["Tax Management"])

# Database dependency
async def get_db():
    from server import db
    return db

class TaxService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.tax_slabs_collection = db.tax_slabs
        self.tax_configurations_collection = db.tax_configurations
        self.products_collection = db.products
        
        # Indian GST Tax Slabs as per requirements
        self.DEFAULT_TAX_SLABS = {
            # Gift Articles
            HiddenTaxCategory.LUXURY_GIFTS: {
                "tax_rate": 18.0,
                "cgst_rate": 9.0,
                "sgst_rate": 9.0,
                "igst_rate": 18.0,
                "description": "Luxury gifts, decorative items, premium personalized gifts"
            },
            HiddenTaxCategory.STANDARD_GIFTS: {
                "tax_rate": 12.0,
                "cgst_rate": 6.0,
                "sgst_rate": 6.0,
                "igst_rate": 12.0,
                "description": "Standard gifts, regular decorative items"
            },
            HiddenTaxCategory.ECO_FRIENDLY_GIFTS: {
                "tax_rate": 5.0,
                "cgst_rate": 2.5,
                "sgst_rate": 2.5,
                "igst_rate": 5.0,
                "description": "Eco-friendly gifts, sustainable products"
            },
            
            # Toys
            HiddenTaxCategory.EDUCATIONAL_TOYS: {
                "tax_rate": 12.0,
                "cgst_rate": 6.0,
                "sgst_rate": 6.0,
                "igst_rate": 12.0,
                "description": "Educational toys, learning games"
            },
            HiddenTaxCategory.NOVELTY_TOYS: {
                "tax_rate": 18.0,
                "cgst_rate": 9.0,
                "sgst_rate": 9.0,
                "igst_rate": 18.0,
                "description": "Novelty toys, entertainment toys"
            },
            HiddenTaxCategory.ECO_FRIENDLY_TOYS: {
                "tax_rate": 5.0,
                "cgst_rate": 2.5,
                "sgst_rate": 2.5,
                "igst_rate": 5.0,
                "description": "Eco-friendly toys, wooden toys"
            },
            HiddenTaxCategory.PREMIUM_TOYS: {
                "tax_rate": 28.0,
                "cgst_rate": 14.0,
                "sgst_rate": 14.0,
                "igst_rate": 28.0,
                "description": "Premium toys, luxury toys, high-end electronic toys"
            }
        }
    
    async def initialize_default_tax_data(self):
        """Initialize default tax slabs and configurations"""
        # Check if tax slabs already exist
        existing_count = await self.tax_slabs_collection.count_documents({})
        if existing_count > 0:
            return  # Data already exists
        
        # Create default tax slabs
        for category, slab_data in self.DEFAULT_TAX_SLABS.items():
            tax_slab = TaxSlabInDB(
                hidden_tax_category=category,
                **slab_data
            )
            await self.tax_slabs_collection.insert_one(tax_slab.dict())
        
        # Create default tax configurations (all set to exclusive by default)
        for category in HiddenTaxCategory:
            tax_config = TaxConfigurationInDB(
                hidden_tax_category=category,
                tax_calculation_type=TaxCalculationType.EXCLUSIVE,
                updated_by="system",  # Default system configuration
                notes="Default configuration - tax exclusive of listed price"
            )
            await self.tax_configurations_collection.insert_one(tax_config.dict())
    
    async def get_tax_slab(self, hidden_tax_category: HiddenTaxCategory) -> Optional[TaxSlabInDB]:
        """Get tax slab for a specific category"""
        tax_slab_doc = await self.tax_slabs_collection.find_one({
            "hidden_tax_category": hidden_tax_category.value,
            "is_active": True
        })
        if tax_slab_doc:
            return TaxSlabInDB(**tax_slab_doc)
        return None
    
    async def get_tax_configuration(self, hidden_tax_category: HiddenTaxCategory) -> Optional[TaxConfigurationInDB]:
        """Get tax configuration for a specific category"""
        tax_config_doc = await self.tax_configurations_collection.find_one({
            "hidden_tax_category": hidden_tax_category.value,
            "is_active": True
        })
        if tax_config_doc:
            return TaxConfigurationInDB(**tax_config_doc)
        return None
    
    def calculate_tax_breakdown(
        self, 
        base_amount: float, 
        tax_slab: TaxSlabInDB, 
        is_inter_state: bool,
        tax_calculation_type: TaxCalculationType = TaxCalculationType.EXCLUSIVE
    ) -> TaxBreakdown:
        """Calculate detailed tax breakdown"""
        
        if tax_calculation_type == TaxCalculationType.INCLUSIVE:
            # Tax is included in the price - reverse calculate
            tax_rate = tax_slab.tax_rate / 100
            actual_base_amount = base_amount / (1 + tax_rate)
            total_tax = base_amount - actual_base_amount
        else:
            # Tax is exclusive - add on top
            actual_base_amount = base_amount
            tax_rate = tax_slab.tax_rate / 100
            total_tax = actual_base_amount * tax_rate
        
        # Determine GST type and breakdown
        if is_inter_state:
            # Inter-state: Use IGST
            tax_breakdown = TaxBreakdown(
                base_amount=actual_base_amount,
                tax_type=GSTType.IGST,
                cgst_amount=0.0,
                sgst_amount=0.0,
                igst_amount=total_tax,
                total_tax_amount=total_tax,
                total_amount=actual_base_amount + total_tax,
                tax_rate=tax_slab.tax_rate
            )
        else:
            # Intra-state: Use CGST + SGST
            cgst_amount = total_tax / 2
            sgst_amount = total_tax / 2
            
            tax_breakdown = TaxBreakdown(
                base_amount=actual_base_amount,
                tax_type=GSTType.CGST_SGST,
                cgst_amount=cgst_amount,
                sgst_amount=sgst_amount,
                igst_amount=0.0,
                total_tax_amount=total_tax,
                total_amount=actual_base_amount + total_tax,
                tax_rate=tax_slab.tax_rate
            )
        
        return tax_breakdown
    
    async def calculate_order_tax(self, request: TaxCalculationRequest) -> OrderTaxBreakdown:
        """Calculate comprehensive tax breakdown for an order"""
        
        # Determine if it's inter-state transaction
        customer_state = request.customer_state.lower()
        seller_state = request.seller_state.lower()
        is_inter_state = customer_state != seller_state
        
        items_tax_breakdown = []
        subtotal_before_tax = 0.0
        total_tax_amount = 0.0
        total_cgst = 0.0
        total_sgst = 0.0
        total_igst = 0.0
        
        for item_data in request.items:
            product_id = item_data.get("product_id")
            quantity = item_data.get("quantity", 1)
            unit_price = item_data.get("price", 0.0)
            
            # Get product details from database
            product_doc = await self.products_collection.find_one({"id": product_id})
            if not product_doc:
                continue
            
            product = ProductInDB(**product_doc)
            
            # Skip if no tax category assigned
            if not product.hidden_tax_category:
                # Add as non-taxable item
                item_tax = ProductTaxCalculation(
                    product_id=product_id,
                    product_name=product.name,
                    hidden_tax_category=None,
                    tax_calculation_type=TaxCalculationType.EXCLUSIVE,
                    unit_price=unit_price,
                    quantity=quantity,
                    tax_breakdown=TaxBreakdown(
                        base_amount=unit_price * quantity,
                        tax_type=GSTType.CGST_SGST,
                        total_amount=unit_price * quantity,
                        tax_rate=0.0
                    )
                )
                items_tax_breakdown.append(item_tax)
                subtotal_before_tax += unit_price * quantity
                continue
            
            # Get tax slab and configuration
            tax_slab = await self.get_tax_slab(product.hidden_tax_category)
            if not tax_slab:
                continue
            
            # Use product's tax calculation type or fall back to configuration
            tax_calculation_type = product.tax_calculation_type
            if not tax_calculation_type:
                tax_config = await self.get_tax_configuration(product.hidden_tax_category)
                tax_calculation_type = tax_config.tax_calculation_type if tax_config else TaxCalculationType.EXCLUSIVE
            
            # Calculate tax for this item
            item_total = unit_price * quantity
            tax_breakdown = self.calculate_tax_breakdown(
                item_total, 
                tax_slab, 
                is_inter_state,
                tax_calculation_type
            )
            
            # Create item tax calculation
            item_tax = ProductTaxCalculation(
                product_id=product_id,
                product_name=product.name,
                hidden_tax_category=product.hidden_tax_category,
                tax_calculation_type=tax_calculation_type,
                unit_price=unit_price,
                quantity=quantity,
                tax_breakdown=tax_breakdown
            )
            
            items_tax_breakdown.append(item_tax)
            subtotal_before_tax += tax_breakdown.base_amount
            total_tax_amount += tax_breakdown.total_tax_amount
            total_cgst += tax_breakdown.cgst_amount
            total_sgst += tax_breakdown.sgst_amount
            total_igst += tax_breakdown.igst_amount
        
        # Create comprehensive order tax breakdown
        order_tax_breakdown = OrderTaxBreakdown(
            customer_state=request.customer_state,
            seller_state=request.seller_state,
            is_inter_state=is_inter_state,
            items_tax_breakdown=items_tax_breakdown,
            subtotal_before_tax=subtotal_before_tax,
            total_tax_amount=total_tax_amount,
            total_cgst=total_cgst,
            total_sgst=total_sgst,
            total_igst=total_igst,
            final_amount=subtotal_before_tax + total_tax_amount
        )
        
        return order_tax_breakdown

# Tax calculation endpoints
@router.post("/calculate", response_model=TaxCalculationResponse)
async def calculate_tax(
    request: TaxCalculationRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Calculate tax for a list of products"""
    try:
        tax_service = TaxService(db)
        
        # Initialize default tax data if needed
        await tax_service.initialize_default_tax_data()
        
        # Calculate tax breakdown
        tax_breakdown = await tax_service.calculate_order_tax(request)
        
        return TaxCalculationResponse(
            success=True,
            message="Tax calculated successfully",
            data=tax_breakdown
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate tax: {str(e)}"
        )

@router.get("/slabs", response_model=APIResponse)
async def get_tax_slabs(
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all tax slabs (admin only)"""
    try:
        tax_service = TaxService(db)
        
        # Initialize default tax data if needed
        await tax_service.initialize_default_tax_data()
        
        # Get all tax slabs
        cursor = tax_service.tax_slabs_collection.find({"is_active": True})
        tax_slabs = await cursor.to_list(length=None)
        
        # Convert to response format
        tax_slab_responses = []
        for tax_slab_doc in tax_slabs:
            tax_slab = TaxSlabInDB(**tax_slab_doc)
            tax_slab_responses.append(TaxSlabResponse(**tax_slab.dict()).dict())
        
        return APIResponse(
            success=True,
            message="Tax slabs retrieved successfully",
            data=tax_slab_responses
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tax slabs"
        )

@router.get("/configurations", response_model=APIResponse)
async def get_tax_configurations(
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all tax configurations (admin only)"""
    try:
        tax_service = TaxService(db)
        
        # Initialize default tax data if needed
        await tax_service.initialize_default_tax_data()
        
        # Get all tax configurations
        cursor = tax_service.tax_configurations_collection.find({"is_active": True})
        tax_configs = await cursor.to_list(length=None)
        
        # Convert to response format
        tax_config_responses = []
        for tax_config_doc in tax_configs:
            tax_config = TaxConfigurationInDB(**tax_config_doc)
            tax_config_responses.append(TaxConfigurationResponse(**tax_config.dict()).dict())
        
        return APIResponse(
            success=True,
            message="Tax configurations retrieved successfully",
            data=tax_config_responses
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tax configurations"
        )

@router.put("/configurations/{category}", response_model=APIResponse)
async def update_tax_configuration(
    category: HiddenTaxCategory,
    update_data: TaxConfigurationUpdate,
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update tax configuration for a specific category (admin only)"""
    try:
        tax_service = TaxService(db)
        
        # Update tax configuration
        update_dict = update_data.dict(exclude_unset=True)
        update_dict["updated_at"] = now_ist()
        update_dict["updated_by"] = admin_user.id
        
        result = await tax_service.tax_configurations_collection.update_one(
            {"hidden_tax_category": category.value},
            {"$set": update_dict}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tax configuration not found"
            )
        
        # Get updated configuration
        updated_config_doc = await tax_service.tax_configurations_collection.find_one({
            "hidden_tax_category": category.value
        })
        
        updated_config = TaxConfigurationInDB(**updated_config_doc)
        
        return APIResponse(
            success=True,
            message="Tax configuration updated successfully",
            data=TaxConfigurationResponse(**updated_config.dict()).dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tax configuration"
        )

@router.get("/categories", response_model=APIResponse)
async def get_tax_categories():
    """Get all available hidden tax categories"""
    try:
        categories = []
        tax_service = TaxService(None)  # Don't need DB for this
        
        for category in HiddenTaxCategory:
            category_info = {
                "value": category.value,
                "name": category.name,
                "display_name": category.value.replace("_", " ").title(),
                "tax_slab": tax_service.DEFAULT_TAX_SLABS.get(category, {})
            }
            categories.append(category_info)
        
        return APIResponse(
            success=True,
            message="Tax categories retrieved successfully",
            data=categories
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tax categories"
        )

@router.post("/initialize", response_model=APIResponse)
async def initialize_tax_data(
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Initialize default tax data (admin only)"""
    try:
        tax_service = TaxService(db)
        await tax_service.initialize_default_tax_data()
        
        return APIResponse(
            success=True,
            message="Tax data initialized successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize tax data"
        )