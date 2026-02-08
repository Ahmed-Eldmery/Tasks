import { Task } from '../types';

// Service disabled as report feature was removed
export const generateDailyReport = async (tasks: Task[], senderName: string, dateStr?: string): Promise<string> => {
  return "";
};