
from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from settings import ENCRYPTION_KEY # Use this as secret key for JWT too

# Configuration
SECRET_KEY = ENCRYPTION_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        tg_id: str = payload.get("sub")
        if tg_id is None:
            return None
        return tg_id
    except JWTError:
        return None

import hmac
import hashlib
import json
from urllib.parse import unquote
from settings import BOT_TOKEN

def validate_webapp_data(init_data: str) -> Optional[dict]:
    """
    Validates the initData string from Telegram Web App.
    Returns the user dict if valid, None otherwise.
    """
    try:
        parsed_data = {}
        for chunk in unquote(init_data).split('&'):
            if '=' in chunk:
                key, value = chunk.split('=', 1)
                parsed_data[key] = value
        
        hash_check = parsed_data.get('hash')
        if not hash_check:
            return None
            
        # Remove hash from data to verify
        data_check_arr = []
        for k, v in parsed_data.items():
            if k != 'hash':
                data_check_arr.append(f'{k}={v}')
        
        data_check_string = '\n'.join(sorted(data_check_arr))
        
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        if calculated_hash == hash_check:
            if 'user' in parsed_data:
                return json.loads(parsed_data['user'])
        return None
    except Exception as e:
        print(f"WebApp auth error: {e}")
        return None
