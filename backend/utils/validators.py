import re

def is_valid_email(email):
    if not email or not isinstance(email, str):
        return False
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return bool(re.match(pattern, email.strip()))

def is_valid_phone(phone):
    if not phone or not isinstance(phone, str):
        return True # Optional
    # Allow numbers, spaces, plus, hyphens, parentheses
    pattern = r'^[\d\s\+\-\(\)]{7,25}$'
    return bool(re.match(pattern, phone.strip()))

def validate_required_fields(data, required_fields):
    missing = []
    for field in required_fields:
        if field not in data or data[field] is None or (isinstance(data[field], str) and data[field].strip() == ''):
            missing.append(field)
    return missing
