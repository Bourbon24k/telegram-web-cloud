
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, BigInteger, create_engine
from sqlalchemy.orm import relationship, declarative_base, backref, sessionmaker
from datetime import datetime
from settings import DATABASE_URL

Base = declarative_base()

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True)
    is_authenticated = Column(Boolean, default=False)
    session_string = Column(String, nullable=True)
    login_code = Column(String, nullable=True)

class FileMetadata(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True, index=True)
    access_token = Column(String, index=True, nullable=True) # Optional: for sharing links later
    owner_id = Column(Integer, ForeignKey("users.id")) # Link to User
    parent_id = Column(Integer, ForeignKey("files.id"), nullable=True)
    name = Column(String, index=True)
    is_folder = Column(Boolean, default=False)
    size = Column(BigInteger, default=0)
    mime_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    accessed_at = Column(DateTime, default=datetime.utcnow)  # For recent files
    share_token = Column(String, nullable=True, index=True)  # For sharing
    
    owner = relationship("User", backref="files")
    children = relationship("FileMetadata", backref=backref('parent', remote_side=[id]))
    chunks = relationship("FileChunk", back_populates="file")

class FileHistory(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    file_id = Column(Integer, ForeignKey("files.id"), nullable=True)
    action = Column(String)  # upload, download, delete, rename, move, share
    file_name = Column(String)  # Store name in case file is deleted
    details = Column(String, nullable=True)  # Additional info
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", backref="history")
    file = relationship("FileMetadata", backref="history")

class FileChunk(Base):
    __tablename__ = "chunks"
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id"))
    channel_message_id = Column(Integer)
    channel_id = Column(BigInteger) # In case we support multiple channels
    chunk_order = Column(Integer)
    size = Column(BigInteger)
    telegram_file_id = Column(String, nullable=True)
    
    file = relationship("FileMetadata", back_populates="chunks")

def init_db():
    Base.metadata.create_all(bind=engine)
