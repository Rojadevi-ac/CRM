from flask import Blueprint, request, jsonify, g
from services.company_service import CompanyService
from middleware.auth_middleware import token_required
from middleware.role_middleware import write_permission_required
from utils.validators import validate_required_fields

company_bp = Blueprint('companies', __name__, url_prefix='/api/companies')

@company_bp.route('', methods=['GET'])
@token_required
def get_companies():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    search = request.args.get('search')
    industry = request.args.get('industry')
    owner_id = request.args.get('owner_id')
    sort_by = request.args.get('sort_by', 'id')
    sort_dir = request.args.get('sort_dir', 'DESC')

    result = CompanyService.get_companies(page, limit, search, industry, owner_id, sort_by, sort_dir)
    return jsonify({'success': True, 'data': result}), 200

@company_bp.route('/<int:company_id>', methods=['GET'])
@token_required
def get_company(company_id):
    comp = CompanyService.get_company_by_id(company_id)
    if not comp:
        return jsonify({'success': False, 'message': 'Company not found'}), 404
    return jsonify({'success': True, 'data': comp}), 200

@company_bp.route('', methods=['POST'])
@token_required
@write_permission_required
def create_company():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['name'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    new_comp = CompanyService.create_company(data, g.current_user['id'])
    return jsonify({'success': True, 'data': new_comp, 'message': 'Company created successfully'}), 201

@company_bp.route('/<int:company_id>', methods=['PUT'])
@token_required
@write_permission_required
def update_company(company_id):
    data = request.get_json() or {}
    updated_comp, err = CompanyService.update_company(company_id, data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_comp, 'message': 'Company updated successfully'}), 200

@company_bp.route('/<int:company_id>', methods=['DELETE'])
@token_required
@write_permission_required
def delete_company(company_id):
    success, err = CompanyService.delete_company(company_id, g.current_user['id'])
    if not success:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'message': 'Company deleted successfully'}), 200
