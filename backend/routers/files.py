
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database import SessionLocal, FileMetadata, FileChunk, User, FileHistory
from bot import bot
from settings import CHANNEL_ID
from aiogram.types import BufferedInputFile
import io
import secrets
from datetime import datetime
from pydantic import BaseModel
from utils.encryption import encrypt_chunk, decrypt_chunk
from routers.auth import get_current_user, get_db

router = APIRouter(prefix="/files", tags=["files"])

# --- REQUEST MODELS ---
class CreateFolderRequest(BaseModel):
    name: str
    parent_id: Optional[int] = None

class RenameRequest(BaseModel):
    name: str

class MoveRequest(BaseModel):
    new_parent_id: Optional[int] = None

class CreateStructureRequest(BaseModel):
    paths: List[str]
    parent_id: Optional[int] = None

# --- ENDPOINTS ---

@router.post("/structure")
def create_folder_structure(
    req: CreateStructureRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recursively create folder structure and return path->id mapping"""
    # path_map: "folder/subfolder" -> folder_id
    path_map = {}
    
    # Sort paths by length to ensure parents are created first
    # actually we just process each path part by part
    
    unique_paths = sorted(list(set(req.paths)))
    
    for path in unique_paths:
        parts = path.strip("/").split("/")
        current_parent_id = req.parent_id
        current_path_str = ""
        
        for i, part in enumerate(parts):
            if not part: continue
            
            current_path_str = "/".join(parts[:i+1])
            
            # Check if this folder already exists in current parent
            existing = db.query(FileMetadata).filter(
                FileMetadata.owner_id == current_user.id,
                FileMetadata.parent_id == current_parent_id,
                FileMetadata.name == part,
                FileMetadata.is_folder == True
            ).first()
            
            if existing:
                current_parent_id = existing.id
            else:
                # Create it
                new_folder = FileMetadata(
                    name=part,
                    owner_id=current_user.id,
                    parent_id=current_parent_id,
                    is_folder=True
                )
                db.add(new_folder)
                db.commit()
                db.refresh(new_folder)
                current_parent_id = new_folder.id
            
            path_map[current_path_str] = current_parent_id
            
    return path_map

@router.get("/")
def list_files(
    parent_id: Optional[int] = None, 
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(FileMetadata).filter(FileMetadata.owner_id == current_user.id)
    
    # Only show completed uploads (or folders)
    query = query.filter(
        (FileMetadata.is_folder == True) | (FileMetadata.upload_complete == True)
    )
    
    if q:
        # Global search by name
        query = query.filter(FileMetadata.name.ilike(f"%{q}%"))
    else:
        # Directory listing
        query = query.filter(FileMetadata.parent_id == parent_id)
        
    files = query.all()
    return files

@router.post("/create_folder")
def create_folder(
    req: CreateFolderRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify parent belongs to user if set
    if req.parent_id:
        parent = db.query(FileMetadata).filter(
            FileMetadata.id == req.parent_id, 
            FileMetadata.owner_id == current_user.id
        ).first()
        if not parent:
             raise HTTPException(status_code=404, detail="Parent folder not found")

    new_folder = FileMetadata(
        name=req.name,
        parent_id=req.parent_id,
        is_folder=True,
        mime_type="application/vnd.google-apps.folder",
        owner_id=current_user.id
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder

@router.post("/init_upload")
def init_upload(
    name: str = Form(...),
    size: str = Form(...),
    total_chunks: str = Form(...),  # NEW: Expected number of chunks
    parent_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    parsed_parent_id = None
    if parent_id and parent_id != "null" and parent_id != "undefined":
        try:
            parsed_parent_id = int(parent_id)
            parent = db.query(FileMetadata).filter(
                FileMetadata.id == parsed_parent_id, 
                FileMetadata.owner_id == current_user.id
            ).first()
            if not parent:
                raise HTTPException(status_code=404, detail="Parent folder not found")
        except ValueError:
            pass
        
    new_file = FileMetadata(
        name=name,
        size=int(size),
        parent_id=parsed_parent_id,
        is_folder=False,
        mime_type="application/octet-stream",
        owner_id=current_user.id,
        total_chunks=int(total_chunks),
        uploaded_chunks=0,
        upload_complete=False
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    # Log history
    history = FileHistory(
        user_id=current_user.id,
        file_id=new_file.id,
        action="upload",
        file_name=name
    )
    db.add(history)
    db.commit()
    
    return {"file_id": new_file.id, "total_chunks": new_file.total_chunks}

@router.post("/{file_id}/chunk")
async def upload_file_chunk(
    file_id: int,
    chunk_index: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_meta = db.query(FileMetadata).filter(
        FileMetadata.id == file_id,
        FileMetadata.owner_id == current_user.id
    ).first()
    
    if not file_meta:
        raise HTTPException(status_code=404, detail="File not found")

    content = await file.read()
    
    try:
        # ENCRYPTION STEP
        encrypted_content = encrypt_chunk(content)
        
        input_file = BufferedInputFile(encrypted_content, filename=f"{file_meta.name}.part{chunk_index}.enc")
        caption = f"FileID: {file_id} | Chunk: {chunk_index} | Encrypted | User: {current_user.id}"
        
        msg = await bot.send_document(
            chat_id=int(CHANNEL_ID),
            document=input_file,
            caption=caption
        )
        
        new_chunk = FileChunk(
            file_id=file_id,
            channel_message_id=msg.message_id,
            channel_id=int(CHANNEL_ID),
            chunk_order=chunk_index,
            size=len(content), # Informational: original size
            telegram_file_id=msg.document.file_id
        )
        db.add(new_chunk)
        
        # Update upload progress
        file_meta.uploaded_chunks += 1
        if file_meta.uploaded_chunks >= file_meta.total_chunks:
            file_meta.upload_complete = True
        db.commit()
        
        return {
            "status": "uploaded", 
            "chunk_index": chunk_index,
            "uploaded_chunks": file_meta.uploaded_chunks,
            "total_chunks": file_meta.total_chunks,
            "complete": file_meta.upload_complete
        }

    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/{file_id}/upload-status")
def get_upload_status(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check upload status of a file"""
    file_meta = db.query(FileMetadata).filter(
        FileMetadata.id == file_id,
        FileMetadata.owner_id == current_user.id
    ).first()
    
    if not file_meta:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {
        "file_id": file_meta.id,
        "name": file_meta.name,
        "upload_complete": file_meta.upload_complete,
        "uploaded_chunks": file_meta.uploaded_chunks,
        "total_chunks": file_meta.total_chunks,
        "progress": round((file_meta.uploaded_chunks / file_meta.total_chunks * 100) if file_meta.total_chunks > 0 else 0, 1)
    }


@router.delete("/{file_id}")
async def delete_file(
    file_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_meta = db.query(FileMetadata).filter(
        FileMetadata.id == file_id,
        FileMetadata.owner_id == current_user.id
    ).first()
    if not file_meta:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_name = file_meta.name  # Save before delete
    
    # Recursive delete function for folders
    async def delete_recursive(item_id: int):
        item = db.query(FileMetadata).filter(FileMetadata.id == item_id).first()
        if not item:
            return
        
        if item.is_folder:
            # Delete all children first
            children = db.query(FileMetadata).filter(FileMetadata.parent_id == item_id).all()
            for child in children:
                await delete_recursive(child.id)
        
        # Delete chunks from Telegram channel and database
        chunks = db.query(FileChunk).filter(FileChunk.file_id == item_id).all()
        for chunk in chunks:
            try:
                # Delete message from Telegram channel
                await bot.delete_message(chat_id=chunk.channel_id, message_id=chunk.channel_message_id)
            except Exception as e:
                print(f"Failed to delete Telegram message {chunk.channel_message_id}: {e}")
            db.delete(chunk)
        
        db.delete(item)
    
    await delete_recursive(file_id)
    db.commit()
    
    # Log history (file_id is None since file is deleted)
    history = FileHistory(
        user_id=current_user.id,
        file_id=None,
        action="delete",
        file_name=file_name
    )
    db.add(history)
    db.commit()
    
    return {"status": "deleted"}

@router.put("/{file_id}/rename")
def rename_file(
    file_id: int, 
    req: RenameRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_meta = db.query(FileMetadata).filter(
        FileMetadata.id == file_id,
        FileMetadata.owner_id == current_user.id
    ).first()
    if not file_meta:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_meta.name = req.name
    db.commit()
    
    # Log history
    history = FileHistory(
        user_id=current_user.id,
        file_id=file_id,
        action="rename",
        file_name=req.name,
        details=f"Renamed to {req.name}"
    )
    db.add(history)
    db.commit()
    
    return {"status": "updated", "name": req.name}

# --- NEW ENDPOINTS ---

@router.get("/recent/list")
def get_recent_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get last 50 accessed files"""
    files = db.query(FileMetadata).filter(
        FileMetadata.owner_id == current_user.id,
        FileMetadata.is_folder == False
    ).order_by(FileMetadata.accessed_at.desc()).limit(50).all()
    return files

@router.get("/history/list")
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's file action history"""
    history = db.query(FileHistory).filter(
        FileHistory.user_id == current_user.id
    ).order_by(FileHistory.created_at.desc()).limit(100).all()
    return history

@router.get("/folders/list")
def get_all_folders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all folders for move dialog"""
    folders = db.query(FileMetadata).filter(
        FileMetadata.owner_id == current_user.id,
        FileMetadata.is_folder == True
    ).all()
    return folders

@router.post("/{file_id}/share")
def share_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate share link for file"""
    file_meta = db.query(FileMetadata).filter(
        FileMetadata.id == file_id,
        FileMetadata.owner_id == current_user.id
    ).first()
    if not file_meta:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Generate or return existing token
    if not file_meta.share_token:
        file_meta.share_token = secrets.token_urlsafe(16)
        db.commit()
    
    # Log history
    history = FileHistory(
        user_id=current_user.id,
        file_id=file_id,
        action="share",
        file_name=file_meta.name
    )
    db.add(history)
    db.commit()
    
    return {
        "share_token": file_meta.share_token,
        "share_url": f"http://localhost:8000/files/shared/{file_meta.share_token}"
    }

@router.get("/shared/{share_token}")
async def download_shared_file(
    share_token: str,
    db: Session = Depends(get_db)
):
    """Download a file via share link (no auth required)"""
    file_meta = db.query(FileMetadata).filter(
        FileMetadata.share_token == share_token
    ).first()
    
    if not file_meta:
        raise HTTPException(status_code=404, detail="Shared file not found or link expired")
    
    if file_meta.is_folder:
        raise HTTPException(status_code=400, detail="Cannot download folders")
    
    chunks = db.query(FileChunk).filter(FileChunk.file_id == file_meta.id).order_by(FileChunk.chunk_order).all()
    
    if not chunks:
        raise HTTPException(status_code=404, detail="No file data found")

    async def file_generator():
        for chunk in chunks:
            try:
                if chunk.telegram_file_id:
                    file_info = await bot.get_file(chunk.telegram_file_id)
                    file_content_io = await bot.download_file(file_info.file_path)
                    encrypted_data = file_content_io.read()
                    
                    try:
                        decrypted_data = decrypt_chunk(encrypted_data)
                        yield decrypted_data
                    except Exception as e:
                        print(f"Decryption failed: {e}")
            except Exception as e:
                print(f"Error downloading chunk: {e}")

    return StreamingResponse(
        file_generator(), 
        media_type=file_meta.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={file_meta.name}"}
    )


@router.put("/{file_id}/move")
def move_file(
    file_id: int,
    req: MoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Move file to new parent folder"""
    file_meta = db.query(FileMetadata).filter(
        FileMetadata.id == file_id,
        FileMetadata.owner_id == current_user.id
    ).first()
    if not file_meta:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Verify new parent if set
    if req.new_parent_id is not None:
        parent = db.query(FileMetadata).filter(
            FileMetadata.id == req.new_parent_id,
            FileMetadata.owner_id == current_user.id,
            FileMetadata.is_folder == True
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Destination folder not found")
    
    old_parent = file_meta.parent_id
    file_meta.parent_id = req.new_parent_id
    db.commit()
    
    # Log history
    history = FileHistory(
        user_id=current_user.id,
        file_id=file_id,
        action="move",
        file_name=file_meta.name,
        details=f"Moved from {old_parent} to {req.new_parent_id}"
    )
    db.add(history)
    db.commit()
    
    return {"status": "moved", "new_parent_id": req.new_parent_id}

@router.get("/{file_id}/info")
def get_file_info(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed file information"""
    file_meta = db.query(FileMetadata).filter(
        FileMetadata.id == file_id,
        FileMetadata.owner_id == current_user.id
    ).first()
    if not file_meta:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get path
    path_parts = []
    current = file_meta
    while current.parent_id:
        parent = db.query(FileMetadata).filter(FileMetadata.id == current.parent_id).first()
        if parent:
            path_parts.insert(0, parent.name)
            current = parent
        else:
            break
    
    return {
        "id": file_meta.id,
        "name": file_meta.name,
        "size": file_meta.size,
        "mime_type": file_meta.mime_type,
        "is_folder": file_meta.is_folder,
        "created_at": file_meta.created_at.isoformat() if file_meta.created_at else None,
        "accessed_at": file_meta.accessed_at.isoformat() if file_meta.accessed_at else None,
        "path": "/" + "/".join(path_parts) if path_parts else "/",
        "share_token": file_meta.share_token
    }


@router.get("/{file_id}/download")
async def download_file(
    file_id: int, 
    token: str, # passed as query param for direct download links
    db: Session = Depends(get_db)
):
    # Manual token validation for download links (browser doesn't send headers for simple GET links generally unless using fetch, but we open in new tab)
    # Ideally we'd use a short-lived download token, but for now we reuse access token or specific logic.
    # To keep it simple: Validate token -> get user -> check owner
    from utils.security import verify_token
    tg_id = verify_token(token)
    if not tg_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.phone_number == tg_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    file_meta = db.query(FileMetadata).filter(
        FileMetadata.id == file_id,
        FileMetadata.owner_id == user.id
    ).first()
    
    if not file_meta:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Update accessed_at for recent files
    file_meta.accessed_at = datetime.utcnow()
    db.commit()
    
    # Log history
    history = FileHistory(
        user_id=user.id,
        file_id=file_id,
        action="download",
        file_name=file_meta.name
    )
    db.add(history)
    db.commit()
        
    chunks = db.query(FileChunk).filter(FileChunk.file_id == file_id).order_by(FileChunk.chunk_order).all()
    
    if not chunks:
         raise HTTPException(status_code=404, detail="No chunks found")

    async def file_generator():
        for chunk in chunks:
            try:
                if chunk.telegram_file_id:
                    file_info = await bot.get_file(chunk.telegram_file_id)
                    file_content_io = await bot.download_file(file_info.file_path)
                    encrypted_data = file_content_io.read()
                    
                    try:
                        decrypted_data = decrypt_chunk(encrypted_data)
                        yield decrypted_data
                    except Exception as e:
                        print(f"Decryption failed: {e}")
            except Exception as e:
                print(f"Error downloading chunk: {e}")

    return StreamingResponse(
        file_generator(), 
        media_type=file_meta.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={file_meta.name}"}
    )
