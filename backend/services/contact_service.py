from config.database import query_all, query_one, execute_query
from utils.audit_utils import log_audit
from sockets.socket_events import emit_event

class ContactService:
    @staticmethod
    def get_contacts(page=1, limit=20, search=None, company_id=None, contact_type=None, owner_id=None, sort_by='id', sort_dir='DESC'):
        offset = (page - 1) * limit
        where_clauses = ["1=1"]
        params = []

        if search:
            where_clauses.append("(c.first_name LIKE %s OR c.last_name LIKE %s OR c.email LIKE %s OR c.phone LIKE %s)")
            term = f"%{search.strip()}%"
            params.extend([term, term, term, term])

        if company_id:
            where_clauses.append("c.company_id = %s")
            params.append(company_id)

        if contact_type:
            where_clauses.append("c.contact_type = %s")
            params.append(contact_type)

        if owner_id:
            where_clauses.append("c.owner_id = %s")
            params.append(owner_id)

        where_sql = " AND ".join(where_clauses)
        valid_cols = {'id': 'c.id', 'first_name': 'c.first_name', 'created_at': 'c.created_at', 'email': 'c.email'}
        order_col = valid_cols.get(sort_by, 'c.id')
        order_direction = 'ASC' if str(sort_dir).upper() == 'ASC' else 'DESC'

        count_sql = f"SELECT COUNT(*) as total FROM contacts c WHERE {where_sql}"
        count_res = query_one(count_sql, params)
        total = count_res['total'] if count_res else 0

        data_sql = f"""
            SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.job_title,
                   c.company_id, c.department, c.contact_type, c.owner_id, c.created_at, c.updated_at,
                   comp.name as company_name,
                   u.full_name as owner_name
            FROM contacts c
            LEFT JOIN companies comp ON c.company_id = comp.id
            LEFT JOIN users u ON c.owner_id = u.id
            WHERE {where_sql}
            ORDER BY {order_col} {order_direction}
            LIMIT %s OFFSET %s
        """
        data_params = list(params) + [limit, offset]
        contacts = query_all(data_sql, data_params)

        return {
            'contacts': contacts,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit if limit > 0 else 1
            }
        }

    @staticmethod
    def get_contact_by_id(contact_id):
        return query_one("""
            SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.job_title,
                   c.company_id, c.department, c.contact_type, c.owner_id, c.created_at, c.updated_at,
                   comp.name as company_name,
                   u.full_name as owner_name, u.email as owner_email
            FROM contacts c
            LEFT JOIN companies comp ON c.company_id = comp.id
            LEFT JOIN users u ON c.owner_id = u.id
            WHERE c.id = %s
        """, (contact_id,))

    @staticmethod
    def create_contact(data, current_user_id):
        sql = """
            INSERT INTO contacts (first_name, last_name, email, phone, job_title, company_id, department, contact_type, owner_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        contact_id = execute_query(sql, (
            data['first_name'].strip(),
            data.get('last_name', '').strip(),
            data['email'].strip().lower(),
            data.get('phone', ''),
            data.get('job_title', ''),
            data.get('company_id'),
            data.get('department', ''),
            data.get('contact_type', 'Decision Maker'),
            data.get('owner_id', current_user_id)
        ))

        new_contact = ContactService.get_contact_by_id(contact_id)
        log_audit(current_user_id, 'CREATE_CONTACT', 'contacts', contact_id, None, new_contact)
        emit_event('contact_created', new_contact)
        return new_contact

    @staticmethod
    def update_contact(contact_id, data, current_user_id):
        old_contact = ContactService.get_contact_by_id(contact_id)
        if not old_contact:
            return None, "Contact not found"

        sql = """
            UPDATE contacts SET
                first_name = COALESCE(%s, first_name),
                last_name = COALESCE(%s, last_name),
                email = COALESCE(%s, email),
                phone = COALESCE(%s, phone),
                job_title = COALESCE(%s, job_title),
                company_id = COALESCE(%s, company_id),
                department = COALESCE(%s, department),
                contact_type = COALESCE(%s, contact_type),
                owner_id = COALESCE(%s, owner_id)
            WHERE id = %s
        """
        execute_query(sql, (
            data.get('first_name'),
            data.get('last_name'),
            data.get('email', '').strip().lower() if 'email' in data else None,
            data.get('phone'),
            data.get('job_title'),
            data.get('company_id'),
            data.get('department'),
            data.get('contact_type'),
            data.get('owner_id'),
            contact_id
        ))

        updated_contact = ContactService.get_contact_by_id(contact_id)
        log_audit(current_user_id, 'UPDATE_CONTACT', 'contacts', contact_id, old_contact, updated_contact)
        emit_event('contact_updated', updated_contact)
        return updated_contact, None

    @staticmethod
    def delete_contact(contact_id, current_user_id):
        contact = ContactService.get_contact_by_id(contact_id)
        if not contact:
            return False, "Contact not found"

        execute_query("DELETE FROM contacts WHERE id = %s", (contact_id,))
        log_audit(current_user_id, 'DELETE_CONTACT', 'contacts', contact_id, contact, None)
        emit_event('contact_deleted', {'id': contact_id})
        return True, None
