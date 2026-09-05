import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'rd-crm-super-secure-secret-key-2026')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'rd-crm-jwt-secret-key-secure-2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)

    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASS = os.getenv('DB_PASS', 'Admin@123')
    DB_NAME = os.getenv('DB_NAME', 'crm_db')

    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads', 'profile_pictures')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB max
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

config = Config()
