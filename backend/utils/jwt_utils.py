import jwt
import datetime
from config.config import config

def generate_token(user_id, email, role_name, full_name):
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role_name,
        'full_name': full_name,
        'iat': datetime.datetime.utcnow(),
        'exp': datetime.datetime.utcnow() + config.JWT_ACCESS_TOKEN_EXPIRES
    }
    return jwt.encode(payload, config.JWT_SECRET_KEY, algorithm='HS256')

def decode_token(token):
    try:
        return jwt.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
