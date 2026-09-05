from config.database import query_all, query_one, execute_query
from utils.audit_utils import log_audit
from sockets.socket_events import emit_event

class DealService:
    STAGE_PROBABILITIES = {
        'Qualification': 20,
        'Proposal': 50,
        'Negotiation': 75,
        'Closed Won': 100,
        'Closed Lost': 0
    }

    @staticmethod
    def get_deals(page=1, limit=20, search=None, stage=None, owner_id=None, customer_id=None, date_from=None, date_to=None, sort_by='id', sort_dir='DESC'):
        offset = (page - 1) * limit
        where_clauses = ["1=1"]
        params = []

        if search:
            where_clauses.append("(d.deal_name LIKE %s OR c.customer_name LIKE %s OR comp.name LIKE %s)")
            term = f"%{search.strip()}%"
            params.extend([term, term, term])

        if stage:
            where_clauses.append("d.stage = %s")
            params.append(stage)

        if owner_id:
            where_clauses.append("d.owner_id = %s")
            params.append(owner_id)

        if customer_id:
            where_clauses.append("d.customer_id = %s")
            params.append(customer_id)

        if date_from:
            where_clauses.append("d.expected_closing_date >= %s")
            params.append(date_from)

        if date_to:
            where_clauses.append("d.expected_closing_date <= %s")
            params.append(date_to)

        where_sql = " AND ".join(where_clauses)
        valid_cols = {'id': 'd.id', 'deal_name': 'd.deal_name', 'amount': 'd.amount', 'stage': 'd.stage', 'expected_closing_date': 'd.expected_closing_date'}
        order_col = valid_cols.get(sort_by, 'd.id')
        order_direction = 'ASC' if str(sort_dir).upper() == 'ASC' else 'DESC'

        count_sql = f"""
            SELECT COUNT(*) as total 
            FROM deals d 
            LEFT JOIN customers c ON d.customer_id = c.id
            LEFT JOIN companies comp ON d.company_id = comp.id
            WHERE {where_sql}
        """
        count_res = query_one(count_sql, params)
        total = count_res['total'] if count_res else 0

        data_sql = f"""
            SELECT d.id, d.deal_name, d.customer_id, d.lead_id, d.company_id,
                   d.amount, d.stage, d.probability, d.expected_closing_date,
                   d.owner_id, d.source, d.created_at, d.updated_at,
                   (d.amount * d.probability / 100.0) as weighted_value,
                   c.customer_name,
                   comp.name as company_name,
                   l.name as lead_name,
                   u.full_name as owner_name, u.avatar_url as owner_avatar
            FROM deals d
            LEFT JOIN customers c ON d.customer_id = c.id
            LEFT JOIN companies comp ON d.company_id = comp.id
            LEFT JOIN leads l ON d.lead_id = l.id
            LEFT JOIN users u ON d.owner_id = u.id
            WHERE {where_sql}
            ORDER BY {order_col} {order_direction}
            LIMIT %s OFFSET %s
        """
        data_params = list(params) + [limit, offset]
        deals = query_all(data_sql, data_params)

        return {
            'deals': deals,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit if limit > 0 else 1
            }
        }

    @staticmethod
    def get_deal_by_id(deal_id):
        deal = query_one("""
            SELECT d.id, d.deal_name, d.customer_id, d.lead_id, d.company_id,
                   d.amount, d.stage, d.probability, d.expected_closing_date,
                   d.owner_id, d.source, d.created_at, d.updated_at,
                   (d.amount * d.probability / 100.0) as weighted_value,
                   c.customer_name, c.email as customer_email,
                   comp.name as company_name,
                   l.name as lead_name,
                   u.full_name as owner_name, u.email as owner_email, u.avatar_url as owner_avatar
            FROM deals d
            LEFT JOIN customers c ON d.customer_id = c.id
            LEFT JOIN companies comp ON d.company_id = comp.id
            LEFT JOIN leads l ON d.lead_id = l.id
            LEFT JOIN users u ON d.owner_id = u.id
            WHERE d.id = %s
        """, (deal_id,))

        if not deal:
            return None

        # Deal items
        deal['items'] = query_all("""
            SELECT id, product_id, product_name, quantity, unit_price, tax_rate, discount_percent, total_price
            FROM deal_items WHERE deal_id = %s
        """, (deal_id,))

        return deal

    @staticmethod
    def create_deal(data, current_user_id):
        stage = data.get('stage', 'Qualification')
        prob = data.get('probability', DealService.STAGE_PROBABILITIES.get(stage, 20))
        amt = float(data.get('amount', 0.00))

        sql = """
            INSERT INTO deals (deal_name, customer_id, lead_id, company_id, amount, stage, probability, expected_closing_date, owner_id, source)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        deal_id = execute_query(sql, (
            data['deal_name'].strip(),
            data.get('customer_id'),
            data.get('lead_id'),
            data.get('company_id'),
            amt,
            stage,
            prob,
            data.get('expected_closing_date'),
            data.get('owner_id', current_user_id),
            data.get('source', 'Organic')
        ))

        # Insert deal items if provided
        items = data.get('items', [])
        for itm in items:
            total_price = float(itm.get('quantity', 1)) * float(itm.get('unit_price', 0)) * (1 - float(itm.get('discount_percent', 0)) / 100.0) * (1 + float(itm.get('tax_rate', 18)) / 100.0)
            execute_query("""
                INSERT INTO deal_items (deal_id, product_id, product_name, quantity, unit_price, tax_rate, discount_percent, total_price)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                deal_id,
                itm.get('product_id'),
                itm.get('product_name', 'Product/Service'),
                itm.get('quantity', 1),
                itm.get('unit_price', 0),
                itm.get('tax_rate', 18.0),
                itm.get('discount_percent', 0.0),
                total_price
            ))

        new_deal = DealService.get_deal_by_id(deal_id)
        log_audit(current_user_id, 'CREATE_DEAL', 'deals', deal_id, None, new_deal)
        emit_event('deal_created', new_deal)
        return new_deal

    @staticmethod
    def _parse_id(val):
        if val is None or str(val).strip() in ('', 'null', 'undefined', 'None'):
            return None
        try:
            return int(val)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def update_deal(deal_id, data, current_user_id):
        old_deal = DealService.get_deal_by_id(deal_id)
        if not old_deal:
            return None, "Deal not found"

        stage = data.get('stage', old_deal['stage'])
        if stage == 'Closed Lost':
            prob = 0
        elif stage == 'Closed Won':
            prob = 100
        else:
            prob = int(data.get('probability', DealService.STAGE_PROBABILITIES.get(stage, old_deal['probability'])))

        deal_name = data.get('deal_name', old_deal['deal_name']).strip()
        customer_id = DealService._parse_id(data.get('customer_id')) if 'customer_id' in data else old_deal.get('customer_id')
        lead_id = DealService._parse_id(data.get('lead_id')) if 'lead_id' in data else old_deal.get('lead_id')
        company_id = DealService._parse_id(data.get('company_id')) if 'company_id' in data else old_deal.get('company_id')
        amount = float(data.get('amount', old_deal['amount']))
        expected_closing_date = data.get('expected_closing_date') or old_deal.get('expected_closing_date')
        if expected_closing_date == '':
            expected_closing_date = None
        owner_id = DealService._parse_id(data.get('owner_id')) if 'owner_id' in data else old_deal.get('owner_id')
        source = data.get('source', old_deal.get('source') or 'Organic')

        sql = """
            UPDATE deals SET
                deal_name = %s,
                customer_id = %s,
                lead_id = %s,
                company_id = %s,
                amount = %s,
                stage = %s,
                probability = %s,
                expected_closing_date = %s,
                owner_id = %s,
                source = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        execute_query(sql, (
            deal_name,
            customer_id,
            lead_id,
            company_id,
            amount,
            stage,
            prob,
            expected_closing_date,
            owner_id,
            source,
            deal_id
        ))

        # Update items if provided
        if 'items' in data:
            execute_query("DELETE FROM deal_items WHERE deal_id = %s", (deal_id,))
            for itm in data['items']:
                total_price = float(itm.get('quantity', 1)) * float(itm.get('unit_price', 0)) * (1 - float(itm.get('discount_percent', 0)) / 100.0) * (1 + float(itm.get('tax_rate', 18)) / 100.0)
                execute_query("""
                    INSERT INTO deal_items (deal_id, product_id, product_name, quantity, unit_price, tax_rate, discount_percent, total_price)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    deal_id,
                    itm.get('product_id'),
                    itm.get('product_name', 'Product/Service'),
                    itm.get('quantity', 1),
                    itm.get('unit_price', 0),
                    itm.get('tax_rate', 18.0),
                    itm.get('discount_percent', 0.0),
                    total_price
                ))

        updated_deal = DealService.get_deal_by_id(deal_id)
        log_audit(current_user_id, 'UPDATE_DEAL', 'deals', deal_id, old_deal, updated_deal)

        # Sync linked lead
        if updated_deal.get('lead_id'):
            if stage == 'Closed Lost':
                execute_query("UPDATE leads SET status = 'Lost' WHERE id = %s", (updated_deal['lead_id'],))
                from services.lead_service import LeadService
                lead = LeadService.get_lead_by_id(updated_deal['lead_id'])
                if lead:
                    emit_event('lead_status_changed', lead)
            elif stage == 'Closed Won':
                execute_query("UPDATE leads SET status = 'Won' WHERE id = %s", (updated_deal['lead_id'],))
                from services.lead_service import LeadService
                lead = LeadService.get_lead_by_id(updated_deal['lead_id'])
                if lead:
                    emit_event('lead_status_changed', lead)

        if old_deal['stage'] != updated_deal['stage']:
            emit_event('deal_stage_changed', updated_deal)
        else:
            emit_event('deal_updated', updated_deal)

        return updated_deal, None

    @staticmethod
    def update_stage(deal_id, new_stage, current_user_id):
        old_deal = DealService.get_deal_by_id(deal_id)
        if not old_deal:
            return None, "Deal not found"

        new_prob = 0 if new_stage == 'Closed Lost' else (100 if new_stage == 'Closed Won' else DealService.STAGE_PROBABILITIES.get(new_stage, old_deal['probability']))
        execute_query("UPDATE deals SET stage = %s, probability = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s", (new_stage, new_prob, deal_id))
        
        updated_deal = DealService.get_deal_by_id(deal_id)

        # Sync linked lead
        if updated_deal.get('lead_id'):
            if new_stage == 'Closed Lost':
                execute_query("UPDATE leads SET status = 'Lost' WHERE id = %s", (updated_deal['lead_id'],))
                from services.lead_service import LeadService
                lead = LeadService.get_lead_by_id(updated_deal['lead_id'])
                if lead:
                    emit_event('lead_status_changed', lead)
            elif new_stage == 'Closed Won':
                execute_query("UPDATE leads SET status = 'Won' WHERE id = %s", (updated_deal['lead_id'],))
                from services.lead_service import LeadService
                lead = LeadService.get_lead_by_id(updated_deal['lead_id'])
                if lead:
                    emit_event('lead_status_changed', lead)

        # Log activity
        act_sql = """
            INSERT INTO activities (activity_type, subject, description, deal_id, assigned_user_id, created_by_id, activity_date, activity_time, status)
            VALUES ('Other', 'Deal Stage Changed', %s, %s, %s, %s, CURRENT_DATE, CURRENT_TIME, 'Completed')
        """
        execute_query(act_sql, (f"Deal stage changed from '{old_deal['stage']}' to '{new_stage}'", deal_id, updated_deal.get('owner_id'), current_user_id))

        log_audit(current_user_id, 'STAGE_CHANGE', 'deals', deal_id, {'stage': old_deal['stage']}, {'stage': new_stage})
        emit_event('deal_stage_changed', updated_deal)
        return updated_deal, None

    @staticmethod
    def delete_deal(deal_id, current_user_id):
        deal = DealService.get_deal_by_id(deal_id)
        if not deal:
            return False, "Deal not found"

        execute_query("DELETE FROM deals WHERE id = %s", (deal_id,))
        log_audit(current_user_id, 'DELETE_DEAL', 'deals', deal_id, deal, None)
        emit_event('deal_deleted', {'id': deal_id})
        return True, None
