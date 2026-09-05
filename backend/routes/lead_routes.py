from flask import Blueprint, request, jsonify, g
from services.lead_service import LeadService
from middleware.auth_middleware import token_required
from middleware.role_middleware import write_permission_required, manager_or_admin_required
from utils.validators import validate_required_fields

lead_bp = Blueprint('leads', __name__, url_prefix='/api/leads')

@lead_bp.route('', methods=['GET'])
@token_required
def get_leads():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    search = request.args.get('search')
    status = request.args.get('status')
    source = request.args.get('source')
    priority = request.args.get('priority')
    assigned_user_id = request.args.get('assigned_user_id')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    sort_by = request.args.get('sort_by', 'id')
    sort_dir = request.args.get('sort_dir', 'DESC')

    result = LeadService.get_leads(page, limit, search, status, source, priority, assigned_user_id, date_from, date_to, sort_by, sort_dir)
    return jsonify({'success': True, 'data': result}), 200

@lead_bp.route('/<int:lead_id>', methods=['GET'])
@token_required
def get_lead(lead_id):
    lead = LeadService.get_lead_by_id(lead_id)
    if not lead:
        return jsonify({'success': False, 'message': 'Lead not found'}), 404
    return jsonify({'success': True, 'data': lead}), 200

@lead_bp.route('', methods=['POST'])
@token_required
@write_permission_required
def create_lead():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['name'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    new_lead = LeadService.create_lead(data, g.current_user['id'])
    return jsonify({'success': True, 'data': new_lead, 'message': 'Lead created successfully'}), 201

@lead_bp.route('/<int:lead_id>', methods=['PUT'])
@token_required
@write_permission_required
def update_lead(lead_id):
    data = request.get_json() or {}
    updated_lead, err = LeadService.update_lead(lead_id, data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_lead, 'message': 'Lead updated successfully'}), 200

@lead_bp.route('/<int:lead_id>/assign', methods=['POST'])
@token_required
@write_permission_required
def assign_lead(lead_id):
    data = request.get_json() or {}
    assigned_user_id = data.get('assigned_user_id')
    
    updated_lead, err = LeadService.assign_lead(lead_id, assigned_user_id, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_lead, 'message': 'Lead assigned successfully'}), 200

@lead_bp.route('/<int:lead_id>/status', methods=['PATCH', 'PUT'])
@token_required
@write_permission_required
def change_status(lead_id):
    data = request.get_json() or {}
    status = data.get('status')
    if not status:
        return jsonify({'success': False, 'message': 'Status is required'}), 400

    updated_lead, err = LeadService.change_status(lead_id, status, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_lead, 'message': 'Lead status updated'}), 200

@lead_bp.route('/<int:lead_id>/timeline', methods=['GET'])
@token_required
def get_timeline(lead_id):
    lead = LeadService.get_lead_by_id(lead_id)
    if not lead:
        return jsonify({'success': False, 'message': 'Lead not found'}), 404

    timeline = LeadService.get_lead_timeline(lead_id)
    return jsonify({'success': True, 'data': timeline}), 200

@lead_bp.route('/<int:lead_id>', methods=['DELETE'])
@token_required
@write_permission_required
def delete_lead(lead_id):
    success, err = LeadService.delete_lead(lead_id, g.current_user['id'])
    if not success:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'message': 'Lead deleted successfully'}), 200
