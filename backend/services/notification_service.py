from config.database import query_all, query_one, execute_query

class NotificationService:
    @staticmethod
    def get_user_notifications(user_id, limit=30):
        notifications = query_all("""
            SELECT id, user_id, title, message, type, entity_type, entity_id, is_read, created_at
            FROM notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (user_id, limit))

        unread_count_res = query_one("""
            SELECT COUNT(*) as unread_count
            FROM notifications
            WHERE user_id = %s AND is_read = FALSE
        """, (user_id,))
        
        unread_count = unread_count_res['unread_count'] if unread_count_res else 0

        return {
            'notifications': notifications,
            'unread_count': unread_count
        }

    @staticmethod
    def mark_as_read(notification_id, user_id):
        execute_query("UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s", (notification_id, user_id))
        return True

    @staticmethod
    def mark_all_as_read(user_id):
        execute_query("UPDATE notifications SET is_read = TRUE WHERE user_id = %s", (user_id,))
        return True

    @staticmethod
    def delete_notification(notification_id, user_id):
        execute_query("DELETE FROM notifications WHERE id = %s AND user_id = %s", (notification_id, user_id))
        return True
