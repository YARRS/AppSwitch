from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
import base64
import io
from PIL import Image
import mimetypes
import uuid

from models import APIResponse, UserInDB
from auth import get_current_active_user

router = APIRouter(prefix="/api/uploads", tags=["File Uploads"])

# Database dependency
async def get_db():
    from server import db
    return db

# File type validation
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'}
ALLOWED_VIDEO_TYPES = {'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'}

# File size limits (in bytes)
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

class FileService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.files_collection = db.uploaded_files
    
    async def validate_file(self, file: UploadFile, file_type: str) -> dict:
        """Validate file type and size"""
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Reset file position for later processing
        await file.seek(0)
        
        # Validate file type
        if file_type == 'image':
            if file.content_type not in ALLOWED_IMAGE_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid image type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
                )
            if file_size > MAX_IMAGE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"Image too large. Maximum size: {MAX_IMAGE_SIZE / (1024*1024):.1f}MB"
                )
        
        elif file_type == 'video':
            if file.content_type not in ALLOWED_VIDEO_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid video type. Allowed types: {', '.join(ALLOWED_VIDEO_TYPES)}"
                )
            if file_size > MAX_VIDEO_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"Video too large. Maximum size: {MAX_VIDEO_SIZE / (1024*1024):.1f}MB"
                )
        
        return {
            'file_size': file_size,
            'content_type': file.content_type,
            'filename': file.filename
        }
    
    async def process_image(self, file: UploadFile) -> str:
        """Process and optimize image, return base64 string"""
        try:
            # Read image
            content = await file.read()
            image = Image.open(io.BytesIO(content))
            
            # Convert RGBA to RGB if necessary
            if image.mode in ('RGBA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # Resize if too large (max 1200x1200)
            max_size = 1200
            if image.width > max_size or image.height > max_size:
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # Save as JPEG with optimization
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=85, optimize=True)
            
            # Convert to base64
            base64_string = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return base64_string
            
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error processing image: {str(e)}"
            )
    
    async def process_video(self, file: UploadFile) -> str:
        """Process video, return base64 string"""
        try:
            # For videos, we just encode to base64 without processing
            content = await file.read()
            base64_string = base64.b64encode(content).decode('utf-8')
            
            return base64_string
            
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Error processing video: {str(e)}"
            )
    
    async def save_file_record(self, file_data: dict) -> str:
        """Save file record to database"""
        file_id = str(uuid.uuid4())
        file_record = {
            'id': file_id,
            'filename': file_data['filename'],
            'content_type': file_data['content_type'],
            'file_size': file_data['file_size'],
            'base64_data': file_data['base64_data'],
            'uploaded_by': file_data['user_id'],
            'created_at': file_data['created_at']
        }
        
        await self.files_collection.insert_one(file_record)
        return file_id

# Get upload limits endpoint
@router.get("/limits", response_model=APIResponse)
async def get_upload_limits():
    """Get file upload limits and allowed types"""
    return APIResponse(
        success=True,
        message="Upload limits retrieved successfully",
        data={
            "images": {
                "max_size_mb": MAX_IMAGE_SIZE / (1024 * 1024),
                "allowed_types": list(ALLOWED_IMAGE_TYPES),
                "max_files_per_upload": 10
            },
            "videos": {
                "max_size_mb": MAX_VIDEO_SIZE / (1024 * 1024),
                "allowed_types": list(ALLOWED_VIDEO_TYPES),
                "max_files_per_upload": 5
            }
        }
    )

