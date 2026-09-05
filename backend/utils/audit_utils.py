import json
from flask import request
from config.database import execute_query

def log_audit(user_id, action, module, record_id=None, old_value=None, new_value=None):
    try:
        ip_address = request.remote_addr if request else '127.0.0.1'
        old_val_json = json.dumps(old_value, default=str) if old_value is not None else None
        new_val_json = json.dumps(new_value, default=str) if new_value is not None else None

        sql = """
            INSERT INTO audit_logs (user_id, action, module, record_id, old_value, new_value, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        execute_query(sql, (user_id, action, module, record_id, old_val_json, new_val_json, ip_address))
    except Exception as e:
        print(f"Failed to write audit log: {e}")
