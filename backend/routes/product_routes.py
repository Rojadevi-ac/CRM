from flask import Blueprint, request, jsonify, g
from services.product_service import ProductService
from middleware.auth_middleware import token_required
from middleware.role_middleware import write_permission_required, admin_required
from utils.validators import validate_required_fields

product_bp = Blueprint('products', __name__, url_prefix='/api/products')

@product_bp.route('', methods=['GET'])
@token_required
def get_products():
    status = request.args.get('status')
    category = request.args.get('category')
    search = request.args.get('search')
    products = ProductService.get_products(status, category, search)
    return jsonify({'success': True, 'data': products}), 200

@product_bp.route('/<int:product_id>', methods=['GET'])
@token_required
def get_product(product_id):
    product = ProductService.get_product_by_id(product_id)
    if not product:
        return jsonify({'success': False, 'message': 'Product not found'}), 404
    return jsonify({'success': True, 'data': product}), 200

@product_bp.route('', methods=['POST'])
@token_required
@admin_required
@write_permission_required
def create_product():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['name', 'price'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    new_prod = ProductService.create_product(data, g.current_user['id'])
    return jsonify({'success': True, 'data': new_prod, 'message': 'Product created successfully'}), 201

@product_bp.route('/<int:product_id>', methods=['PUT'])
@token_required
@admin_required
@write_permission_required
def update_product(product_id):
    data = request.get_json() or {}
    updated_prod, err = ProductService.update_product(product_id, data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_prod, 'message': 'Product updated successfully'}), 200

@product_bp.route('/<int:product_id>', methods=['DELETE'])
@token_required
@admin_required
@write_permission_required
def delete_product(product_id):
    success, err = ProductService.delete_product(product_id, g.current_user['id'])
    if not success:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'message': 'Product deleted successfully'}), 200
