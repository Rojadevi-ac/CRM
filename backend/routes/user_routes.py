from flask import Blueprint, request, jsonify, g
from services.user_service import UserService
from middleware.auth_middleware import token_required
from middleware.role_middleware import admin_required, write_permission_required
from utils.validators import validate_required_fields, is_valid_email

user_bp = Blueprint('users', __name__, url_prefix='/api/users')

@user_bp.route('', methods=['GET'])
@token_required
def get_users():
    status = request.args.get('status')
    role = request.args.get('role')
    users = UserService.get_all_users(status, role)
    return jsonify({'success': True, 'data': users}), 200

@user_bp.route('/roles', methods=['GET'])
@token_required
def get_roles():
    roles = UserService.get_roles()
    return jsonify({'success': True, 'data': roles}), 200

@user_bp.route('/<int:user_id>', methods=['GET'])
@token_required
def get_user(user_id):
    user = UserService.get_user_by_id(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    return jsonify({'success': True, 'data': user}), 200

@user_bp.route('', methods=['POST'])
@token_required
@admin_required
@write_permission_required
def create_user():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['full_name', 'email', 'role_id'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    if not is_valid_email(data['email']):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400

    user, err = UserService.create_user(data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': user, 'message': 'User created successfully'}), 201

@user_bp.route('/<int:user_id>', methods=['PUT'])
@token_required
@admin_required
@write_permission_required
def update_user(user_id):
    data = request.get_json() or {}
    if 'email' in data and not is_valid_email(data['email']):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400

    user, err = UserService.update_user(user_id, data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': user, 'message': 'User updated successfully'}), 200

@user_bp.route('/<int:user_id>', methods=['DELETE'])
@token_required
@admin_required
@write_permission_required
def delete_user(user_id):
    success, err = UserService.delete_user(user_id, g.current_user['id'])
    if not success:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'message': 'User deleted successfully'}), 200

@user_bp.route('/profile', methods=['PUT'])
@token_required
@write_permission_required
def update_profile():
    data = request.get_json() or {}
    user = UserService.update_profile(g.current_user['id'], data)
    return jsonify({'success': True, 'data': user, 'message': 'Profile updated successfully'}), 200

@user_bp.route('/avatar', methods=['POST'])
@token_required
@write_permission_required
def upload_avatar():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part in request'}), 400

    file = request.files['file']
    url_path, err = UserService.upload_avatar(g.current_user['id'], file)
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': {'avatar_url': url_path}, 'message': 'Profile picture updated'}), 200

@user_bp.route('/avatar', methods=['DELETE'])
@token_required
@write_permission_required
def delete_avatar():
    success, err = UserService.remove_avatar(g.current_user['id'])
    if not success:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'message': 'Profile picture removed'}), 200
