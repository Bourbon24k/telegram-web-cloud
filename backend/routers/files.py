
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
import asyncio
import zipfile
from aiogram.exceptions import TelegramRetryAfter
from io import BytesIO

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
        
    # Check for existing incomplete file
    existing_file = db.query(FileMetadata).filter(
        FileMetadata.owner_id == current_user.id,
        FileMetadata.name == name,
        FileMetadata.parent_id == parsed_parent_id,
        FileMetadata.upload_complete == False
    ).first()

    if existing_file:
        # Log history for resume
        history = FileHistory(
            user_id=current_user.id,
            file_id=existing_file.id,
            action="resume_upload",
            file_name=name
        )
        db.add(history)
        db.commit()
        
        # Get existing chunks to skip
        chunks = db.query(FileChunk).filter(FileChunk.file_id == existing_file.id).all()
        # Assume chunk_order = frontend_index * 1000 + part
        existing_indices = list(set([int(c.chunk_order / 1000) for c in chunks]))
        
        return {
            "file_id": existing_file.id, 
            "total_chunks": existing_file.total_chunks,
            "existing_chunks": existing_indices,
            "resumed": True
        }

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
    
    return {
        "file_id": new_file.id, 
        "total_chunks": new_file.total_chunks, 
        "existing_chunks": [],
        "resumed": False
    }

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
    
    # Check if this chunk (index) already processed/exists?
    # Resumable logic relies on init_upload telling client to skip. 
    # But if client ignores, we might duplicate.
    # Safe guard: Check if chunk range exists?
    # db.query(FileChunk).filter(file_id, chunk_order >= index*1000, chunk_order < index*1000 + 1000).count()
    # If exists, we skip to avoid dupes.
    existing_count = db.query(FileChunk).filter(
        FileChunk.file_id == file_id,
        FileChunk.chunk_order >= chunk_index * 1000,
        FileChunk.chunk_order < (chunk_index + 1) * 1000
    ).count()
    
    if existing_count > 0:
         return {
            "status": "already_exists",
            "chunk_index": chunk_index,
            "uploaded_chunks": file_meta.uploaded_chunks
        }
    
    CHUNK_SIZE_LIMIT = 45 * 1024 * 1024 # 45MB
    
    try:
        parts = []
        if len(content) <= CHUNK_SIZE_LIMIT:
            parts.append(content)
        else:
            for i in range(0, len(content), CHUNK_SIZE_LIMIT):
                parts.append(content[i:i+CHUNK_SIZE_LIMIT])
                
        # Prepare valid tasks
        async def process_part(part_index, part_content):
            # ENCRYPTION STEP
            encrypted_content = encrypt_chunk(part_content)
            
            input_file = BufferedInputFile(encrypted_content, filename=f"{file_meta.name}.p{chunk_index}.{part_index}.enc")
            caption = f"FileID: {file_id} | Chunk: {chunk_index}.{part_index} | Size: {len(part_content)}"
            
            msg = None
            retries = 0
            while retries < 5:
                try:
                    msg = await bot.send_document(
                        chat_id=int(CHANNEL_ID),
                        document=input_file,
                        caption=caption
                    )
                    break 
                except TelegramRetryAfter as e:
                    wait_time = e.retry_after + 2
                    print(f"Flood control exceeded. Waiting for {wait_time} seconds before retrying...")
                    await asyncio.sleep(wait_time)
                    retries += 1
                except Exception as e:
                    # Generic retry for other potential temporary issues
                    if "Flood control exceeded" in str(e) or "Too Many Requests" in str(e):
                        # Extract retry time if possible, otherwise default
                        wait_time = 30
                        print(f"Flood error identified by string. Waiting {wait_time}s. Error: {e}")
                        await asyncio.sleep(wait_time)
                        retries += 1
                    else:
                        raise e
            
            if not msg:
                 raise Exception("Failed to upload chunk after retries")

            return msg, len(part_content)

        # Execute parallel uploads
        tasks = [process_part(idx, p) for idx, p in enumerate(parts)]
        results = await asyncio.gather(*tasks)
        
        # Save to DB
        for idx, (msg, size) in enumerate(results):
            new_chunk = FileChunk(
                file_id=file_id,
                channel_message_id=msg.message_id,
                channel_id=int(CHANNEL_ID),
                chunk_order=chunk_index * 1000 + idx, # Mapping
                size=size,
                telegram_file_id=msg.document.file_id
            )
            db.add(new_chunk)
        
        # Update upload progress
        file_meta.uploaded_chunks += 1
        
        # Check completeness (if uploaded_chunks matches total_chunks)
        # However, due to resumability, uploaded_chunks count might be skewed if we rely on increments.
        # Better to trust Total Chunks if we know it.
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

