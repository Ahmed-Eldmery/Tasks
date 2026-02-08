export interface Task {
  id: string;
  content: string;
  isCompleted: boolean;
  durationSeconds: number;
  isTimerRunning: boolean;
  date: string; // YYYY-MM-DD format
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export interface ScheduleMark {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: string; // 'college'
  created_at?: string;
  userEmail?: string;
  userName?: string;
}

export interface AppSettings {
  id: string;
  key: string;
  value: string;
}