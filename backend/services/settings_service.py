import json
from config.database import query_one, execute_query
from utils.audit_utils import log_audit
from utils.file_utils import save_logo_file, remove_logo_file
from sockets.socket_events import emit_event

class SettingsService:
    @staticmethod
    def get_company_settings():
        """Retrieve active company settings record or create default if none exists."""
        settings = query_one("SELECT * FROM company_settings ORDER BY id ASC LIMIT 1")
        if not settings:
            execute_query("""
                INSERT INTO company_settings (
                    company_name, legal_name, display_name, email, phone, website,
                    address_line_1, city, state, country, postal_code, currency, timezone, date_format,
                    contact_person, description
                ) VALUES (
                    'Enterprise CRM Inc.', 'Enterprise CRM Technologies Private Limited', 'Enterprise CRM',
                    'contact@enterprisecrm.io', '+1 (555) 019-2834', 'https://enterprisecrm.io',
                    '100 Innovation Boulevard, Suite 400', 'San Francisco', 'CA', 'United States',
                    '94105', 'USD', 'America/Los_Angeles', 'MM/DD/YYYY', 'Chief Operations Officer',
                    'Next-generation intelligent CRM platform powering modern high-velocity revenue teams.'
                )
            """)
            settings = query_one("SELECT * FROM company_settings ORDER BY id ASC LIMIT 1")
        return settings

    @staticmethod
    def update_company_settings(data, current_user_id):
        """Update company settings (Admin only)."""
        current_settings = SettingsService.get_company_settings()
        
        company_name = data.get('company_name')
        if not company_name or not str(company_name).strip():
            return None, "Company Name is required"

        sql = """
            UPDATE company_settings SET
                company_name = %s,
                legal_name = %s,
                display_name = %s,
                email = %s,
                phone = %s,
                alternate_phone = %s,
                website = %s,
                address_line_1 = %s,
                address_line_2 = %s,
                city = %s,
                state = %s,
                country = %s,
                postal_code = %s,
                tax_number = %s,
                registration_number = %s,
                currency = %s,
                timezone = %s,
                date_format = %s,
                contact_person = %s,
                description = %s
            WHERE id = %s
        """
        
        execute_query(sql, (
            company_name.strip(),
            data.get('legal_name'),
            data.get('display_name', company_name.strip()),
            data.get('email'),
            data.get('phone'),
            data.get('alternate_phone'),
            data.get('website'),
            data.get('address_line_1'),
            data.get('address_line_2'),
            data.get('city'),
            data.get('state'),
            data.get('country', 'India'),
            data.get('postal_code'),
            data.get('tax_number'),
            data.get('registration_number'),
            data.get('currency', 'USD'),
            data.get('timezone', 'UTC'),
            data.get('date_format', 'MM/DD/YYYY'),
            data.get('contact_person'),
            data.get('description'),
            current_settings['id']
        ))

        updated_settings = SettingsService.get_company_settings()
        log_audit(current_user_id, 'UPDATE_COMPANY_SETTINGS', 'company_settings', current_settings['id'], current_settings, updated_settings)
        emit_event('company_settings_updated', updated_settings)
        return updated_settings, None

    @staticmethod
    def upload_company_logo(file, current_user_id):
        """Upload and update company logo (Admin only)."""
        current_settings = SettingsService.get_company_settings()
        
        url_path, err = save_logo_file(file)
        if err:
            return None, err

        # Remove old logo file if present
        if current_settings.get('logo_url'):
            remove_logo_file(current_settings['logo_url'])

        execute_query("UPDATE company_settings SET logo_url = %s WHERE id = %s", (url_path, current_settings['id']))
        updated_settings = SettingsService.get_company_settings()
        
        log_audit(current_user_id, 'UPLOAD_COMPANY_LOGO', 'company_settings', current_settings['id'], current_settings, updated_settings)
        emit_event('company_settings_updated', updated_settings)
        return updated_settings, None

    @staticmethod
    def remove_company_logo(current_user_id):
        """Remove company logo (Admin only)."""
        current_settings = SettingsService.get_company_settings()
        
        if current_settings.get('logo_url'):
            remove_logo_file(current_settings['logo_url'])
            execute_query("UPDATE company_settings SET logo_url = NULL WHERE id = %s", (current_settings['id'],))
        
        updated_settings = SettingsService.get_company_settings()
        log_audit(current_user_id, 'REMOVE_COMPANY_LOGO', 'company_settings', current_settings['id'], current_settings, updated_settings)
        emit_event('company_settings_updated', updated_settings)
        return updated_settings, None

    @staticmethod
    def get_user_preferences(user_id):
        """Retrieve user-specific theme and interface preferences."""
        prefs = query_one("SELECT * FROM user_preferences WHERE user_id = %s", (user_id,))
        if not prefs:
            return {
                'user_id': user_id,
                'theme_mode': 'system',
                'theme_template': 'classic-blue',
                'accent_color': '#2563eb',
                'sidebar_behavior': 'expanded',
                'ui_density': 'comfortable',
                'border_radius': 'medium',
                'custom_theme': None
            }
        
        if isinstance(prefs.get('custom_theme'), str):
            try:
                prefs['custom_theme'] = json.loads(prefs['custom_theme'])
            except Exception:
                pass
        return prefs

    @staticmethod
    def update_user_preferences(user_id, data):
        """Upsert user-specific theme and interface preferences."""
        theme_mode = data.get('theme_mode', 'system')
        theme_template = data.get('theme_template', 'classic-blue')
        accent_color = data.get('accent_color', '#2563eb')
        sidebar_behavior = data.get('sidebar_behavior', 'expanded')
        ui_density = data.get('ui_density', 'comfortable')
        border_radius = data.get('border_radius', 'medium')
        
        custom_theme = data.get('custom_theme')
        if custom_theme is not None and not isinstance(custom_theme, str):
            custom_theme_json = json.dumps(custom_theme)
        else:
            custom_theme_json = custom_theme

        existing = query_one("SELECT id FROM user_preferences WHERE user_id = %s", (user_id,))
        if existing:
            sql = """
                UPDATE user_preferences SET
                    theme_mode = %s,
                    theme_template = %s,
                    accent_color = %s,
                    sidebar_behavior = %s,
                    ui_density = %s,
                    border_radius = %s,
                    custom_theme = %s
                WHERE user_id = %s
            """
            execute_query(sql, (
                theme_mode, theme_template, accent_color,
                sidebar_behavior, ui_density, border_radius,
                custom_theme_json, user_id
            ))
        else:
            sql = """
                INSERT INTO user_preferences (
                    user_id, theme_mode, theme_template, accent_color,
                    sidebar_behavior, ui_density, border_radius, custom_theme
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            execute_query(sql, (
                user_id, theme_mode, theme_template, accent_color,
                sidebar_behavior, ui_density, border_radius, custom_theme_json
            ))

        return SettingsService.get_user_preferences(user_id)
