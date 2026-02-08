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

        if (error) return '/schedule.jpeg'; // Return local default if error
        return data?.value || '/schedule.jpeg'; // Return local default if null
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
        // 1. Get Marks
        const { data: marks, error: marksError } = await supabase
            .from('calendar_marks')
            .select('*')
            .eq('date', date);

        if (marksError) throw marksError;
        if (!marks || marks.length === 0) return [];

        // 2. Get Profiles
        const userIds = marks.map((m: any) => m.user_id);
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, name')
            .in('id', userIds);

        if (profilesError) throw profilesError;

        // 3. Map together
        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

        return marks.map((m: any) => {
            const profile = profileMap.get(m.user_id);
            return {
                id: m.id,
                user_id: m.user_id,
                date: m.date,
                type: m.type,
                userEmail: profile?.email || 'Unknown',
                userName: profile?.name || profile?.email?.split('@')[0] || 'Unknown'
            };
        });
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
