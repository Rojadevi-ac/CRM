from config.database import query_all, query_one, execute_query
from utils.audit_utils import log_audit
from sockets.socket_events import emit_event

class CompanyService:
    @staticmethod
    def get_companies(page=1, limit=20, search=None, industry=None, owner_id=None, sort_by='id', sort_dir='DESC'):
        offset = (page - 1) * limit
        where_clauses = ["1=1"]
        params = []

        if search:
            where_clauses.append("(c.name LIKE %s OR c.email LIKE %s OR c.city LIKE %s)")
            term = f"%{search.strip()}%"
            params.extend([term, term, term])

        if industry:
            where_clauses.append("c.industry = %s")
            params.append(industry)

        if owner_id:
            where_clauses.append("c.owner_id = %s")
            params.append(owner_id)

        where_sql = " AND ".join(where_clauses)
        valid_cols = {'id': 'c.id', 'name': 'c.name', 'employee_count': 'c.employee_count', 'annual_revenue': 'c.annual_revenue'}
        order_col = valid_cols.get(sort_by, 'c.id')
        order_direction = 'ASC' if str(sort_dir).upper() == 'ASC' else 'DESC'

        count_sql = f"SELECT COUNT(*) as total FROM companies c WHERE {where_sql}"
        count_res = query_one(count_sql, params)
        total = count_res['total'] if count_res else 0

        data_sql = f"""
            SELECT c.id, c.name, c.industry, c.website, c.phone, c.email, c.address,
                   c.city, c.state, c.country, c.employee_count, c.annual_revenue, c.owner_id,
                   c.created_at, c.updated_at,
                   u.full_name as owner_name,
                   (SELECT COUNT(*) FROM contacts cnt WHERE cnt.company_id = c.id) as contact_count,
                   (SELECT COUNT(*) FROM deals d WHERE d.company_id = c.id) as deal_count
            FROM companies c
            LEFT JOIN users u ON c.owner_id = u.id
            WHERE {where_sql}
            ORDER BY {order_col} {order_direction}
            LIMIT %s OFFSET %s
        """
        data_params = list(params) + [limit, offset]
        companies = query_all(data_sql, data_params)

        return {
            'companies': companies,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit if limit > 0 else 1
            }
        }

    @staticmethod
    def get_company_by_id(company_id):
        comp = query_one("""
            SELECT c.id, c.name, c.industry, c.website, c.phone, c.email, c.address,
                   c.city, c.state, c.country, c.employee_count, c.annual_revenue, c.owner_id,
                   c.created_at, c.updated_at,
                   u.full_name as owner_name, u.email as owner_email
            FROM companies c
            LEFT JOIN users u ON c.owner_id = u.id
            WHERE c.id = %s
        """, (company_id,))

        if not comp:
            return None

        comp['contacts'] = query_all("""
            SELECT id, first_name, last_name, email, phone, job_title, department, contact_type
            FROM contacts WHERE company_id = %s ORDER BY id DESC
        """, (company_id,))

        comp['deals'] = query_all("""
            SELECT id, deal_name, amount, stage, expected_closing_date
            FROM deals WHERE company_id = %s ORDER BY id DESC
        """, (company_id,))

        return comp

    @staticmethod
    def create_company(data, current_user_id):
        sql = """
            INSERT INTO companies (name, industry, website, phone, email, address, city, state, country, employee_count, annual_revenue, owner_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        company_id = execute_query(sql, (
            data['name'].strip(),
            data.get('industry', ''),
            data.get('website', ''),
            data.get('phone', ''),
            data.get('email', ''),
            data.get('address', ''),
            data.get('city', ''),
            data.get('state', ''),
            data.get('country', 'India'),
            data.get('employee_count', 0),
            data.get('annual_revenue', 0.00),
            data.get('owner_id', current_user_id)
        ))

        new_comp = CompanyService.get_company_by_id(company_id)
        log_audit(current_user_id, 'CREATE_COMPANY', 'companies', company_id, None, new_comp)
        emit_event('company_created', new_comp)
        return new_comp

    @staticmethod
    def update_company(company_id, data, current_user_id):
        old_comp = CompanyService.get_company_by_id(company_id)
        if not old_comp:
            return None, "Company not found"

        sql = """
            UPDATE companies SET
                name = COALESCE(%s, name),
                industry = COALESCE(%s, industry),
                website = COALESCE(%s, website),
                phone = COALESCE(%s, phone),
                email = COALESCE(%s, email),
                address = COALESCE(%s, address),
                city = COALESCE(%s, city),
                state = COALESCE(%s, state),
                country = COALESCE(%s, country),
                employee_count = COALESCE(%s, employee_count),
                annual_revenue = COALESCE(%s, annual_revenue),
                owner_id = COALESCE(%s, owner_id)
            WHERE id = %s
        """
        execute_query(sql, (
            data.get('name'),
            data.get('industry'),
            data.get('website'),
            data.get('phone'),
            data.get('email'),
            data.get('address'),
            data.get('city'),
            data.get('state'),
            data.get('country'),
            data.get('employee_count'),
            data.get('annual_revenue'),
            data.get('owner_id'),
            company_id
        ))

        updated_comp = CompanyService.get_company_by_id(company_id)
        log_audit(current_user_id, 'UPDATE_COMPANY', 'companies', company_id, old_comp, updated_comp)
        emit_event('company_updated', updated_comp)
        return updated_comp, None

    @staticmethod
    def delete_company(company_id, current_user_id):
        comp = CompanyService.get_company_by_id(company_id)
        if not comp:
            return False, "Company not found"

        execute_query("DELETE FROM companies WHERE id = %s", (company_id,))
        log_audit(current_user_id, 'DELETE_COMPANY', 'companies', company_id, comp, None)
        emit_event('company_deleted', {'id': company_id})
        return True, None
