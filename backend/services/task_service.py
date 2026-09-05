from config.database import query_all, query_one, execute_query
from utils.audit_utils import log_audit
from sockets.socket_events import emit_event

class TaskService:
    @staticmethod
    def get_tasks(page=1, limit=20, status=None, priority=None, user_id=None, lead_id=None, customer_id=None, date_from=None, date_to=None):
        offset = (page - 1) * limit
        where_clauses = ["1=1"]
        params = []

        if status:
            where_clauses.append("t.status = %s")
            params.append(status)

        if priority:
            where_clauses.append("t.priority = %s")
            params.append(priority)

        if user_id:
            where_clauses.append("t.assigned_user_id = %s")
            params.append(user_id)

        if lead_id:
            where_clauses.append("t.lead_id = %s")
            params.append(lead_id)

        if customer_id:
            where_clauses.append("t.customer_id = %s")
            params.append(customer_id)

        if date_from:
            where_clauses.append("t.due_date >= %s")
            params.append(date_from)

        if date_to:
            where_clauses.append("t.due_date <= %s")
            params.append(date_to)

        where_sql = " AND ".join(where_clauses)

        count_sql = f"SELECT COUNT(*) as total FROM tasks t WHERE {where_sql}"
        count_res = query_one(count_sql, params)
        total = count_res['total'] if count_res else 0

        data_sql = f"""
            SELECT t.id, t.task_name, t.description, t.lead_id, t.customer_id, t.deal_id,
                   t.assigned_user_id, t.created_by_id, t.due_date, t.priority, t.status,
                   t.created_at, t.updated_at,
                   u.full_name as assigned_user_name, u.avatar_url as assigned_user_avatar,
                   l.name as lead_name,
                   c.customer_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_user_id = u.id
            LEFT JOIN leads l ON t.lead_id = l.id
            LEFT JOIN customers c ON t.customer_id = c.id
            WHERE {where_sql}
            ORDER BY t.due_date ASC, FIELD(t.priority, 'Urgent', 'High', 'Medium', 'Low')
            LIMIT %s OFFSET %s
        """
        data_params = list(params) + [limit, offset]
        tasks = query_all(data_sql, data_params)

        return {
            'tasks': tasks,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit if limit > 0 else 1
            }
        }

    @staticmethod
    def get_task_by_id(task_id):
        return query_one("""
            SELECT t.id, t.task_name, t.description, t.lead_id, t.customer_id, t.deal_id,
                   t.assigned_user_id, t.created_by_id, t.due_date, t.priority, t.status,
                   t.created_at, t.updated_at,
                   u.full_name as assigned_user_name,
                   l.name as lead_name,
                   c.customer_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_user_id = u.id
            LEFT JOIN leads l ON t.lead_id = l.id
            LEFT JOIN customers c ON t.customer_id = c.id
            WHERE t.id = %s
        """, (task_id,))

    @staticmethod
    def _parse_id(val):
        if val is None or str(val).strip() in ('', 'null', 'undefined', 'None'):
            return None
        try:
            return int(val)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def create_task(data, current_user_id):
        sql = """
            INSERT INTO tasks (task_name, description, lead_id, customer_id, deal_id, assigned_user_id, created_by_id, due_date, priority, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        lead_id = TaskService._parse_id(data.get('lead_id'))
        customer_id = TaskService._parse_id(data.get('customer_id'))
        deal_id = TaskService._parse_id(data.get('deal_id'))
        assigned_user_id = TaskService._parse_id(data.get('assigned_user_id')) or current_user_id
        due_date = data.get('due_date') if data.get('due_date') != '' else None

        task_id = execute_query(sql, (
            data['task_name'].strip(),
            data.get('description', ''),
            lead_id,
            customer_id,
            deal_id,
            assigned_user_id,
            current_user_id,
            due_date,
            data.get('priority', 'Medium'),
            data.get('status', 'Pending')
        ))

        new_task = TaskService.get_task_by_id(task_id)
        log_audit(current_user_id, 'CREATE_TASK', 'tasks', task_id, None, new_task)

        # Notify assigned user
        if new_task.get('assigned_user_id') and new_task['assigned_user_id'] != current_user_id:
            notif_sql = "INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id) VALUES (%s, %s, %s, 'task', 'task', %s)"
            execute_query(notif_sql, (new_task['assigned_user_id'], 'New Task Assigned', f"Task assigned: {new_task['task_name']}", task_id))
            emit_event('notification_created', {'title': 'New Task Assigned', 'task_id': task_id}, room=f"user_{new_task['assigned_user_id']}")

        emit_event('task_created', new_task)
        return new_task

    @staticmethod
    def update_task(task_id, data, current_user_id):
        old_task = TaskService.get_task_by_id(task_id)
        if not old_task:
            return None, "Task not found"

        task_name = (data.get('task_name') if data.get('task_name') is not None else old_task['task_name']).strip()
        description = data.get('description') if 'description' in data else old_task.get('description')
        lead_id = TaskService._parse_id(data.get('lead_id')) if 'lead_id' in data else old_task.get('lead_id')
        customer_id = TaskService._parse_id(data.get('customer_id')) if 'customer_id' in data else old_task.get('customer_id')
        deal_id = TaskService._parse_id(data.get('deal_id')) if 'deal_id' in data else old_task.get('deal_id')
        assigned_user_id = TaskService._parse_id(data.get('assigned_user_id')) if 'assigned_user_id' in data else old_task.get('assigned_user_id')
        due_date = data.get('due_date') or old_task.get('due_date')
        if due_date == '':
            due_date = None
        priority = data.get('priority') or old_task.get('priority') or 'Medium'
        status = data.get('status') or old_task.get('status') or 'Pending'

        sql = """
            UPDATE tasks SET
                task_name = %s,
                description = %s,
                lead_id = %s,
                customer_id = %s,
                deal_id = %s,
                assigned_user_id = %s,
                due_date = %s,
                priority = %s,
                status = %s
            WHERE id = %s
        """
        execute_query(sql, (
            task_name,
            description,
            lead_id,
            customer_id,
            deal_id,
            assigned_user_id,
            due_date,
            priority,
            status,
            task_id
        ))

        updated_task = TaskService.get_task_by_id(task_id)
        log_audit(current_user_id, 'UPDATE_TASK', 'tasks', task_id, old_task, updated_task)
        emit_event('task_updated', updated_task)
        return updated_task, None

    @staticmethod
    def delete_task(task_id, current_user_id):
        task = TaskService.get_task_by_id(task_id)
        if not task:
            return False, "Task not found"

        execute_query("DELETE FROM tasks WHERE id = %s", (task_id,))
        log_audit(current_user_id, 'DELETE_TASK', 'tasks', task_id, task, None)
        emit_event('task_deleted', {'id': task_id})
        return True, None
