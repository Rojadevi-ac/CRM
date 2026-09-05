from config.database import query_all, query_one, execute_query
from utils.audit_utils import log_audit
from sockets.socket_events import emit_event

class FollowupService:
    @staticmethod
    def get_followups(page=1, limit=20, status=None, priority=None, user_id=None, lead_id=None, customer_id=None, date_from=None, date_to=None, today_only=False):
        offset = (page - 1) * limit
        where_clauses = ["1=1"]
        params = []

        if today_only:
            where_clauses.append("f.followup_date = CURRENT_DATE")

        if status:
            where_clauses.append("f.status = %s")
            params.append(status)

        if priority:
            where_clauses.append("f.priority = %s")
            params.append(priority)

        if user_id:
            where_clauses.append("f.assigned_user_id = %s")
            params.append(user_id)

        if lead_id:
            where_clauses.append("f.lead_id = %s")
            params.append(lead_id)

        if customer_id:
            where_clauses.append("f.customer_id = %s")
            params.append(customer_id)

        if date_from:
            where_clauses.append("f.followup_date >= %s")
            params.append(date_from)

        if date_to:
            where_clauses.append("f.followup_date <= %s")
            params.append(date_to)

        where_sql = " AND ".join(where_clauses)

        count_sql = f"SELECT COUNT(*) as total FROM followups f WHERE {where_sql}"
        count_res = query_one(count_sql, params)
        total = count_res['total'] if count_res else 0

        data_sql = f"""
            SELECT f.id, f.followup_date, f.followup_time, f.lead_id, f.customer_id,
                   f.purpose, f.assigned_user_id, f.created_by_id, f.priority, f.status,
                   f.notes, f.created_at, f.updated_at,
                   u.full_name as assigned_user_name, u.avatar_url as assigned_user_avatar,
                   l.name as lead_name, l.phone as lead_phone, l.company_name as lead_company,
                   c.customer_name, c.phone as customer_phone
            FROM followups f
            LEFT JOIN users u ON f.assigned_user_id = u.id
            LEFT JOIN leads l ON f.lead_id = l.id
            LEFT JOIN customers c ON f.customer_id = c.id
            WHERE {where_sql}
            ORDER BY f.followup_date ASC, f.followup_time ASC
            LIMIT %s OFFSET %s
        """
        data_params = list(params) + [limit, offset]
        followups = query_all(data_sql, data_params)

        return {
            'followups': followups,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit if limit > 0 else 1
            }
        }

    @staticmethod
    def get_followup_by_id(followup_id):
        return query_one("""
            SELECT f.id, f.followup_date, f.followup_time, f.lead_id, f.customer_id,
                   f.purpose, f.assigned_user_id, f.created_by_id, f.priority, f.status,
                   f.notes, f.created_at, f.updated_at,
                   u.full_name as assigned_user_name,
                   l.name as lead_name,
                   c.customer_name
            FROM followups f
            LEFT JOIN users u ON f.assigned_user_id = u.id
            LEFT JOIN leads l ON f.lead_id = l.id
            LEFT JOIN customers c ON f.customer_id = c.id
            WHERE f.id = %s
        """, (followup_id,))

    @staticmethod
    def _parse_id(val):
        if val is None or str(val).strip() in ('', 'null', 'undefined', 'None'):
            return None
        try:
            return int(val)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def create_followup(data, current_user_id):
        sql = """
            INSERT INTO followups (followup_date, followup_time, lead_id, customer_id, purpose, assigned_user_id, created_by_id, priority, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        lead_id = FollowupService._parse_id(data.get('lead_id'))
        customer_id = FollowupService._parse_id(data.get('customer_id'))
        assigned_user_id = FollowupService._parse_id(data.get('assigned_user_id')) or current_user_id
        followup_time = data.get('followup_time') if data.get('followup_time') != '' else None

        followup_id = execute_query(sql, (
            data['followup_date'],
            followup_time,
            lead_id,
            customer_id,
            data['purpose'].strip(),
            assigned_user_id,
            current_user_id,
            data.get('priority', 'Medium'),
            data.get('status', 'Pending'),
            data.get('notes', '')
        ))

        new_fol = FollowupService.get_followup_by_id(followup_id)
        log_audit(current_user_id, 'CREATE_FOLLOWUP', 'followups', followup_id, None, new_fol)

        # Notify assigned user
        if new_fol.get('assigned_user_id') and new_fol['assigned_user_id'] != current_user_id:
            notif_sql = "INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id) VALUES (%s, %s, %s, 'followup', 'followup', %s)"
            execute_query(notif_sql, (new_fol['assigned_user_id'], 'Follow-up Scheduled', f"Follow-up scheduled: {new_fol['purpose']}", followup_id))
            emit_event('notification_created', {'title': 'Follow-up Scheduled', 'followup_id': followup_id}, room=f"user_{new_fol['assigned_user_id']}")

        emit_event('followup_created', new_fol)
        return new_fol

    @staticmethod
    def update_followup(followup_id, data, current_user_id):
        old_fol = FollowupService.get_followup_by_id(followup_id)
        if not old_fol:
            return None, "Followup not found"

        followup_date = data.get('followup_date') or old_fol['followup_date']
        followup_time = data.get('followup_time') if 'followup_time' in data else old_fol.get('followup_time')
        if followup_time == '':
            followup_time = None
        lead_id = FollowupService._parse_id(data.get('lead_id')) if 'lead_id' in data else old_fol.get('lead_id')
        customer_id = FollowupService._parse_id(data.get('customer_id')) if 'customer_id' in data else old_fol.get('customer_id')
        purpose = (data.get('purpose') if data.get('purpose') is not None else old_fol['purpose']).strip()
        assigned_user_id = FollowupService._parse_id(data.get('assigned_user_id')) if 'assigned_user_id' in data else old_fol.get('assigned_user_id')
        priority = data.get('priority') or old_fol.get('priority') or 'Medium'
        status = data.get('status') or old_fol.get('status') or 'Pending'
        notes = data.get('notes') if 'notes' in data else old_fol.get('notes')

        sql = """
            UPDATE followups SET
                followup_date = %s,
                followup_time = %s,
                lead_id = %s,
                customer_id = %s,
                purpose = %s,
                assigned_user_id = %s,
                priority = %s,
                status = %s,
                notes = %s
            WHERE id = %s
        """
        execute_query(sql, (
            followup_date,
            followup_time,
            lead_id,
            customer_id,
            purpose,
            assigned_user_id,
            priority,
            status,
            notes,
            followup_id
        ))

        updated_fol = FollowupService.get_followup_by_id(followup_id)
        log_audit(current_user_id, 'UPDATE_FOLLOWUP', 'followups', followup_id, old_fol, updated_fol)
        emit_event('followup_updated', updated_fol)
        return updated_fol, None

    @staticmethod
    def delete_followup(followup_id, current_user_id):
        fol = FollowupService.get_followup_by_id(followup_id)
        if not fol:
            return False, "Followup not found"

        execute_query("DELETE FROM followups WHERE id = %s", (followup_id,))
        log_audit(current_user_id, 'DELETE_FOLLOWUP', 'followups', followup_id, fol, None)
        emit_event('followup_deleted', {'id': followup_id})
        return True, None
