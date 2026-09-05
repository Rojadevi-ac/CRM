import bcrypt
from config.database import query_all, query_one, execute_query
from utils.file_utils import save_avatar_file, remove_avatar_file
from utils.audit_utils import log_audit
from sockets.socket_events import emit_event

class UserService:
    @staticmethod
    def get_all_users(status=None, role=None):
        sql = """
            SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.department,
                   u.avatar_url, u.status, u.joined_date, u.created_at, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE 1=1
        """
        params = []
        if status:
            sql += " AND u.status = %s"
            params.append(status)
        if role:
            sql += " AND r.name = %s"
            params.append(role)
        sql += " ORDER BY u.id ASC"
        return query_all(sql, params)

    @staticmethod
    def get_user_by_id(user_id):
        return query_one("""
            SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.department,
                   u.avatar_url, u.status, u.joined_date, u.created_at, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = %s
        """, (user_id,))

    @staticmethod
    def get_roles():
        return query_all("SELECT id, name, description FROM roles ORDER BY id ASC")

    @staticmethod
    def create_user(data, current_user_id):
        existing = query_one("SELECT id FROM users WHERE email = %s", (data['email'].strip().lower(),))
        if existing:
            return None, "A user with this email address already exists"

        salt = bcrypt.gensalt(10)
        pw_hash = bcrypt.hashpw(data.get('password', 'Crm@123').encode('utf-8'), salt).decode('utf-8')

        sql = """
            INSERT INTO users (full_name, email, password_hash, role_id, phone, department, status, joined_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, COALESCE(%s, CURRENT_DATE))
        """
        user_id = execute_query(sql, (
            data['full_name'].strip(),
            data['email'].strip().lower(),
            pw_hash,
            data['role_id'],
            data.get('phone', ''),
            data.get('department', 'Sales'),
            data.get('status', 'active'),
            data.get('joined_date')
        ))

        log_audit(current_user_id, 'CREATE_USER', 'users', user_id, None, {
            'full_name': data['full_name'], 'email': data['email'], 'role_id': data['role_id']
        })

        new_user = UserService.get_user_by_id(user_id)
        emit_event('user_created', new_user)
        return new_user, None

    @staticmethod
    def update_user(user_id, data, current_user_id):
        user = UserService.get_user_by_id(user_id)
        if not user:
            return None, "User not found"

        if 'email' in data and data['email'].strip().lower() != user['email']:
            existing = query_one("SELECT id FROM users WHERE email = %s AND id != %s", (data['email'].strip().lower(), user_id))
            if existing:
                return None, "Email address is already in use by another user"

        sql = """
            UPDATE users SET
                full_name = COALESCE(%s, full_name),
                email = COALESCE(%s, email),
                role_id = COALESCE(%s, role_id),
                phone = COALESCE(%s, phone),
                department = COALESCE(%s, department),
                status = COALESCE(%s, status)
            WHERE id = %s
        """
        execute_query(sql, (
            data.get('full_name'),
            data.get('email', '').strip().lower() if 'email' in data else None,
            data.get('role_id'),
            data.get('phone'),
            data.get('department'),
            data.get('status'),
            user_id
        ))

        if 'password' in data and data['password']:
            salt = bcrypt.gensalt(10)
            pw_hash = bcrypt.hashpw(data['password'].encode('utf-8'), salt).decode('utf-8')
            execute_query("UPDATE users SET password_hash = %s WHERE id = %s", (pw_hash, user_id))

        updated = UserService.get_user_by_id(user_id)
        log_audit(current_user_id, 'UPDATE_USER', 'users', user_id, user, updated)
        emit_event('user_updated', updated)
        return updated, None

    @staticmethod
    def delete_user(user_id, current_user_id):
        if user_id == current_user_id:
            return False, "You cannot delete your own account"

        user = UserService.get_user_by_id(user_id)
        if not user:
            return False, "User not found"

        execute_query("DELETE FROM users WHERE id = %s", (user_id,))
        log_audit(current_user_id, 'DELETE_USER', 'users', user_id, user, None)
        emit_event('user_deleted', {'id': user_id})
        return True, None

    @staticmethod
    def update_profile(user_id, data):
        sql = """
            UPDATE users SET
                full_name = COALESCE(%s, full_name),
                phone = COALESCE(%s, phone),
                department = COALESCE(%s, department)
            WHERE id = %s
        """
        execute_query(sql, (data.get('full_name'), data.get('phone'), data.get('department'), user_id))
        updated = UserService.get_user_by_id(user_id)
        emit_event('user_updated', updated)
        return updated

    @staticmethod
    def upload_avatar(user_id, file):
        user = UserService.get_user_by_id(user_id)
        if not user:
            return None, "User not found"

        url_path, err = save_avatar_file(file)
        if err:
            return None, err

        if user['avatar_url']:
            remove_avatar_file(user['avatar_url'])

        execute_query("UPDATE users SET avatar_url = %s WHERE id = %s", (url_path, user_id))
        return url_path, None

    @staticmethod
    def remove_avatar(user_id):
        user = UserService.get_user_by_id(user_id)
        if not user:
            return False, "User not found"

        if user['avatar_url']:
            remove_avatar_file(user['avatar_url'])
            execute_query("UPDATE users SET avatar_url = NULL WHERE id = %s", (user_id,))
        return True, None