# Single image upload
@router.post("/image", response_model=APIResponse)
async def upload_image(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Upload a single image"""
    try:
        file_service = FileService(db)
        
        # Validate file
        file_info = await file_service.validate_file(file, 'image')
        
        # Process image
        base64_data = await file_service.process_image(file)
        
        # Save file record
        from datetime import datetime
        file_data = {
            'filename': file_info['filename'],
            'content_type': file_info['content_type'],
            'file_size': file_info['file_size'],
            'base64_data': base64_data,
            'user_id': current_user.id,
            'created_at': datetime.utcnow()
        }
        
        file_id = await file_service.save_file_record(file_data)
        
        return APIResponse(
            success=True,
            message="Image uploaded successfully",
            data={
                "file_id": file_id,
                "filename": file_info['filename'],
                "base64_data": base64_data,
                "file_size": file_info['file_size'],
                "content_type": file_info['content_type']
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload image: {str(e)}"
        )

# Multiple images upload
@router.post("/images", response_model=APIResponse)
async def upload_images(
    files: List[UploadFile] = File(...),
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Upload multiple images (max 10)"""
    try:
        if len(files) > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 images can be uploaded at once"
            )
        
        file_service = FileService(db)
        uploaded_files = []
        errors = []
        
        for i, file in enumerate(files):
            try:
                # Validate file
                file_info = await file_service.validate_file(file, 'image')
                
                # Process image
                base64_data = await file_service.process_image(file)
                
                # Save file record
                from datetime import datetime
                file_data = {
                    'filename': file_info['filename'],
                    'content_type': file_info['content_type'],
                    'file_size': file_info['file_size'],
                    'base64_data': base64_data,
                    'user_id': current_user.id,
                    'created_at': datetime.utcnow()
                }
                
                file_id = await file_service.save_file_record(file_data)
                
                uploaded_files.append({
                    "file_id": file_id,
                    "filename": file_info['filename'],
                    "base64_data": base64_data,
                    "file_size": file_info['file_size'],
                    "content_type": file_info['content_type']
                })
                
            except Exception as e:
                errors.append({
                    "filename": file.filename,
                    "error": str(e)
                })
        
        return APIResponse(
            success=len(uploaded_files) > 0,
            message=f"Uploaded {len(uploaded_files)} images successfully" + (f", {len(errors)} failed" if errors else ""),
            data={
                "uploaded_files": uploaded_files,
                "errors": errors,
                "total_uploaded": len(uploaded_files),
                "total_failed": len(errors)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload images: {str(e)}"
        )

# Single video upload
@router.post("/video", response_model=APIResponse)
async def upload_video(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Upload a single video"""
    try:
        file_service = FileService(db)
        
        # Validate file
        file_info = await file_service.validate_file(file, 'video')
        
        # Process video
        base64_data = await file_service.process_video(file)
        
        # Save file record
        from datetime import datetime
        file_data = {
            'filename': file_info['filename'],
            'content_type': file_info['content_type'],
            'file_size': file_info['file_size'],
            'base64_data': base64_data,
            'user_id': current_user.id,
            'created_at': datetime.utcnow()
        }
        
        file_id = await file_service.save_file_record(file_data)
        
        return APIResponse(
            success=True,
            message="Video uploaded successfully",
            data={
                "file_id": file_id,
                "filename": file_info['filename'],
                "base64_data": base64_data,
                "file_size": file_info['file_size'],
                "content_type": file_info['content_type']
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload video: {str(e)}"
        )

# Multiple videos upload
@router.post("/videos", response_model=APIResponse)
async def upload_videos(
    files: List[UploadFile] = File(...),
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Upload multiple videos (max 5)"""
    try:
        if len(files) > 5:
            raise HTTPException(
                status_code=400,
                detail="Maximum 5 videos can be uploaded at once"
            )
        
        file_service = FileService(db)
        uploaded_files = []
        errors = []
        
        for i, file in enumerate(files):
            try:
                # Validate file
                file_info = await file_service.validate_file(file, 'video')
                
                # Process video
                base64_data = await file_service.process_video(file)
                
                # Save file record
                from datetime import datetime
                file_data = {
                    'filename': file_info['filename'],
                    'content_type': file_info['content_type'],
                    'file_size': file_info['file_size'],
                    'base64_data': base64_data,
                    'user_id': current_user.id,
                    'created_at': datetime.utcnow()
                }
                
                file_id = await file_service.save_file_record(file_data)
                
                uploaded_files.append({
                    "file_id": file_id,
                    "filename": file_info['filename'],
                    "base64_data": base64_data,
                    "file_size": file_info['file_size'],
                    "content_type": file_info['content_type']
                })
                
            except Exception as e:
                errors.append({
                    "filename": file.filename,
                    "error": str(e)
                })
        
        return APIResponse(
            success=len(uploaded_files) > 0,
            message=f"Uploaded {len(uploaded_files)} videos successfully" + (f", {len(errors)} failed" if errors else ""),
            data={
                "uploaded_files": uploaded_files,
                "errors": errors,
                "total_uploaded": len(uploaded_files),
                "total_failed": len(errors)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload videos: {str(e)}"
        )