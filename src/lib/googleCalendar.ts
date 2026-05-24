import { Todo } from '../types';

/**
 * Helper to compute start and end structures for Google Calendar Events.
 */
function getEventTimePayload(dateStr: string, timeStr?: string) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok';

  if (timeStr) {
    // Timed event
    const startDateTime = `${dateStr}T${timeStr}:00`;
    // Add 30 minutes duration for display/default
    const [h, m] = timeStr.split(':').map(Number);
    let endH = h;
    let endM = m + 30;
    if (endM >= 60) {
      endM -= 60;
      endH = (endH + 1) % 24;
    }
    const endFormattedStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    const endDateTime = `${dateStr}T${endFormattedStr}:00`;

    return {
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone }
    };
  } else {
    // All-day event (Exclusive end date in Google Calendar format)
    const nextDay = new Date(dateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    const endStr = nextDay.toISOString().split('T')[0];

    return {
      start: { date: dateStr },
      end: { date: endStr }
    };
  }
}

/**
 * Create an event in Google Calendar
 */
export async function createGoogleCalendarEvent(token: string, todo: Todo): Promise<string | null> {
  if (!todo.date) return null;
  
  const payload = {
    summary: `${todo.emoji || '📝'} ${todo.text}`,
    description: `แผนงาน\nหมวดหมู่: ${todo.project}\nความสำคัญ: ${todo.priority === 'high' ? '🔴 สูง' : '⚪ ทั่วไป'}`,
    ...getEventTimePayload(todo.date, todo.time),
    attendees: todo.attendees && todo.attendees.length > 0 ? todo.attendees.map(att => ({
      email: att.email,
      displayName: att.displayName || att.email.split('@')[0],
      responseStatus: att.responseStatus || 'needsAction'
    })) : undefined,
    reminders: todo.reminderMinutes !== undefined ? {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: todo.reminderMinutes }
      ]
    } : { useDefault: true }
  };

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error('Failed to create event in Google Calendar:', errorData);
      return null;
    }

    const data = await res.json();
    return data.id;
  } catch (err) {
    console.error('Error creating Google Calendar event:', err);
    return null;
  }
}

/**
 * Update an existing event in Google Calendar
 */
export async function updateGoogleCalendarEvent(token: string, todo: Todo): Promise<boolean> {
  if (!todo.date || !todo.googleEventId) return false;

  const payload = {
    summary: `${todo.emoji || '📝'} ${todo.text}`,
    description: `แผนงาน SleekTask\nหมวดหมู่: ${todo.project}\nสถานะ: ${todo.completed ? '✅ เสร็จสิ้น' : '⏳ กำลังดำเนินการ'}\nความสำคัญ: ${todo.priority === 'high' ? '🔴 สูง' : '⚪ ทั่วไป'}`,
    ...getEventTimePayload(todo.date, todo.time),
    attendees: todo.attendees && todo.attendees.length > 0 ? todo.attendees.map(att => ({
      email: att.email,
      displayName: att.displayName || att.email.split('@')[0],
      responseStatus: att.responseStatus || 'needsAction'
    })) : undefined,
    reminders: todo.reminderMinutes !== undefined ? {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: todo.reminderMinutes }
      ]
    } : { useDefault: true }
  };

  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${todo.googleEventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error('Failed to update event in Google Calendar:', errorData);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating Google Calendar event:', err);
    return false;
  }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(token: string, eventId: string): Promise<boolean> {
  try {
    // Explicit user confirmation must be handled in the calling UI layer, as required by the Workspace integration guidelines.
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 410) {
      // Already deleted on Google side
      return true;
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error('Failed to delete event from Google Calendar:', errorData);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting Google Calendar event:', err);
    return false;
  }
}

/**
 * Fetch events from Google Calendar to import into the app
 */
export async function fetchGoogleCalendarEvents(token: string): Promise<any[]> {
  try {
    const timeMin = new Date();
    // Fetch from 15 days ago to 60 days ahead to sync nicely
    timeMin.setDate(timeMin.getDate() - 15);
    
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&maxResults=100&singleEvents=true&orderBy=startTime`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error('Failed to fetch events from Google Calendar:', errorData);
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error('Error fetching events from Google Calendar:', err);
    return [];
  }
}