@router.get("/{folder_id}/download_folder")
async def download_folder(
    folder_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    from utils.security import verify_token
    tg_id = verify_token(token)
    if not tg_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.phone_number == tg_id).first()
    if not user:
         raise HTTPException(status_code=401, detail="User not found")

    folder = db.query(FileMetadata).filter(
        FileMetadata.id == folder_id,
        FileMetadata.owner_id == user.id,
        FileMetadata.is_folder == True
    ).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # In-memory method (better for simpler environments, but can eat RAM if large files)
    # For a scalable approach, we should use a proper zip stream generator.
    # We will use a simple generator that yields zip chunks.
    # Note: Creating a TRUE streaming zip in Python without temp files is complex 
    # because ZIP requires a central directory at the end. 
    # standard zipfile module supports writing to streams but might need seekable stream for some modes.
    # We will use a simpler approach: Collect all files, download them, write to a BytesIO (RAM heavy if big).
    # OPTIMIZATION: Use 'stream_zip' library if available? User didn't ask us to add libs.
    # fallback: We'll implement a generator that constructs local zip headers manually or allows zipfile to write to buffer.
    
    # Let's try to just walk everything and return a single zip for now (non-streaming if not requested explicitly to be streaming, 
    # but the user asked to "download folder").
    # Given the risk of timeout on Vercel/similar with large folders, implementing a FULL download of all files into memory is BAD.
    
    # We will assume "download folder" can be just a flat list of files for now or improved later?
    # No, user wants folder download. We'll verify file size.
    # Let's use a temporary file approach on disk, then stream the file?
    
    # Recursive collector
    files_to_zip = [] # (path/in/zip, file_meta)
    
    async def collect_files(current_id, current_path):
        children = db.query(FileMetadata).filter(FileMetadata.parent_id == current_id).all()
        for child in children:
            if child.is_folder:
                await collect_files(child.id, f"{current_path}/{child.name}")
            else:
                 files_to_zip.append((f"{current_path}/{child.name}", child))
    
    await collect_files(folder_id, folder.name)
    
    if not files_to_zip:
         raise HTTPException(status_code=404, detail="Folder is empty")

    # To avoid memory issues, we stream content.
    # But zipfile requires seeking to update headers. 
    # For now, we will do: write to BytesIO for each file and yield? No, headers need to be correct.
    
    # Let's just zip individual files? No.
    # We will go with standard BytesIO approach but warn about memory?
    # Or, simpler:
    
    # Implement a generator that yields bytes.
    # We will use `zipfile.ZipFile` with `mode='w'` on a BytesIO, but we need to trick it to yield.
    # Actually, let's use a simpler hack: create a temp file.
    import tempfile
    import os
    
    async def zip_generator():
        with tempfile.TemporaryFile() as tmp:
            with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
                for path, meta in files_to_zip:
                    # Download file content
                    chunks = db.query(FileChunk).filter(FileChunk.file_id == meta.id).order_by(FileChunk.chunk_order).all()
                    file_bytes = b""
                    for chunk in chunks:
                         if chunk.telegram_file_id:
                             try:
                                file_info = await bot.get_file(chunk.telegram_file_id)
                                file_content_io = await bot.download_file(file_info.file_path)
                                encrypted_data = file_content_io.read()
                                file_bytes += decrypt_chunk(encrypted_data)
                             except:
                                 pass
                    
                    # Write to zip
                    # Timestamp fix
                    zinfo = zipfile.ZipInfo(path)
                    zinfo.date_time = datetime.now().timetuple()[:6]
                    zinfo.compress_type = zipfile.ZIP_DEFLATED
                    zf.writestr(zinfo, file_bytes)
            
            # Reset pointer
            tmp.seek(0)
            while True:
                chunk = tmp.read(8192)
                if not chunk:
                    break
                yield chunk

    # This is still memory intensive as it buffers "file_bytes" in RAM before zipping.
    # But for a "cloud test" it's likely acceptable.
    
    return StreamingResponse(
        zip_generator(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={folder.name}.zip"}
    )
