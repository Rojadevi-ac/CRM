/**
 * CRM Date & Time Formatting Utilities (12-Hour Format)
 */

/**
 * Format time string (HH:MM:SS, HH:MM, or ISO) to 12-hour format with AM/PM (e.g., "10:30 AM")
 */
export function formatTime12Hour(timeValue) {
  if (!timeValue) return '—';

  // If timeValue is a standard time string like "14:30:00" or "09:15"
  if (typeof timeValue === 'string' && timeValue.includes(':') && !timeValue.includes('T')) {
    const parts = timeValue.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1] ? parts[1].padStart(2, '0') : '00';
    if (isNaN(hours)) return timeValue;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  }

  // If timeValue is an ISO string or Date object
  try {
    const date = new Date(timeValue);
    if (isNaN(date.getTime())) return String(timeValue);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return String(timeValue);
  }
}

/**
 * Format datetime to "MMM DD, YYYY, hh:mm AM/PM"
 */
export function formatDateTime12Hour(dateTimeValue) {
  if (!dateTimeValue) return '—';
  try {
    const date = new Date(dateTimeValue);
    if (isNaN(date.getTime())) return String(dateTimeValue);
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return String(dateTimeValue);
  }
}

/**
 * Format date to "MMM DD, YYYY"
 */
export function formatDate(dateValue) {
  if (!dateValue) return '—';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(dateValue);
  }
}

/**
 * Get current local time formatted for <input type="time" /> (HH:MM)
 */
export function getCurrentTimeInput() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get current local date formatted for <input type="date" /> (YYYY-MM-DD)
 */
export function getCurrentDateInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
