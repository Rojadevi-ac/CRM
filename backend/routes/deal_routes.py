from flask import Blueprint, request, jsonify, g
from services.deal_service import DealService
from middleware.auth_middleware import token_required
from middleware.role_middleware import write_permission_required
from utils.validators import validate_required_fields

deal_bp = Blueprint('deals', __name__, url_prefix='/api/deals')

@deal_bp.route('', methods=['GET'])
@token_required
def get_deals():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    search = request.args.get('search')
    stage = request.args.get('stage')
    owner_id = request.args.get('owner_id')
    customer_id = request.args.get('customer_id')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    sort_by = request.args.get('sort_by', 'id')
    sort_dir = request.args.get('sort_dir', 'DESC')

    result = DealService.get_deals(page, limit, search, stage, owner_id, customer_id, date_from, date_to, sort_by, sort_dir)
    return jsonify({'success': True, 'data': result}), 200

@deal_bp.route('/<int:deal_id>', methods=['GET'])
@token_required
def get_deal(deal_id):
    deal = DealService.get_deal_by_id(deal_id)
    if not deal:
        return jsonify({'success': False, 'message': 'Deal not found'}), 404
    return jsonify({'success': True, 'data': deal}), 200

@deal_bp.route('', methods=['POST'])
@token_required
@write_permission_required
def create_deal():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['deal_name', 'amount'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    new_deal = DealService.create_deal(data, g.current_user['id'])
    return jsonify({'success': True, 'data': new_deal, 'message': 'Deal created successfully'}), 201

@deal_bp.route('/<int:deal_id>', methods=['PUT'])
@token_required
@write_permission_required
def update_deal(deal_id):
    data = request.get_json() or {}
    updated_deal, err = DealService.update_deal(deal_id, data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_deal, 'message': 'Deal updated successfully'}), 200

@deal_bp.route('/<int:deal_id>/stage', methods=['PATCH', 'PUT'])
@token_required
@write_permission_required
def update_stage(deal_id):
    data = request.get_json() or {}
    stage = data.get('stage')
    if not stage:
        return jsonify({'success': False, 'message': 'Stage is required'}), 400

    updated_deal, err = DealService.update_stage(deal_id, stage, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_deal, 'message': 'Deal stage updated'}), 200

@deal_bp.route('/<int:deal_id>', methods=['DELETE'])
@token_required
@write_permission_required
def delete_deal(deal_id):
    success, err = DealService.delete_deal(deal_id, g.current_user['id'])
    if not success:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'message': 'Deal deleted successfully'}), 200
