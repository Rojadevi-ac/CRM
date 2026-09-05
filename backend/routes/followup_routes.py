from flask import Blueprint, request, jsonify, g
from services.followup_service import FollowupService
from middleware.auth_middleware import token_required
from middleware.role_middleware import write_permission_required
from utils.validators import validate_required_fields

followup_bp = Blueprint('followups', __name__, url_prefix='/api/followups')

@followup_bp.route('', methods=['GET'])
@token_required
def get_followups():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    status = request.args.get('status')
    priority = request.args.get('priority')
    user_id = request.args.get('user_id')
    lead_id = request.args.get('lead_id')
    customer_id = request.args.get('customer_id')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    today_only = request.args.get('today_only', 'false').lower() == 'true'

    result = FollowupService.get_followups(page, limit, status, priority, user_id, lead_id, customer_id, date_from, date_to, today_only)
    return jsonify({'success': True, 'data': result}), 200

@followup_bp.route('/<int:followup_id>', methods=['GET'])
@token_required
def get_followup(followup_id):
    fol = FollowupService.get_followup_by_id(followup_id)
    if not fol:
        return jsonify({'success': False, 'message': 'Followup not found'}), 404
    return jsonify({'success': True, 'data': fol}), 200

@followup_bp.route('', methods=['POST'])
@token_required
@write_permission_required
def create_followup():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['purpose', 'followup_date'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    new_fol = FollowupService.create_followup(data, g.current_user['id'])
    return jsonify({'success': True, 'data': new_fol, 'message': 'Follow-up scheduled successfully'}), 201

@followup_bp.route('/<int:followup_id>', methods=['PUT'])
@token_required
@write_permission_required
def update_followup(followup_id):
    data = request.get_json() or {}
    updated_fol, err = FollowupService.update_followup(followup_id, data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_fol, 'message': 'Follow-up updated successfully'}), 200

@followup_bp.route('/<int:followup_id>', methods=['DELETE'])
@token_required
@write_permission_required
def delete_followup(followup_id):
    success, err = FollowupService.delete_followup(followup_id, g.current_user['id'])
    if not success:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'message': 'Follow-up deleted successfully'}), 200
