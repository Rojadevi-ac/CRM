import bcrypt
from config.database import query_one, execute_query
from utils.jwt_utils import generate_token

class AuthService:
    @staticmethod
    def login(email, password):
        user = query_one("""
            SELECT u.id, u.role_id, u.full_name, u.email, u.password_hash, 
                   u.phone, u.department, u.avatar_url, u.status, u.joined_date,
                   r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.email = %s
        """, (email.strip().lower(),))

        if not user:
            return None, "Invalid email or password"

        if user['status'] != 'active':
            return None, f"Account is currently {user['status']}. Please contact administrator."

        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return None, "Invalid email or password"

        token = generate_token(user['id'], user['email'], user['role_name'], user['full_name'])
        
        user_data = {
            'id': user['id'],
            'full_name': user['full_name'],
            'email': user['email'],
            'role': user['role_name'],
            'role_name': user['role_name'],
            'role_id': user['role_id'],
            'phone': user['phone'],
            'department': user['department'],
            'avatar_url': user['avatar_url'],
            'joined_date': str(user['joined_date']) if user['joined_date'] else None
        }

        return {'token': token, 'user': user_data}, None

    @staticmethod
    def change_password(user_id, current_password, new_password):
        user = query_one("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        if not user:
            return False, "User not found"

        if not bcrypt.checkpw(current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return False, "Current password does not match"

        if len(new_password) < 6:
            return False, "New password must be at least 6 characters"

        salt = bcrypt.gensalt(10)
        new_hash = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')

        execute_query("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
        return True, "Password updated successfully"
