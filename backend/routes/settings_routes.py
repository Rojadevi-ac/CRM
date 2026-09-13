from flask import Blueprint, request, jsonify, g
from services.settings_service import SettingsService
from middleware.auth_middleware import token_required
from middleware.role_middleware import admin_required, write_permission_required

settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')

# -------------------------------------------------------------
# Company Settings (Organization CMS & Branding)
# -------------------------------------------------------------

@settings_bp.route('/company', methods=['GET'])
def get_company_settings():
    """Retrieve company settings for public branding and authenticated users."""
    settings = SettingsService.get_company_settings()
    return jsonify({'success': True, 'data': settings}), 200

@settings_bp.route('/company', methods=['PUT'])
@token_required
@admin_required
@write_permission_required
def update_company_settings():
    """Update organization details (Admin only)."""
    data = request.get_json() or {}
    updated, err = SettingsService.update_company_settings(data, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({
        'success': True,
        'data': updated,
        'message': 'Company settings updated successfully'
    }), 200

@settings_bp.route('/company/logo', methods=['POST'])
@token_required
@admin_required
@write_permission_required
def upload_company_logo():
    """Upload company logo (Admin only)."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No logo file provided in request'}), 400

    file = request.files['file']
    updated, err = SettingsService.upload_company_logo(file, g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({
        'success': True,
        'data': updated,
        'message': 'Company logo uploaded successfully'
    }), 200

@settings_bp.route('/company/logo', methods=['DELETE'])
@token_required
@admin_required
@write_permission_required
def remove_company_logo():
    """Remove company logo (Admin only)."""
    updated, err = SettingsService.remove_company_logo(g.current_user['id'])
    if err:
        return jsonify({'success': False, 'message': err}), 400

    return jsonify({
        'success': True,
        'data': updated,
        'message': 'Company logo removed successfully'
    }), 200

# -------------------------------------------------------------
# User Preferences (Themes, Density, Personalization)
# -------------------------------------------------------------

@settings_bp.route('/preferences', methods=['GET'])
@token_required
def get_user_preferences():
    """Get theme and UI preferences for the currently logged-in user."""
    prefs = SettingsService.get_user_preferences(g.current_user['id'])
    return jsonify({'success': True, 'data': prefs}), 200

@settings_bp.route('/preferences', methods=['PUT'])
@token_required
def update_user_preferences():
    """Update theme and UI preferences for the currently logged-in user."""
    data = request.get_json() or {}
    prefs = SettingsService.update_user_preferences(g.current_user['id'], data)
    return jsonify({
        'success': True,
        'data': prefs,
        'message': 'Theme preferences saved successfully'
    }), 200
