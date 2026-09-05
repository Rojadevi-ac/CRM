from flask import Blueprint, request, jsonify, g
from services.task_service import TaskService
from middleware.auth_middleware import token_required
from middleware.role_middleware import write_permission_required
from utils.validators import validate_required_fields

task_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')

@task_bp.route('', methods=['GET'])
@token_required
def get_tasks():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    status = request.args.get('status')
    priority = request.args.get('priority')
    user_id = request.args.get('user_id')
    lead_id = request.args.get('lead_id')
    customer_id = request.args.get('customer_id')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    result = TaskService.get_tasks(page, limit, status, priority, user_id, lead_id, customer_id, date_from, date_to)
    return jsonify({'success': True, 'data': result}), 200

@task_bp.route('/<int:task_id>', methods=['GET'])
@token_required
def get_task(task_id):
    task = TaskService.get_task_by_id(task_id)
    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404
    return jsonify({'success': True, 'data': task}), 200

@task_bp.route('', methods=['POST'])
@token_required
@write_permission_required
def create_task():
    data = request.get_json() or {}
    missing = validate_required_fields(data, ['task_name', 'due_date'])
    if missing:
        return jsonify({'success': False, 'message': f"Missing fields: {', '.join(missing)}"}), 400

    new_task = TaskService.create_task(data, g.current_user['id'])
    return jsonify({'success': True, 'data': new_task, 'message': 'Task created successfully'}), 201

@task_bp.route('/<int:task_id>', methods=['PUT'])
@token_required
@write_permission_required
def update_task(task_id):
    data = request.get_json() or {}
    updated_task, err = TaskService.update_task(task_id, data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'data': updated_task, 'message': 'Task updated successfully'}), 200

@task_bp.route('/<int:task_id>', methods=['DELETE'])
@token_required
@write_permission_required
def delete_task(task_id):
    success, err = TaskService.delete_task(task_id, g.current_user['id'])
    if not success:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({'success': True, 'message': 'Task deleted successfully'}), 200
