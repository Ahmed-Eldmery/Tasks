import { supabase } from './supabaseClient';
import { Task } from '../types';

export const taskService = {
    async fetchTasks(date: string) {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('date', date)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map DB snake_case to TS camelCase if needed, 
        // but better to align types. For now manual mapping:
        return data.map((t: any) => ({
            id: t.id,
            content: t.content,
            isCompleted: t.is_completed,
            durationSeconds: t.duration_seconds,
            isTimerRunning: t.is_timer_running,
            date: t.date,
            userId: t.user_id
        })) as Task[];
    },

    async fetchAllTasksForHR(date: string) {
        // HR sees ALL tasks for a date, joined with profile info
        const { data, error } = await supabase
            .from('tasks')
            .select(`
            *,
            profiles (email, role)
        `)
            .eq('date', date)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((t: any) => ({
            id: t.id,
            content: t.content,
            isCompleted: t.is_completed,
            durationSeconds: t.duration_seconds,
            isTimerRunning: t.is_timer_running,
            date: t.date,
            userId: t.user_id,
            userEmail: t.profiles?.email
        }));
    },

    async createTask(task: Partial<Task>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                content: task.content,
                user_id: user.id,
                date: task.date,
                is_completed: task.isCompleted || false,
                duration_seconds: task.durationSeconds || 0,
                is_timer_running: false
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            content: data.content,
            isCompleted: data.is_completed,
            durationSeconds: data.duration_seconds,
            isTimerRunning: data.is_timer_running,
            date: data.date,
            userId: data.user_id
        } as Task;
    },

    async updateTask(id: string, updates: Partial<Task>) {
        // Convert camelCase to snake_case for DB
        const dbUpdates: any = {};
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;
        if (updates.durationSeconds !== undefined) dbUpdates.duration_seconds = updates.durationSeconds;
        if (updates.isTimerRunning !== undefined) dbUpdates.is_timer_running = updates.isTimerRunning;

        const { error } = await supabase
            .from('tasks')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteTask(id: string) {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
