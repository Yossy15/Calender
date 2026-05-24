export type Priority = 'normal' | 'high';

export interface Attendee {
  email: string;
  displayName?: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  project: string; // e.g., 'งานบริษัท UI/UX', 'ของใช้เข้าบ้าน', 'ออกกำลังกาย'
  time?: string; // e.g., "14:30"
  reminderMinutes?: number; // e.g., 15 (minutes before)
  userId: string;
  createdAt: string;
  completedAt?: string;
  date?: string; // Target scheduled calendar date (YYYY-MM-DD)
  syncStatus?: 'synced' | 'pending' | 'local';
  emoji?: string; // Customizable item emoji
  gifUrl?: string; // Customizable decoration image/gif URL
  color?: string; // Customizable task color
  googleEventId?: string; // Associated Google Calendar event ID
  attendees?: Attendee[]; // Associated attendees with status
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isDemo?: boolean;
}

export interface NotificationLog {
  id: string;
  todoId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ProjectCategory {
  id: string;
  name: string;
  color: string; // Hex color or Tailwind class
  icon?: string;
}

export type ActiveFilter = 'today' | 'planned' | 'important' | 'all' | string; // string represents specific project ID
