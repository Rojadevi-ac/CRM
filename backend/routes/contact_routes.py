from flask import Blueprint, request, jsonify, g
from services.contact_service import ContactService
from middleware.auth_middleware import token_required
from middleware.role_middleware import write_permission_required
from utils.validators import validate_required_fields, is_valid_email

contact_bp = Blueprint('contacts', __name__, url_prefix='/api/contacts')

@contact_bp.route('', methods=['GET'])
@token_required
def get_contacts():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    search = request.args.get('search')
    company_id = request.args.get('company_id')
    contact_type = request.args.get('contact_type')
    owner_id = request.args.get('owner_id')
    sort_by = request.args.get('sort_by', 'id')
    sort_dir = request.args.get('sort_dir', 'DESC')

    result = ContactService.get_contacts(page, limit, search, company_id, contact_type, owner_id, sort_by, sort_dir)
    return jsonify({'success': True, 'data': result}), 200

@contact_bp.route('/<int:contact_id>', methods=['GET'])
@token_required
def get_contact(contact_id):
    contact = ContactService.get_contact_by_id(contact_id)
    if not contact:
        return jsonify({'success': False, 'message': 'Contact not found'}), 404
    return jsonify({'success': True, 'data': contact}), 200

@contact_bp.route('', methods=['POST'])
@token_required
@write_permission_required
def create_contact():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['first_name', 'email'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    if not is_valid_email(data['email']):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400

    new_contact = ContactService.create_contact(data, g.current_user['id'])
    return jsonify({'success': True, 'data': new_contact, 'message': 'Contact created successfully'}), 201

@contact_bp.route('/<int:contact_id>', methods=['PUT'])
@token_required
@write_permission_required
def update_contact(contact_id):
    data = request.get_json() or {}
    if 'email' in data and not is_valid_email(data['email']):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400

    updated_contact, err = ContactService.update_contact(contact_id, data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_contact, 'message': 'Contact updated successfully'}), 200

@contact_bp.route('/<int:contact_id>', methods=['DELETE'])
@token_required
@write_permission_required
def delete_contact(contact_id):
    success, err = ContactService.delete_contact(contact_id, g.current_user['id'])
    if not success:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'message': 'Contact deleted successfully'}), 200
