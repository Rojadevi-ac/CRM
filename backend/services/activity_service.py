from config.database import query_all, query_one, execute_query
from utils.audit_utils import log_audit
from sockets.socket_events import emit_event

class ActivityService:
    @staticmethod
    def get_activities(page=1, limit=20, activity_type=None, status=None, user_id=None, lead_id=None, customer_id=None, deal_id=None, date_from=None, date_to=None):
        offset = (page - 1) * limit
        where_clauses = ["1=1"]
        params = []

        if activity_type:
            where_clauses.append("a.activity_type = %s")
            params.append(activity_type)

        if status:
            where_clauses.append("a.status = %s")
            params.append(status)

        if user_id:
            where_clauses.append("a.assigned_user_id = %s")
            params.append(user_id)

        if lead_id:
            where_clauses.append("a.lead_id = %s")
            params.append(lead_id)

        if customer_id:
            where_clauses.append("a.customer_id = %s")
            params.append(customer_id)

        if deal_id:
            where_clauses.append("a.deal_id = %s")
            params.append(deal_id)

        if date_from:
            where_clauses.append("a.activity_date >= %s")
            params.append(date_from)

        if date_to:
            where_clauses.append("a.activity_date <= %s")
            params.append(date_to)

        where_sql = " AND ".join(where_clauses)

        count_sql = f"SELECT COUNT(*) as total FROM activities a WHERE {where_sql}"
        count_res = query_one(count_sql, params)
        total = count_res['total'] if count_res else 0

        data_sql = f"""
            SELECT a.id, a.activity_type, a.subject, a.description,
                   a.lead_id, a.customer_id, a.deal_id,
                   a.assigned_user_id, a.created_by_id, a.activity_date, a.activity_time,
                   a.status, a.created_at, a.updated_at,
                   u.full_name as assigned_user_name, u.avatar_url as assigned_user_avatar,
                   l.name as lead_name,
                   c.customer_name,
                   d.deal_name
            FROM activities a
            LEFT JOIN users u ON a.assigned_user_id = u.id
            LEFT JOIN leads l ON a.lead_id = l.id
            LEFT JOIN customers c ON a.customer_id = c.id
            LEFT JOIN deals d ON a.deal_id = d.id
            WHERE {where_sql}
            ORDER BY a.activity_date DESC, a.activity_time DESC
            LIMIT %s OFFSET %s
        """
        data_params = list(params) + [limit, offset]
        activities = query_all(data_sql, data_params)

        return {
            'activities': activities,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit if limit > 0 else 1
            }
        }

    @staticmethod
    def get_activity_by_id(activity_id):
        return query_one("""
            SELECT a.id, a.activity_type, a.subject, a.description,
                   a.lead_id, a.customer_id, a.deal_id,
                   a.assigned_user_id, a.created_by_id, a.activity_date, a.activity_time,
                   a.status, a.created_at, a.updated_at,
                   u.full_name as assigned_user_name,
                   l.name as lead_name,
                   c.customer_name,
                   d.deal_name
            FROM activities a
            LEFT JOIN users u ON a.assigned_user_id = u.id
            LEFT JOIN leads l ON a.lead_id = l.id
            LEFT JOIN customers c ON a.customer_id = c.id
            LEFT JOIN deals d ON a.deal_id = d.id
            WHERE a.id = %s
        """, (activity_id,))

    @staticmethod
    def _parse_id(val):
        if val is None or str(val).strip() in ('', 'null', 'undefined', 'None'):
            return None
        try:
            return int(val)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def create_activity(data, current_user_id):
        sql = """
            INSERT INTO activities (activity_type, subject, description, lead_id, customer_id, deal_id, assigned_user_id, created_by_id, activity_date, activity_time, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        lead_id = ActivityService._parse_id(data.get('lead_id'))
        customer_id = ActivityService._parse_id(data.get('customer_id'))
        deal_id = ActivityService._parse_id(data.get('deal_id'))
        assigned_user_id = ActivityService._parse_id(data.get('assigned_user_id')) or current_user_id
        activity_time = data.get('activity_time') if data.get('activity_time') != '' else None

        activity_id = execute_query(sql, (
            data['activity_type'],
            data['subject'].strip(),
            data.get('description', ''),
            lead_id,
            customer_id,
            deal_id,
            assigned_user_id,
            current_user_id,
            data.get('activity_date'),
            activity_time,
            data.get('status', 'Completed')
        ))

        new_act = ActivityService.get_activity_by_id(activity_id)
        log_audit(current_user_id, 'CREATE_ACTIVITY', 'activities', activity_id, None, new_act)
        emit_event('activity_created', new_act)
        return new_act

    @staticmethod
    def update_activity(activity_id, data, current_user_id):
        old_act = ActivityService.get_activity_by_id(activity_id)
        if not old_act:
            return None, "Activity not found"

        activity_type = data.get('activity_type') or old_act['activity_type']
        subject = (data.get('subject') if data.get('subject') is not None else old_act['subject']).strip()
        description = data.get('description') if 'description' in data else old_act.get('description')
        
        lead_id = ActivityService._parse_id(data.get('lead_id')) if 'lead_id' in data else old_act.get('lead_id')
        customer_id = ActivityService._parse_id(data.get('customer_id')) if 'customer_id' in data else old_act.get('customer_id')
        deal_id = ActivityService._parse_id(data.get('deal_id')) if 'deal_id' in data else old_act.get('deal_id')
        assigned_user_id = ActivityService._parse_id(data.get('assigned_user_id')) if 'assigned_user_id' in data else old_act.get('assigned_user_id')
        
        activity_date = data.get('activity_date') or old_act['activity_date']
        activity_time = data.get('activity_time') if 'activity_time' in data else old_act.get('activity_time')
        if activity_time == '':
            activity_time = None
        status = data.get('status') or old_act.get('status') or 'Completed'

        sql = """
            UPDATE activities SET
                activity_type = %s,
                subject = %s,
                description = %s,
                lead_id = %s,
                customer_id = %s,
                deal_id = %s,
                assigned_user_id = %s,
                activity_date = %s,
                activity_time = %s,
                status = %s
            WHERE id = %s
        """
        execute_query(sql, (
            activity_type,
            subject,
            description,
            lead_id,
            customer_id,
            deal_id,
            assigned_user_id,
            activity_date,
            activity_time,
            status,
            activity_id
        ))

        updated_act = ActivityService.get_activity_by_id(activity_id)
        log_audit(current_user_id, 'UPDATE_ACTIVITY', 'activities', activity_id, old_act, updated_act)
        emit_event('activity_updated', updated_act)
        return updated_act, None

    @staticmethod
    def delete_activity(activity_id, current_user_id):
        act = ActivityService.get_activity_by_id(activity_id)
        if not act:
            return False, "Activity not found"

        execute_query("DELETE FROM activities WHERE id = %s", (activity_id,))
        log_audit(current_user_id, 'DELETE_ACTIVITY', 'activities', activity_id, act, None)
        emit_event('activity_deleted', {'id': activity_id})
        return True, None
