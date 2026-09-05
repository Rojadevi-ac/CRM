from datetime import datetime, date, timedelta
from config.database import query_all, query_one

class ReportService:
    @staticmethod
    def get_date_bounds(date_range='this_month', custom_from=None, custom_to=None):
        today = date.today()
        if date_range == 'today':
            return today, today
        elif date_range == 'yesterday':
            yesterday = today - timedelta(days=1)
            return yesterday, yesterday
        elif date_range == 'last_7_days':
            return today - timedelta(days=7), today
        elif date_range == 'last_30_days':
            return today - timedelta(days=30), today
        elif date_range == 'this_month':
            start_of_month = date(today.year, today.month, 1)
            return start_of_month, today
        elif date_range == 'last_month':
            first_this_month = date(today.year, today.month, 1)
            last_month_end = first_this_month - timedelta(days=1)
            start_last_month = date(last_month_end.year, last_month_end.month, 1)
            return start_last_month, last_month_end
        elif date_range == 'this_quarter':
            quarter = (today.month - 1) // 3 + 1
            start_month = (quarter - 1) * 3 + 1
            return date(today.year, start_month, 1), today
        elif date_range == 'this_year':
            return date(today.year, 1, 1), today
        elif date_range == 'custom' and custom_from and custom_to:
            try:
                d1 = datetime.strptime(custom_from, '%Y-%m-%d').date()
                d2 = datetime.strptime(custom_to, '%Y-%m-%d').date()
                return d1, d2
            except:
                return date(2020, 1, 1), today
        return date(2020, 1, 1), today

    @staticmethod
    def get_dashboard_kpis():
        total_leads = query_one("SELECT COUNT(*) as count FROM leads")['count']
        qualified_leads = query_one("SELECT COUNT(*) as count FROM leads WHERE status = 'Qualified'")['count']
        total_customers = query_one("SELECT COUNT(*) as count FROM customers WHERE status = 'Active'")['count']
        active_deals = query_one("SELECT COUNT(*) as count FROM deals WHERE stage NOT IN ('Closed Won', 'Closed Lost')")['count']
        won_deals = query_one("SELECT COUNT(*) as count FROM deals WHERE stage = 'Closed Won'")['count']
        lost_deals = query_one("SELECT COUNT(*) as count FROM deals WHERE stage = 'Closed Lost'")['count']
        
        pipeline_val_res = query_one("SELECT COALESCE(SUM(amount), 0) as total FROM deals WHERE stage NOT IN ('Closed Won', 'Closed Lost')")
        pipeline_value = float(pipeline_val_res['total']) if pipeline_val_res else 0.0

        revenue_res = query_one("SELECT COALESCE(SUM(amount), 0) as total FROM deals WHERE stage = 'Closed Won'")
        revenue = float(revenue_res['total']) if revenue_res else 0.0

        # Lead conversion stats by stage
        lead_stages = query_all("""
            SELECT status, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value
            FROM leads
            GROUP BY status
            ORDER BY FIELD(status, 'New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')
        """)

        # Deal pipeline value by stage
        deal_stages = query_all("""
            SELECT stage, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount, COALESCE(SUM(amount * probability / 100.0), 0) as weighted_value
            FROM deals
            GROUP BY stage
            ORDER BY FIELD(stage, 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost')
        """)

        # Top Sales Performance
        sales_performance = query_all("""
            SELECT u.id, u.full_name, u.avatar_url,
                   COUNT(DISTINCT l.id) as total_leads,
                   COUNT(DISTINCT d.id) as total_deals,
                   COUNT(DISTINCT CASE WHEN d.stage = 'Closed Won' THEN d.id END) as won_deals,
                   COALESCE(SUM(CASE WHEN d.stage = 'Closed Won' THEN d.amount ELSE 0 END), 0) as won_revenue,
                   ROUND(
                       CASE WHEN COUNT(DISTINCT d.id) > 0 
                            THEN (COUNT(DISTINCT CASE WHEN d.stage = 'Closed Won' THEN d.id END) * 100.0 / COUNT(DISTINCT d.id))
                            ELSE 0 
                       END, 1
                   ) as conversion_rate
            FROM users u
            LEFT JOIN leads l ON l.assigned_user_id = u.id
            LEFT JOIN deals d ON d.owner_id = u.id
            WHERE u.status = 'active' AND u.department != 'Audit & Compliance'
            GROUP BY u.id, u.full_name, u.avatar_url
            ORDER BY won_revenue DESC, won_deals DESC
        """)

        # Recent activities (latest 8)
        recent_activities = query_all("""
            SELECT a.id, a.activity_type, a.subject, a.description, a.activity_date, a.activity_time, a.status,
                   u.full_name as author_name, u.avatar_url as author_avatar,
                   COALESCE(l.name, c.customer_name, d.deal_name, 'General') as entity_name
            FROM activities a
            LEFT JOIN users u ON a.assigned_user_id = u.id
            LEFT JOIN leads l ON a.lead_id = l.id
            LEFT JOIN customers c ON a.customer_id = c.id
            LEFT JOIN deals d ON a.deal_id = d.id
            ORDER BY a.activity_date DESC, a.activity_time DESC
            LIMIT 8
        """)

        # Upcoming followups (next 6)
        upcoming_followups = query_all("""
            SELECT f.id, f.followup_date, f.followup_time, f.purpose, f.priority, f.status,
                   u.full_name as assigned_user_name,
                   COALESCE(l.name, c.customer_name, 'Lead') as contact_name,
                   COALESCE(l.phone, c.phone, '') as phone
            FROM followups f
            LEFT JOIN users u ON f.assigned_user_id = u.id
            LEFT JOIN leads l ON f.lead_id = l.id
            LEFT JOIN customers c ON f.customer_id = c.id
            WHERE f.status = 'Pending' AND f.followup_date >= CURRENT_DATE
            ORDER BY f.followup_date ASC, f.followup_time ASC
            LIMIT 6
        """)

        return {
            'summary': {
                'total_leads': total_leads,
                'qualified_leads': qualified_leads,
                'total_customers': total_customers,
                'active_deals': active_deals,
                'won_deals': won_deals,
                'lost_deals': lost_deals,
                'pipeline_value': pipeline_value,
                'revenue': revenue
            },
            'lead_conversion': lead_stages,
            'deal_pipeline': deal_stages,
            'sales_performance': sales_performance,
            'recent_activities': recent_activities,
            'upcoming_followups': upcoming_followups
        }

    @staticmethod
    def get_lead_report(date_range='this_month', custom_from=None, custom_to=None, status=None, user_id=None):
        d1, d2 = ReportService.get_date_bounds(date_range, custom_from, custom_to)
        where_clauses = ["DATE(l.created_at) BETWEEN %s AND %s"]
        params = [d1, d2]

        if status:
            where_clauses.append("l.status = %s")
            params.append(status)
        if user_id:
            where_clauses.append("l.assigned_user_id = %s")
            params.append(user_id)

        where_sql = " AND ".join(where_clauses)

        by_status = query_all(f"""
            SELECT l.status, COUNT(*) as count, COALESCE(SUM(l.estimated_value), 0) as total_value
            FROM leads l WHERE {where_sql} GROUP BY l.status
        """, params)

        by_source = query_all(f"""
            SELECT l.source, COUNT(*) as count, COALESCE(SUM(l.estimated_value), 0) as total_value
            FROM leads l WHERE {where_sql} GROUP BY l.source
        """, params)

        by_salesperson = query_all(f"""
            SELECT COALESCE(u.full_name, 'Unassigned') as salesperson, COUNT(*) as count,
                   COALESCE(SUM(CASE WHEN l.status = 'Won' THEN 1 ELSE 0 END), 0) as won_count,
                   COALESCE(SUM(l.estimated_value), 0) as total_value
            FROM leads l
            LEFT JOIN users u ON l.assigned_user_id = u.id
            WHERE {where_sql}
            GROUP BY u.id, u.full_name
        """, params)

        details = query_all(f"""
            SELECT l.id, l.name, l.email, l.phone, l.company_name, l.source, l.industry,
                   l.status, l.priority, l.estimated_value, u.full_name as assigned_user,
                   DATE(l.created_at) as created_date
            FROM leads l
            LEFT JOIN users u ON l.assigned_user_id = u.id
            WHERE {where_sql}
            ORDER BY l.created_at DESC
        """, params)

        total_count = sum(item['count'] for item in by_status)
        won_count = sum(item['count'] for item in by_status if item['status'] == 'Won')
        conversion_rate = round((won_count * 100.0 / total_count), 2) if total_count > 0 else 0.0

        return {
            'date_bounds': {'from': str(d1), 'to': str(d2)},
            'total_leads': total_count,
            'conversion_rate': conversion_rate,
            'by_status': by_status,
            'by_source': by_source,
            'by_salesperson': by_salesperson,
            'details': details
        }

    @staticmethod
    def get_sales_report(date_range='this_month', custom_from=None, custom_to=None, stage=None, owner_id=None):
        d1, d2 = ReportService.get_date_bounds(date_range, custom_from, custom_to)
        where_clauses = ["(d.expected_closing_date BETWEEN %s AND %s OR DATE(d.created_at) BETWEEN %s AND %s)"]
        params = [d1, d2, d1, d2]

        if stage:
            where_clauses.append("d.stage = %s")
            params.append(stage)
        if owner_id:
            where_clauses.append("d.owner_id = %s")
            params.append(owner_id)

        where_sql = " AND ".join(where_clauses)

        by_stage = query_all(f"""
            SELECT d.stage, COUNT(*) as count, COALESCE(SUM(d.amount), 0) as total_amount,
                   COALESCE(SUM(d.amount * d.probability / 100.0), 0) as weighted_value
            FROM deals d WHERE {where_sql} GROUP BY d.stage
        """, params)

        details = query_all(f"""
            SELECT d.id, d.deal_name, COALESCE(c.customer_name, comp.name, 'N/A') as client_name,
                   d.amount, d.stage, d.probability, d.expected_closing_date,
                   (d.amount * d.probability / 100.0) as weighted_value,
                   u.full_name as owner_name, d.source
            FROM deals d
            LEFT JOIN customers c ON d.customer_id = c.id
            LEFT JOIN companies comp ON d.company_id = comp.id
            LEFT JOIN users u ON d.owner_id = u.id
            WHERE {where_sql}
            ORDER BY d.amount DESC
        """, params)

        total_deals = len(details)
        won_deals = len([d for d in details if d['stage'] == 'Closed Won'])
        lost_deals = len([d for d in details if d['stage'] == 'Closed Lost'])
        won_revenue = sum(float(d['amount']) for d in details if d['stage'] == 'Closed Won')
        pipeline_value = sum(float(d['amount']) for d in details if d['stage'] not in ('Closed Won', 'Closed Lost'))
        avg_deal_size = round(sum(float(d['amount']) for d in details) / total_deals, 2) if total_deals > 0 else 0.0

        return {
            'date_bounds': {'from': str(d1), 'to': str(d2)},
            'total_deals': total_deals,
            'won_deals': won_deals,
            'lost_deals': lost_deals,
            'won_revenue': won_revenue,
            'pipeline_value': pipeline_value,
            'avg_deal_size': avg_deal_size,
            'by_stage': by_stage,
            'details': details
        }

    @staticmethod
    def get_salesperson_report(date_range='this_month', custom_from=None, custom_to=None):
        d1, d2 = ReportService.get_date_bounds(date_range, custom_from, custom_to)
        
        performance = query_all("""
            SELECT u.id, u.full_name as salesperson, u.department,
                   COUNT(DISTINCT l.id) as assigned_leads,
                   COUNT(DISTINCT CASE WHEN l.status = 'Qualified' THEN l.id END) as qualified_leads,
                   COUNT(DISTINCT CASE WHEN l.status = 'Won' THEN l.id END) as won_leads,
                   COUNT(DISTINCT d.id) as total_deals,
                   COUNT(DISTINCT CASE WHEN d.stage = 'Closed Won' THEN d.id END) as won_deals,
                   COUNT(DISTINCT CASE WHEN d.stage = 'Closed Lost' THEN d.id END) as lost_deals,
                   COALESCE(SUM(CASE WHEN d.stage = 'Closed Won' THEN d.amount ELSE 0 END), 0) as revenue,
                   ROUND(
                       CASE WHEN COUNT(DISTINCT d.id) > 0
                            THEN (COUNT(DISTINCT CASE WHEN d.stage = 'Closed Won' THEN d.id END) * 100.0 / COUNT(DISTINCT d.id))
                            ELSE 0
                       END, 1
                   ) as conversion_rate
            FROM users u
            LEFT JOIN leads l ON l.assigned_user_id = u.id AND DATE(l.created_at) BETWEEN %s AND %s
            LEFT JOIN deals d ON d.owner_id = u.id AND (d.expected_closing_date BETWEEN %s AND %s OR DATE(d.created_at) BETWEEN %s AND %s)
            WHERE u.status = 'active' AND u.department != 'Audit & Compliance'
            GROUP BY u.id, u.full_name, u.department
            ORDER BY revenue DESC, won_deals DESC
        """, (d1, d2, d1, d2, d1, d2))

        return {
            'date_bounds': {'from': str(d1), 'to': str(d2)},
            'performance': performance
        }

    @staticmethod
    def get_customer_report(date_range='this_month', custom_from=None, custom_to=None):
        d1, d2 = ReportService.get_date_bounds(date_range, custom_from, custom_to)
        
        total_customers = query_one("SELECT COUNT(*) as count FROM customers")['count']
        new_customers = query_one("SELECT COUNT(*) as count FROM customers WHERE DATE(created_at) BETWEEN %s AND %s", (d1, d2))['count']
        active_customers = query_one("SELECT COUNT(*) as count FROM customers WHERE status = 'Active'")['count']

        by_industry = query_all("SELECT industry, COUNT(*) as count FROM customers WHERE industry != '' GROUP BY industry ORDER BY count DESC")
        by_type = query_all("SELECT customer_type, COUNT(*) as count FROM customers GROUP BY customer_type ORDER BY count DESC")

        details = query_all("""
            SELECT c.id, c.customer_name, c.email, c.phone, c.industry, c.customer_type, c.status,
                   u.full_name as owner_name, DATE(c.created_at) as created_date,
                   (SELECT COUNT(*) FROM deals d WHERE d.customer_id = c.id) as deals_count,
                   (SELECT COALESCE(SUM(d.amount), 0) FROM deals d WHERE d.customer_id = c.id AND d.stage = 'Closed Won') as total_revenue
            FROM customers c
            LEFT JOIN users u ON c.owner_id = u.id
            ORDER BY total_revenue DESC, c.created_at DESC
        """)

        return {
            'date_bounds': {'from': str(d1), 'to': str(d2)},
            'total_customers': total_customers,
            'new_customers': new_customers,
            'active_customers': active_customers,
            'by_industry': by_industry,
            'by_type': by_type,
            'details': details
        }
