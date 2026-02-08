import { supabase } from './supabaseClient';
import { ScheduleMark, AppSettings } from '../types';

export const scheduleService = {
    // Get Schedule Image URL
    async getScheduleUrl(): Promise<string | null> {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'schedule_url')
            .single();

        if (error) return null;
        return data?.value || null;
    },

    // Set Schedule Image URL (HR Only)
    async setScheduleUrl(url: string) {
        // Upsert equivalent if key is PK
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'schedule_url', value: url }, { onConflict: 'key' });

        if (error) throw error;
    },

    // Get marks for a date (for UI display - e.g. HR view)
    async getMarks(date: string) {
        const { data, error } = await supabase
            .from('calendar_marks')
            .select(`
        *,
        profiles (email)
      `)
            .eq('date', date);

        if (error) throw error;

        return data.map((m: any) => ({
            id: m.id,
            user_id: m.user_id,
            date: m.date,
            type: m.type,
            userEmail: m.profiles?.email
        }));
    },

    // Get mark for current user on a specific date (for Team Member)
    async getMyMark(date: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('calendar_marks')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', date)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            user_id: data.user_id,
            date: data.date,
            type: data.type
        } as ScheduleMark;
    },

    // Mark/Unmark
    async toggleMark(date: string, type: string = 'college') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');

        // Check existing
        const existing = await this.getMyMark(date);

        if (existing) {
            if (existing.type === type) {
                // Toggle off
                const { error } = await supabase
                    .from('calendar_marks')
                    .delete()
                    .eq('id', existing.id);
                if (error) throw error;
                return null; // Removed
            } else {
                // Update type (if user wants to change from 'college' to 'sick' etc, though we only have college now)
                const { error } = await supabase
                    .from('calendar_marks')
                    .update({ type })
                    .eq('id', existing.id);
                if (error) throw error;
                return { ...existing, type };
            }
        } else {
            // Create
            const { data, error } = await supabase
                .from('calendar_marks')
                .insert({
                    user_id: user.id,
                    date,
                    type
                })
                .select()
                .single();

            if (error) throw error;
            return {
                id: data.id,
                user_id: data.user_id,
                date: data.date,
                type: data.type
            } as ScheduleMark;
        }
    }
};
