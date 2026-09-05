from config.database import query_all, query_one, execute_query
from utils.audit_utils import log_audit
from sockets.socket_events import emit_event

class ProductService:
    @staticmethod
    def get_products(status=None, category=None, search=None):
        where_clauses = ["1=1"]
        params = []

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        if category:
            where_clauses.append("category = %s")
            params.append(category)

        if search:
            where_clauses.append("(name LIKE %s OR description LIKE %s)")
            term = f"%{search.strip()}%"
            params.extend([term, term])

        sql = f"SELECT id, name, category, description, price, tax_rate, status, created_at FROM products WHERE {' AND '.join(where_clauses)} ORDER BY name ASC"
        return query_all(sql, params)

    @staticmethod
    def get_product_by_id(product_id):
        return query_one("SELECT * FROM products WHERE id = %s", (product_id,))

    @staticmethod
    def create_product(data, current_user_id):
        sql = """
            INSERT INTO products (name, category, description, price, tax_rate, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        product_id = execute_query(sql, (
            data['name'].strip(),
            data.get('category', 'General'),
            data.get('description', ''),
            float(data.get('price', 0.0)),
            float(data.get('tax_rate', 18.0)),
            data.get('status', 'Active')
        ))

        new_prod = ProductService.get_product_by_id(product_id)
        log_audit(current_user_id, 'CREATE_PRODUCT', 'products', product_id, None, new_prod)
        emit_event('product_created', new_prod)
        return new_prod

    @staticmethod
    def update_product(product_id, data, current_user_id):
        old_prod = ProductService.get_product_by_id(product_id)
        if not old_prod:
            return None, "Product not found"

        sql = """
            UPDATE products SET
                name = COALESCE(%s, name),
                category = COALESCE(%s, category),
                description = COALESCE(%s, description),
                price = COALESCE(%s, price),
                tax_rate = COALESCE(%s, tax_rate),
                status = COALESCE(%s, status)
            WHERE id = %s
        """
        execute_query(sql, (
            data.get('name'),
            data.get('category'),
            data.get('description'),
            data.get('price'),
            data.get('tax_rate'),
            data.get('status'),
            product_id
        ))

        updated_prod = ProductService.get_product_by_id(product_id)
        log_audit(current_user_id, 'UPDATE_PRODUCT', 'products', product_id, old_prod, updated_prod)
        emit_event('product_updated', updated_prod)
        return updated_prod, None

    @staticmethod
    def delete_product(product_id, current_user_id):
        prod = ProductService.get_product_by_id(product_id)
        if not prod:
            return False, "Product not found"

        execute_query("DELETE FROM products WHERE id = %s", (product_id,))
        log_audit(current_user_id, 'DELETE_PRODUCT', 'products', product_id, prod, None)
        emit_event('product_deleted', {'id': product_id})
        return True, None
