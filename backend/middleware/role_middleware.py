from functools import wraps
from flask import jsonify, g

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                return jsonify({'success': False, 'message': 'Authentication required'}), 401
            
            user_role = g.current_user.get('role_name')
            if user_role not in allowed_roles:
                return jsonify({
                    'success': False, 
                    'message': f"Access denied. Required role: {', '.join(allowed_roles)}. Your role: {user_role}"
                }), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator

def write_permission_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(g, 'current_user') or not g.current_user:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
        user_role = g.current_user.get('role_name')
        if user_role == 'Read Only':
            return jsonify({
                'success': False, 
                'message': 'Action forbidden: Read Only accounts cannot modify, create, or delete CRM records.'
            }), 403
        
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    return role_required('Admin')(f)

def manager_or_admin_required(f):
    return role_required('Admin', 'Sales Manager')(f)
