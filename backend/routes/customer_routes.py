from flask import Blueprint, request, jsonify, g
from services.customer_service import CustomerService
from middleware.auth_middleware import token_required
from middleware.role_middleware import write_permission_required
from utils.validators import validate_required_fields

customer_bp = Blueprint('customers', __name__, url_prefix='/api/customers')

@customer_bp.route('', methods=['GET'])
@token_required
def get_customers():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    search = request.args.get('search')
    status = request.args.get('status')
    industry = request.args.get('industry')
    customer_type = request.args.get('customer_type')
    owner_id = request.args.get('owner_id')
    sort_by = request.args.get('sort_by', 'id')
    sort_dir = request.args.get('sort_dir', 'DESC')

    result = CustomerService.get_customers(page, limit, search, status, industry, customer_type, owner_id, sort_by, sort_dir)
    return jsonify({'success': True, 'data': result}), 200

@customer_bp.route('/<int:customer_id>', methods=['GET'])
@token_required
def get_customer(customer_id):
    customer = CustomerService.get_customer_by_id(customer_id)
    if not customer:
        return jsonify({'success': False, 'message': 'Customer not found'}), 404
    return jsonify({'success': True, 'data': customer}), 200

@customer_bp.route('', methods=['POST'])
@token_required
@write_permission_required
def create_customer():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['customer_name', 'email'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    new_cust = CustomerService.create_customer(data, g.current_user['id'])
    return jsonify({'success': True, 'data': new_cust, 'message': 'Customer created successfully'}), 201

@customer_bp.route('/<int:customer_id>', methods=['PUT'])
@token_required
@write_permission_required
def update_customer(customer_id):
    data = request.get_json() or {}
    updated_cust, err = CustomerService.update_customer(customer_id, data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_cust, 'message': 'Customer updated successfully'}), 200

@customer_bp.route('/<int:customer_id>', methods=['DELETE'])
@token_required
@write_permission_required
def delete_customer(customer_id):
    success, err = CustomerService.delete_customer(customer_id, g.current_user['id'])
    if not success:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'message': 'Customer deleted successfully'}), 200
