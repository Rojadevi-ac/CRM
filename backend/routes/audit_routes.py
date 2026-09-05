from flask import Blueprint, request, jsonify, g
from services.audit_service import AuditService
from middleware.auth_middleware import token_required
from middleware.role_middleware import admin_required, write_permission_required
from utils.validators import validate_required_fields

audit_bp = Blueprint('audit', __name__, url_prefix='/api')

@audit_bp.route('/audit-logs', methods=['GET'])
@token_required
@admin_required
def get_audit_logs():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 30))
    module = request.args.get('module')
    user_id = request.args.get('user_id')
    action = request.args.get('action')

    result = AuditService.get_audit_logs(page, limit, module, user_id, action)
    return jsonify({'success': True, 'data': result}), 200

@audit_bp.route('/notes', methods=['GET'])
@token_required
def get_notes():
    entity_type = request.args.get('entity_type')
    entity_id = request.args.get('entity_id')
    if not entity_type or not entity_id:
        return jsonify({'success': False, 'message': 'entity_type and entity_id are required'}), 400

    notes = AuditService.get_notes(entity_type, entity_id)
    return jsonify({'success': True, 'data': notes}), 200

@audit_bp.route('/notes', methods=['POST'])
@token_required
@write_permission_required
def add_note():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['entity_type', 'entity_id', 'content'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    new_note = AuditService.add_note(data['entity_type'], data['entity_id'], data['content'], g.current_user['id'])
    return jsonify({'success': True, 'data': new_note, 'message': 'Note added'}), 201

@audit_bp.route('/notes/<int:note_id>', methods=['DELETE'])
@token_required
@write_permission_required
def delete_note(note_id):
    AuditService.delete_note(note_id, g.current_user['id'])
    return jsonify({'success': True, 'message': 'Note deleted'}), 200
