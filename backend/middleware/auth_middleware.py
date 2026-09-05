from functools import wraps
from flask import request, jsonify, g
from utils.jwt_utils import decode_token
from config.database import query_one

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'success': False, 'message': 'Authorization header missing'}), 401
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'success': False, 'message': 'Invalid token format. Expected Bearer <token>'}), 401
        
        token = parts[1]
        decoded = decode_token(token)
        if not decoded:
            return jsonify({'success': False, 'message': 'Token is invalid or expired'}), 401
        
        user = query_one("""
            SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.department, 
                   u.avatar_url, u.status, u.joined_date, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = %s
        """, (decoded.get('user_id'),))
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 401
            
        if user['status'] != 'active':
            return jsonify({'success': False, 'message': f"Account is {user['status']}"}), 403
            
        g.current_user = user
        return f(*args, **kwargs)
    return decorated

def roles_required(*allowed_roles):
    """Decorator requiring one of the specified roles."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                return jsonify({'success': False, 'message': 'Authentication required'}), 401
            user_role = g.current_user.get('role_name', '')
            if user_role not in allowed_roles:
                return jsonify({
                    'success': False, 
                    'message': f'Access forbidden: {user_role} role is not authorized for this operation'
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

def write_required(f):
    """Ensures caller is not in Read Only role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(g, 'current_user') or not g.current_user:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        user_role = g.current_user.get('role_name', '')
        if user_role.lower() in ['read only', 'readonly', 'viewer']:
            return jsonify({
                'success': False, 
                'message': 'Operation forbidden: Read Only account cannot perform create/update/delete actions'
            }), 403
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    """Ensures caller is an Admin."""
    return roles_required('Admin')(f)

def manager_or_admin_required(f):
    """Ensures caller is Admin or Sales Manager."""
    return roles_required('Admin', 'Sales Manager')(f)

