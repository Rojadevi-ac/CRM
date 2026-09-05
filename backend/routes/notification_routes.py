from flask import Blueprint, request, jsonify, g
from services.notification_service import NotificationService
from middleware.auth_middleware import token_required

notification_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@notification_bp.route('', methods=['GET'])
@token_required
def get_notifications():
    limit = int(request.args.get('limit', 30))
    result = NotificationService.get_user_notifications(g.current_user['id'], limit)
    return jsonify({'success': True, 'data': result}), 200

@notification_bp.route('/<int:notification_id>/read', methods=['PUT', 'PATCH'])
@token_required
def mark_read(notification_id):
    NotificationService.mark_as_read(notification_id, g.current_user['id'])
    return jsonify({'success': True, 'message': 'Notification marked as read'}), 200

@notification_bp.route('/mark-all-read', methods=['PUT', 'POST'])
@token_required
def mark_all_read():
    NotificationService.mark_all_as_read(g.current_user['id'])
    return jsonify({'success': True, 'message': 'All notifications marked as read'}), 200

@notification_bp.route('/<int:notification_id>', methods=['DELETE'])
@token_required
def delete_notification(notification_id):
    NotificationService.delete_notification(notification_id, g.current_user['id'])
    return jsonify({'success': True, 'message': 'Notification deleted'}), 200
