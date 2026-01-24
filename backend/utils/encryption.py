
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from settings import ENCRYPTION_KEY

# Ensure key is 32 bytes (256 bits)
# In production, this should be properly managed (KMS, etc.)
# For now we take from env and pad or slice
def get_key() -> bytes:
    if not ENCRYPTION_KEY:
        raise ValueError("ENCRYPTION_KEY must be set in .env")
    
    # Simple derivation for MVP safety (not robust KDF)
    # Just ensuring it's 32 bytes
    key = ENCRYPTION_KEY.encode()[:32]
    if len(key) < 32:
        key = key.ljust(32, b'0')
    return key

def encrypt_chunk(data: bytes) -> bytes:
    aesgcm = AESGCM(get_key())
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return nonce + ciphertext

def decrypt_chunk(data: bytes) -> bytes:
    aesgcm = AESGCM(get_key())
    nonce = data[:12]
    ciphertext = data[12:]
    return aesgcm.decrypt(nonce, ciphertext, None)
