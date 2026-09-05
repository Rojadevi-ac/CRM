from config.database import query_all, query_one, execute_query
from utils.audit_utils import log_audit
from sockets.socket_events import emit_event

class LeadService:
    @staticmethod
    def get_leads(page=1, limit=20, search=None, status=None, source=None, priority=None, assigned_user_id=None, date_from=None, date_to=None, sort_by='id', sort_dir='DESC'):
        offset = (page - 1) * limit
        where_clauses = ["1=1"]
        params = []

        if search:
            where_clauses.append("(l.name LIKE %s OR l.email LIKE %s OR l.company_name LIKE %s OR l.phone LIKE %s)")
            term = f"%{search.strip()}%"
            params.extend([term, term, term, term])

        if status:
            where_clauses.append("l.status = %s")
            params.append(status)

        if source:
            where_clauses.append("l.source = %s")
            params.append(source)

        if priority:
            where_clauses.append("l.priority = %s")
            params.append(priority)

        if assigned_user_id:
            where_clauses.append("l.assigned_user_id = %s")
            params.append(assigned_user_id)

        if date_from:
            where_clauses.append("DATE(l.created_at) >= %s")
            params.append(date_from)

        if date_to:
            where_clauses.append("DATE(l.created_at) <= %s")
            params.append(date_to)

        where_sql = " AND ".join(where_clauses)
        
        # Valid sort columns
        valid_cols = {'id': 'l.id', 'name': 'l.name', 'created_at': 'l.created_at', 'status': 'l.status', 'priority': 'l.priority', 'estimated_value': 'l.estimated_value'}
        order_col = valid_cols.get(sort_by, 'l.id')
        order_direction = 'ASC' if str(sort_dir).upper() == 'ASC' else 'DESC'

        count_sql = f"SELECT COUNT(*) as total FROM leads l WHERE {where_sql}"
        count_res = query_one(count_sql, params)
        total = count_res['total'] if count_res else 0

        data_sql = f"""
            SELECT l.id, l.name, l.email, l.phone, l.company_name, l.company_id, l.source,
                   l.industry, l.status, l.priority, l.estimated_value, l.assigned_user_id,
                   l.created_by_id, l.created_at, l.updated_at,
                   u.full_name as assigned_user_name, u.avatar_url as assigned_user_avatar,
                   creator.full_name as created_by_name
            FROM leads l
            LEFT JOIN users u ON l.assigned_user_id = u.id
            LEFT JOIN users creator ON l.created_by_id = creator.id
            WHERE {where_sql}
            ORDER BY {order_col} {order_direction}
            LIMIT %s OFFSET %s
        """
        data_params = list(params) + [limit, offset]
        leads = query_all(data_sql, data_params)

        return {
            'leads': leads,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit if limit > 0 else 1
            }
        }

    @staticmethod
    def get_lead_by_id(lead_id):
        return query_one("""
            SELECT l.id, l.name, l.email, l.phone, l.company_name, l.company_id, l.source,
                   l.industry, l.status, l.priority, l.estimated_value, l.assigned_user_id,
                   l.created_by_id, l.created_at, l.updated_at,
                   u.full_name as assigned_user_name, u.email as assigned_user_email, u.avatar_url as assigned_user_avatar,
                   creator.full_name as created_by_name
            FROM leads l
            LEFT JOIN users u ON l.assigned_user_id = u.id
            LEFT JOIN users creator ON l.created_by_id = creator.id
            WHERE l.id = %s
        """, (lead_id,))

    @staticmethod
    def create_lead(data, current_user_id):
        sql = """
            INSERT INTO leads (name, email, phone, company_name, company_id, source, industry, status, priority, estimated_value, assigned_user_id, created_by_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        lead_id = execute_query(sql, (
            data['name'].strip(),
            data.get('email', '').strip().lower(),
            data.get('phone', ''),
            data.get('company_name', ''),
            data.get('company_id'),
            data.get('source', 'Website'),
            data.get('industry', ''),
            data.get('status', 'New'),
            data.get('priority', 'Medium'),
            data.get('estimated_value', 0.00),
            data.get('assigned_user_id'),
            current_user_id
        ))

        new_lead = LeadService.get_lead_by_id(lead_id)
        log_audit(current_user_id, 'CREATE_LEAD', 'leads', lead_id, None, new_lead)

        # Notify assigned user if assigned
        if new_lead.get('assigned_user_id'):
            notif_sql = """
                INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
                VALUES (%s, %s, %s, 'lead', 'lead', %s)
            """
            execute_query(notif_sql, (
                new_lead['assigned_user_id'],
                'New Lead Assigned',
                f"You were assigned lead {new_lead['name']} ({new_lead['company_name']})",
                lead_id
            ))
            emit_event('notification_created', {'title': 'New Lead Assigned', 'lead_id': lead_id}, room=f"user_{new_lead['assigned_user_id']}")

        emit_event('lead_created', new_lead)
        return new_lead

    @staticmethod
    def update_lead(lead_id, data, current_user_id):
        old_lead = LeadService.get_lead_by_id(lead_id)
        if not old_lead:
            return None, "Lead not found"

        sql = """
            UPDATE leads SET
                name = COALESCE(%s, name),
                email = COALESCE(%s, email),
                phone = COALESCE(%s, phone),
                company_name = COALESCE(%s, company_name),
                company_id = COALESCE(%s, company_id),
                source = COALESCE(%s, source),
                industry = COALESCE(%s, industry),
                status = COALESCE(%s, status),
                priority = COALESCE(%s, priority),
                estimated_value = COALESCE(%s, estimated_value),
                assigned_user_id = COALESCE(%s, assigned_user_id)
            WHERE id = %s
        """
        execute_query(sql, (
            data.get('name'),
            data.get('email', '').strip().lower() if 'email' in data else None,
            data.get('phone'),
            data.get('company_name'),
            data.get('company_id'),
            data.get('source'),
            data.get('industry'),
            data.get('status'),
            data.get('priority'),
            data.get('estimated_value'),
            data.get('assigned_user_id'),
            lead_id
        ))

        updated_lead = LeadService.get_lead_by_id(lead_id)
        log_audit(current_user_id, 'UPDATE_LEAD', 'leads', lead_id, old_lead, updated_lead)

        # Check if status changed
        if old_lead['status'] != updated_lead['status']:
            emit_event('lead_status_changed', updated_lead)
        else:
            emit_event('lead_updated', updated_lead)

        return updated_lead, None

    @staticmethod
    def assign_lead(lead_id, assigned_user_id, current_user_id):
        old_lead = LeadService.get_lead_by_id(lead_id)
        if not old_lead:
            return None, "Lead not found"

        execute_query("UPDATE leads SET assigned_user_id = %s WHERE id = %s", (assigned_user_id, lead_id))
        updated_lead = LeadService.get_lead_by_id(lead_id)

        # Record activity and notification
        if assigned_user_id:
            act_sql = """
                INSERT INTO activities (activity_type, subject, description, lead_id, assigned_user_id, created_by_id, activity_date, activity_time, status)
                VALUES ('Other', 'Lead Assigned', %s, %s, %s, %s, CURRENT_DATE, CURRENT_TIME, 'Completed')
            """
            execute_query(act_sql, (f"Lead assigned to {updated_lead.get('assigned_user_name')}", lead_id, assigned_user_id, current_user_id))

            notif_sql = """
                INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
                VALUES (%s, %s, %s, 'lead', 'lead', %s)
            """
            execute_query(notif_sql, (
                assigned_user_id,
                'Lead Assigned to You',
                f"Lead '{updated_lead['name']}' from '{updated_lead['company_name']}' was assigned to you.",
                lead_id
            ))
            emit_event('notification_created', {'title': 'Lead Assigned', 'lead_id': lead_id}, room=f"user_{assigned_user_id}")

        log_audit(current_user_id, 'ASSIGN_LEAD', 'leads', lead_id, old_lead, updated_lead)
        emit_event('lead_assigned', updated_lead)
        return updated_lead, None

    @staticmethod
    def change_status(lead_id, new_status, current_user_id):
        old_lead = LeadService.get_lead_by_id(lead_id)
        if not old_lead:
            return None, "Lead not found"

        execute_query("UPDATE leads SET status = %s WHERE id = %s", (new_status, lead_id))
        updated_lead = LeadService.get_lead_by_id(lead_id)

        # Sync linked deals if status changed to Lost or Won
        if new_status == 'Lost':
            execute_query("UPDATE deals SET stage = 'Closed Lost', probability = 0, updated_at = CURRENT_TIMESTAMP WHERE lead_id = %s", (lead_id,))
            linked_deals = query_all("SELECT id FROM deals WHERE lead_id = %s", (lead_id,))
            from services.deal_service import DealService
            for d in linked_deals:
                d_obj = DealService.get_deal_by_id(d['id'])
                if d_obj:
                    emit_event('deal_stage_changed', d_obj)
        elif new_status == 'Won':
            execute_query("UPDATE deals SET stage = 'Closed Won', probability = 100, updated_at = CURRENT_TIMESTAMP WHERE lead_id = %s", (lead_id,))
            linked_deals = query_all("SELECT id FROM deals WHERE lead_id = %s", (lead_id,))
            from services.deal_service import DealService
            for d in linked_deals:
                d_obj = DealService.get_deal_by_id(d['id'])
                if d_obj:
                    emit_event('deal_stage_changed', d_obj)

        # Record activity
        act_sql = """
            INSERT INTO activities (activity_type, subject, description, lead_id, assigned_user_id, created_by_id, activity_date, activity_time, status)
            VALUES ('Other', 'Status Changed', %s, %s, %s, %s, CURRENT_DATE, CURRENT_TIME, 'Completed')
        """
        execute_query(act_sql, (f"Lead status moved from '{old_lead['status']}' to '{new_status}'", lead_id, updated_lead.get('assigned_user_id'), current_user_id))

        log_audit(current_user_id, 'STATUS_CHANGE', 'leads', lead_id, {'status': old_lead['status']}, {'status': new_status})
        emit_event('lead_status_changed', updated_lead)
        return updated_lead, None

    @staticmethod
    def delete_lead(lead_id, current_user_id):
        lead = LeadService.get_lead_by_id(lead_id)
        if not lead:
            return False, "Lead not found"

        execute_query("DELETE FROM leads WHERE id = %s", (lead_id,))
        log_audit(current_user_id, 'DELETE_LEAD', 'leads', lead_id, lead, None)
        emit_event('lead_deleted', {'id': lead_id})
        return True, None

    @staticmethod
    def get_lead_timeline(lead_id):
        activities = query_all("""
            SELECT a.id, 'activity' as item_type, a.activity_type, a.subject, a.description,
                   a.activity_date as event_date, a.activity_time as event_time, a.status,
                   u.full_name as author_name, u.avatar_url as author_avatar, a.created_at
            FROM activities a
            LEFT JOIN users u ON a.created_by_id = u.id
            WHERE a.lead_id = %s
        """, (lead_id,))

        notes = query_all("""
            SELECT n.id, 'note' as item_type, 'Note' as activity_type, 'Internal Note' as subject, n.content as description,
                   DATE(n.created_at) as event_date, TIME(n.created_at) as event_time, 'Completed' as status,
                   u.full_name as author_name, u.avatar_url as author_avatar, n.created_at
            FROM notes n
            LEFT JOIN users u ON n.created_by_id = u.id
            WHERE n.entity_type = 'lead' AND n.entity_id = %s
        """, (lead_id,))

        tasks = query_all("""
            SELECT t.id, 'task' as item_type, 'Task' as activity_type, t.task_name as subject, t.description,
                   t.due_date as event_date, '17:00:00' as event_time, t.status,
                   u.full_name as author_name, u.avatar_url as author_avatar, t.created_at
            FROM tasks t
            LEFT JOIN users u ON t.created_by_id = u.id
            WHERE t.lead_id = %s
        """, (lead_id,))

        followups = query_all("""
            SELECT f.id, 'followup' as item_type, 'Follow-up' as activity_type, f.purpose as subject, f.notes as description,
                   f.followup_date as event_date, f.followup_time as event_time, f.status,
                   u.full_name as author_name, u.avatar_url as author_avatar, f.created_at
            FROM followups f
            LEFT JOIN users u ON f.created_by_id = u.id
            WHERE f.lead_id = %s
        """, (lead_id,))

        all_events = list(activities) + list(notes) + list(tasks) + list(followups)
        all_events.sort(key=lambda x: str(x['created_at']), reverse=True)
        return all_events
