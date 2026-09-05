from flask import Blueprint, request, jsonify, g
from services.auth_service import AuthService
from services.user_service import UserService
from middleware.auth_middleware import token_required
from utils.validators import validate_required_fields, is_valid_email

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['email', 'password'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    result, err = AuthService.login(data['email'], data['password'])
    if err:
        return jsonify({'success': False, 'message': err}), 401

    return jsonify({'success': True, 'data': result, 'message': 'Logged in successfully'}), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me():
    user = UserService.get_user_by_id(g.current_user['id'])
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    return jsonify({'success': True, 'data': user}), 200

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['current_password', 'new_password'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    success, msg = AuthService.change_password(g.current_user['id'], data['current_password'], data['new_password'])
    if not success:
        return jsonify({'success': False, 'message': msg}), 400

    return jsonify({'success': True, 'message': msg}), 200

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
