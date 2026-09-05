from config.database import query_all

class SearchService:
    @staticmethod
    def global_search(query_term):
        if not query_term or len(query_term.strip()) < 2:
            return {'leads': [], 'customers': [], 'companies': [], 'contacts': [], 'deals': [], 'tasks': []}

        term = f"%{query_term.strip()}%"

        leads = query_all("""
            SELECT id, name as title, company_name as subtitle, status, priority, estimated_value
            FROM leads
            WHERE name LIKE %s OR company_name LIKE %s OR email LIKE %s OR phone LIKE %s
            LIMIT 5
        """, (term, term, term, term))

        customers = query_all("""
            SELECT id, customer_name as title, industry as subtitle, customer_type, status
            FROM customers
            WHERE customer_name LIKE %s OR email LIKE %s OR phone LIKE %s
            LIMIT 5
        """, (term, term, term))

        companies = query_all("""
            SELECT id, name as title, industry as subtitle, city, annual_revenue
            FROM companies
            WHERE name LIKE %s OR email LIKE %s OR city LIKE %s
            LIMIT 5
        """, (term, term, term))

        contacts = query_all("""
            SELECT id, CONCAT(first_name, ' ', COALESCE(last_name, '')) as title, job_title as subtitle, email, phone
            FROM contacts
            WHERE first_name LIKE %s OR last_name LIKE %s OR email LIKE %s OR phone LIKE %s
            LIMIT 5
        """, (term, term, term, term))

        deals = query_all("""
            SELECT id, deal_name as title, stage as subtitle, amount, probability
            FROM deals
            WHERE deal_name LIKE %s
            LIMIT 5
        """, (term,))

        tasks = query_all("""
            SELECT id, task_name as title, status as subtitle, priority, due_date
            FROM tasks
            WHERE task_name LIKE %s OR description LIKE %s
            LIMIT 5
        """, (term, term))

        return {
            'leads': leads,
            'customers': customers,
            'companies': companies,
            'contacts': contacts,
            'deals': deals,
            'tasks': tasks
        }
