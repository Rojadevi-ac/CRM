import os
import uuid
from werkzeug.utils import secure_filename
from config.config import config

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS

def save_avatar_file(file):
    if not file or file.filename == '':
        return None, "No file selected"
    
    if not allowed_file(file.filename):
        return None, f"File type not allowed. Allowed types: {', '.join(config.ALLOWED_EXTENSIONS)}"
    
    os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
    
    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"avatar_{uuid.uuid4().hex[:12]}.{ext}"
    file_path = os.path.join(config.UPLOAD_FOLDER, unique_filename)
    
    file.save(file_path)
    
    # URL path to be returned
    url_path = f"/uploads/profile_pictures/{unique_filename}"
    return url_path, None

def remove_avatar_file(avatar_url):
    if not avatar_url:
        return
    try:
        filename = os.path.basename(avatar_url)
        file_path = os.path.join(config.UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Error removing avatar file: {e}")
