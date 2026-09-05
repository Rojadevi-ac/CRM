from flask import Blueprint, request, jsonify, g
from services.activity_service import ActivityService
from middleware.auth_middleware import token_required
from middleware.role_middleware import write_permission_required
from utils.validators import validate_required_fields

activity_bp = Blueprint('activities', __name__, url_prefix='/api/activities')

@activity_bp.route('', methods=['GET'])
@token_required
def get_activities():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    activity_type = request.args.get('activity_type')
    status = request.args.get('status')
    user_id = request.args.get('user_id')
    lead_id = request.args.get('lead_id')
    customer_id = request.args.get('customer_id')
    deal_id = request.args.get('deal_id')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    result = ActivityService.get_activities(page, limit, activity_type, status, user_id, lead_id, customer_id, deal_id, date_from, date_to)
    return jsonify({'success': True, 'data': result}), 200

@activity_bp.route('/<int:activity_id>', methods=['GET'])
@token_required
def get_activity(activity_id):
    act = ActivityService.get_activity_by_id(activity_id)
    if not act:
        return jsonify({'success': False, 'message': 'Activity not found'}), 404
    return jsonify({'success': True, 'data': act}), 200

@activity_bp.route('', methods=['POST'])
@token_required
@write_permission_required
def create_activity():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['activity_type', 'subject', 'activity_date'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    new_act = ActivityService.create_activity(data, g.current_user['id'])
    return jsonify({'success': True, 'data': new_act, 'message': 'Activity logged successfully'}), 201

@activity_bp.route('/<int:activity_id>', methods=['PUT'])
@token_required
@write_permission_required
def update_activity(activity_id):
    data = request.get_json() or {}
    updated_act, err = ActivityService.update_activity(activity_id, data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_act, 'message': 'Activity updated successfully'}), 200

@activity_bp.route('/<int:activity_id>', methods=['DELETE'])
@token_required
@write_permission_required
def delete_activity(activity_id):
    success, err = ActivityService.delete_activity(activity_id, g.current_user['id'])
    if not success:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'message': 'Activity deleted successfully'}), 200
