from config.database import query_all, query_one, execute_query
from utils.audit_utils import log_audit
from sockets.socket_events import emit_event

class CustomerService:
    @staticmethod
    def get_customers(page=1, limit=20, search=None, status=None, industry=None, customer_type=None, owner_id=None, sort_by='id', sort_dir='DESC'):
        offset = (page - 1) * limit
        where_clauses = ["1=1"]
        params = []

        if search:
            where_clauses.append("(c.customer_name LIKE %s OR c.email LIKE %s OR c.phone LIKE %s)")
            term = f"%{search.strip()}%"
            params.extend([term, term, term])

        if status:
            where_clauses.append("c.status = %s")
            params.append(status)

        if industry:
            where_clauses.append("c.industry = %s")
            params.append(industry)

        if customer_type:
            where_clauses.append("c.customer_type = %s")
            params.append(customer_type)

        if owner_id:
            where_clauses.append("c.owner_id = %s")
            params.append(owner_id)

        where_sql = " AND ".join(where_clauses)
        
        valid_cols = {'id': 'c.id', 'customer_name': 'c.customer_name', 'created_at': 'c.created_at', 'status': 'c.status'}
        order_col = valid_cols.get(sort_by, 'c.id')
        order_direction = 'ASC' if str(sort_dir).upper() == 'ASC' else 'DESC'

        count_sql = f"SELECT COUNT(*) as total FROM customers c WHERE {where_sql}"
        count_res = query_one(count_sql, params)
        total = count_res['total'] if count_res else 0

        data_sql = f"""
            SELECT c.id, c.customer_name, c.email, c.phone, c.company_id, c.industry,
                   c.customer_type, c.status, c.owner_id, c.address, c.created_at, c.updated_at,
                   comp.name as company_name,
                   u.full_name as owner_name, u.avatar_url as owner_avatar,
                   (SELECT COUNT(*) FROM deals d WHERE d.customer_id = c.id) as total_deals,
                   (SELECT COALESCE(SUM(d.amount), 0) FROM deals d WHERE d.customer_id = c.id AND d.stage = 'Closed Won') as total_revenue
            FROM customers c
            LEFT JOIN companies comp ON c.company_id = comp.id
            LEFT JOIN users u ON c.owner_id = u.id
            WHERE {where_sql}
            ORDER BY {order_col} {order_direction}
            LIMIT %s OFFSET %s
        """
        data_params = list(params) + [limit, offset]
        customers = query_all(data_sql, data_params)

        return {
            'customers': customers,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit if limit > 0 else 1
            }
        }

    @staticmethod
    def get_customer_by_id(customer_id):
        customer = query_one("""
            SELECT c.id, c.customer_name, c.email, c.phone, c.company_id, c.industry,
                   c.customer_type, c.status, c.owner_id, c.address, c.created_at, c.updated_at,
                   comp.name as company_name,
                   u.full_name as owner_name, u.email as owner_email, u.avatar_url as owner_avatar
            FROM customers c
            LEFT JOIN companies comp ON c.company_id = comp.id
            LEFT JOIN users u ON c.owner_id = u.id
            WHERE c.id = %s
        """, (customer_id,))

        if not customer:
            return None

        # Linked deals
        customer['deals'] = query_all("""
            SELECT id, deal_name, amount, stage, probability, expected_closing_date
            FROM deals WHERE customer_id = %s ORDER BY id DESC
        """, (customer_id,))

        # Linked contacts
        customer['contacts'] = query_all("""
            SELECT id, first_name, last_name, email, phone, job_title, contact_type
            FROM contacts WHERE company_id = %s ORDER BY id DESC
        """, (customer.get('company_id'),)) if customer.get('company_id') else []

        return customer

    @staticmethod
    def create_customer(data, current_user_id):
        sql = """
            INSERT INTO customers (customer_name, email, phone, company_id, industry, customer_type, status, owner_id, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        customer_id = execute_query(sql, (
            data['customer_name'].strip(),
            data.get('email', '').strip().lower(),
            data.get('phone', ''),
            data.get('company_id'),
            data.get('industry', ''),
            data.get('customer_type', 'Enterprise'),
            data.get('status', 'Active'),
            data.get('owner_id', current_user_id),
            data.get('address', '')
        ))

        new_cust = CustomerService.get_customer_by_id(customer_id)
        log_audit(current_user_id, 'CREATE_CUSTOMER', 'customers', customer_id, None, new_cust)
        emit_event('customer_created', new_cust)
        return new_cust

    @staticmethod
    def update_customer(customer_id, data, current_user_id):
        old_cust = CustomerService.get_customer_by_id(customer_id)
        if not old_cust:
            return None, "Customer not found"

        sql = """
            UPDATE customers SET
                customer_name = COALESCE(%s, customer_name),
                email = COALESCE(%s, email),
                phone = COALESCE(%s, phone),
                company_id = COALESCE(%s, company_id),
                industry = COALESCE(%s, industry),
                customer_type = COALESCE(%s, customer_type),
                status = COALESCE(%s, status),
                owner_id = COALESCE(%s, owner_id),
                address = COALESCE(%s, address)
            WHERE id = %s
        """
        execute_query(sql, (
            data.get('customer_name'),
            data.get('email', '').strip().lower() if 'email' in data else None,
            data.get('phone'),
            data.get('company_id'),
            data.get('industry'),
            data.get('customer_type'),
            data.get('status'),
            data.get('owner_id'),
            data.get('address'),
            customer_id
        ))

        updated_cust = CustomerService.get_customer_by_id(customer_id)
        log_audit(current_user_id, 'UPDATE_CUSTOMER', 'customers', customer_id, old_cust, updated_cust)
        emit_event('customer_updated', updated_cust)
        return updated_cust, None

    @staticmethod
    def delete_customer(customer_id, current_user_id):
        cust = CustomerService.get_customer_by_id(customer_id)
        if not cust:
            return False, "Customer not found"

        execute_query("DELETE FROM customers WHERE id = %s", (customer_id,))
        log_audit(current_user_id, 'DELETE_CUSTOMER', 'customers', customer_id, cust, None)
        emit_event('customer_deleted', {'id': customer_id})
        return True, None
