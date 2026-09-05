from config.database import query_all, query_one, execute_query
from utils.audit_utils import log_audit
from sockets.socket_events import emit_event

class AuditService:
    @staticmethod
    def get_audit_logs(page=1, limit=30, module=None, user_id=None, action=None):
        offset = (page - 1) * limit
        where_clauses = ["1=1"]
        params = []

        if module:
            where_clauses.append("a.module = %s")
            params.append(module)

        if user_id:
            where_clauses.append("a.user_id = %s")
            params.append(user_id)

        if action:
            where_clauses.append("a.action = %s")
            params.append(action)

        where_sql = " AND ".join(where_clauses)

        count_sql = f"SELECT COUNT(*) as total FROM audit_logs a WHERE {where_sql}"
        count_res = query_one(count_sql, params)
        total = count_res['total'] if count_res else 0

        data_sql = f"""
            SELECT a.id, a.user_id, a.action, a.module, a.record_id,
                   a.old_value, a.new_value, a.ip_address, a.created_at,
                   u.full_name as user_name, u.email as user_email
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE {where_sql}
            ORDER BY a.created_at DESC
            LIMIT %s OFFSET %s
        """
        data_params = list(params) + [limit, offset]
        logs = query_all(data_sql, data_params)

        return {
            'logs': logs,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit if limit > 0 else 1
            }
        }

    @staticmethod
    def get_notes(entity_type, entity_id):
        return query_all("""
            SELECT n.id, n.entity_type, n.entity_id, n.content, n.created_by_id, n.created_at, n.updated_at,
                   u.full_name as author_name, u.avatar_url as author_avatar
            FROM notes n
            LEFT JOIN users u ON n.created_by_id = u.id
            WHERE n.entity_type = %s AND n.entity_id = %s
            ORDER BY n.created_at DESC
        """, (entity_type, entity_id))

    @staticmethod
    def add_note(entity_type, entity_id, content, current_user_id):
        sql = """
            INSERT INTO notes (entity_type, entity_id, content, created_by_id)
            VALUES (%s, %s, %s, %s)
        """
        note_id = execute_query(sql, (entity_type, entity_id, content.strip(), current_user_id))
        note = query_one("""
            SELECT n.id, n.entity_type, n.entity_id, n.content, n.created_by_id, n.created_at, n.updated_at,
                   u.full_name as author_name, u.avatar_url as author_avatar
            FROM notes n
            LEFT JOIN users u ON n.created_by_id = u.id
            WHERE n.id = %s
        """, (note_id,))
        emit_event('note_created', note)
        return note

    @staticmethod
    def delete_note(note_id, current_user_id):
        execute_query("DELETE FROM notes WHERE id = %s", (note_id,))
        emit_event('note_deleted', {'id': note_id})
        return True
