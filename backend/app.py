import os
import datetime
from decimal import Decimal
from flask import Flask, send_from_directory, jsonify
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from config.config import config
from sockets.socket_events import socketio, register_socket_events

# Custom JSON Provider to handle date, time, timedelta, and Decimal
class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, datetime.timedelta):
            total_seconds = int(obj.total_seconds())
            hours = (total_seconds // 3600) % 24
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            # Return HH:MM:SS
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        if isinstance(obj, datetime.time):
            return obj.strftime("%H:%M:%S")
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

# Import routes
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.lead_routes import lead_bp
from routes.customer_routes import customer_bp
from routes.company_routes import company_bp
from routes.contact_routes import contact_bp
from routes.deal_routes import deal_bp
from routes.activity_routes import activity_bp
from routes.task_routes import task_bp
from routes.followup_routes import followup_bp
from routes.product_routes import product_bp
from routes.notification_routes import notification_bp
from routes.search_routes import search_bp
from routes.report_routes import report_bp
from routes.audit_routes import audit_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(config)
    app.json = CustomJSONProvider(app)

    # Enable CORS
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Ensure uploads folder exists
    os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(lead_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(company_bp)
    app.register_blueprint(contact_bp)
    app.register_blueprint(deal_bp)
    app.register_blueprint(activity_bp)
    app.register_blueprint(task_bp)
    app.register_blueprint(followup_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(audit_bp)

    # Serve static uploaded files (e.g. avatars)
    @app.route('/uploads/profile_pictures/<filename>')
    def serve_avatar(filename):
        return send_from_directory(config.UPLOAD_FOLDER, filename)

    # Health check
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'app': 'RD-CRM Backend API',
            'version': '1.0.0'
        })

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'message': 'Resource not found'}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'success': False, 'message': 'Internal server error occurred'}), 500

    # Initialize sockets
    register_socket_events(app)

    return app

app = create_app()

if __name__ == '__main__':
    print("Starting RD-CRM Backend on port 5000 with Socket.IO...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
