import { supabase } from './supabaseClient';

export interface UserProfile {
    id: string;
    email: string;
    role: 'member' | 'hr';
}

export const authService = {
    async runLogin(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async runSignUp(email: string, password: string, role: 'member' | 'hr' = 'member') {
        // Sign up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) throw error;

        // Create/Update profile entry
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    email: email,
                    role: role
                }, { onConflict: 'id' });

            if (profileError) {
                console.error("Error creating profile:", profileError);
                // Depending on strictness, we might want to throw here or let it be.
            }
        }

        return { user: data.user, session: data.session };
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },

    async getUserProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return data as UserProfile;
    }
};
