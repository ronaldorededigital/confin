import { supabase } from '../lib/supabase';
import { User, SupportTicket } from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
    try {
      const { data: authData, error: authError } = await (supabase.auth as any).signInWithPassword({
        email,
        password,
      });

      if (authError) return { user: null, error: authError.message };
      if (!authData.user) return { user: null, error: 'User not found' };

      // Fetch Profile details
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      // If profile is missing, attempt to create it (Self-healing)
      if (profileError || !profile) {
        console.warn("Profile missing for user, attempting to create default profile...");
        
        const name = authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Usuário';
        const newProfile = {
          id: authData.user.id,
          email: authData.user.email!,
          name: name,
          avatar_initials: name.substring(0, 2).toUpperCase(),
          role: 'tenant_admin',
          plan: 'free'
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
          
        if (createError) {
           console.error("Failed to create missing profile:", createError);
           // Postgres error 42501 is insufficient_privilege (RLS violation)
           if (createError.code === '42501') {
              return { user: null, error: 'Erro de permissão (RLS) ao criar perfil. Execute o script SQL atualizado.' };
           }
           return { user: null, error: `Erro ao criar perfil: ${createError.message}` };
        }
        
        // If we have the profile from insert, use it
        if (createdProfile) {
            profile = createdProfile;
        } else {
            // Fallback to retry fetch if insert didn't return data (shouldn't happen with .select())
            const { data: retryProfile, error: retryError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();
              
            if (retryError || !retryProfile) {
               return { user: null, error: `Erro ao carregar perfil após criação: ${retryError?.message || 'Dados não retornados'}` };
            }
            profile = retryProfile;
        }
      }

      const user: User = {
        id: profile.id,
        tenantId: profile.tenant_id,
        name: profile.name,
        email: profile.email,
        avatarInitials: profile.avatar_initials,
        role: profile.role,
        plan: profile.plan,
        createdAt: profile.created_at
      };

      return { user, error: null };
    } catch (err: any) {
      console.error("Login error:", err);
      return { user: null, error: "Erro de conexão com o servidor." };
    }
  },

  register: async (name: string, email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await (supabase.auth as any).signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          }
        }
      });

      if (authError) return { user: null, error: authError.message };
      if (!authData.user) return { user: null, error: 'Erro no registro.' };

      // 2. Check if Profile was created by Trigger
      let { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      // If not found, try manual insert (fallback for when trigger is disabled/failed)
      if (!profile) {
        const newProfile = {
          id: authData.user.id,
          email,
          name,
          avatar_initials: name.substring(0, 2).toUpperCase(),
          role: 'tenant_admin', // Default role
          plan: 'free'
        };

        const { data: createdProfile, error: dbError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (dbError) {
          // Ignore duplicate key error (23505) if trigger beat us to it
          if (dbError.code === '23505') {
             // Fetch again
             const { data: retryProfile } = await supabase
               .from('profiles')
               .select('*')
               .eq('id', authData.user.id)
               .single();
             profile = retryProfile;
          } else {
             console.error("Registration DB Error:", dbError);
             return { user: null, error: `Erro ao criar perfil: ${dbError.message} (Código: ${dbError.code})` };
          }
        } else {
          profile = createdProfile;
        }
      }
      
      if (!profile) {
         return { user: null, error: 'Erro ao confirmar criação do perfil.' };
      }

      // Return User object
      const user: User = {
        id: profile.id,
        tenantId: profile.tenant_id,
        name: profile.name,
        email: profile.email,
        avatarInitials: profile.avatar_initials,
        role: profile.role,
        plan: profile.plan,
        createdAt: profile.created_at
      };

      return { user, error: null };
    } catch (err: any) {
      console.error("Register error:", err);
      return { user: null, error: "Erro de conexão com o servidor." };
    }
  },

  logout: async () => {
    try {
      await (supabase.auth as any).signOut();
    } catch (error) {
      console.error("Logout error", error);
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data, error } = await (supabase.auth as any).getSession();
      if (error || !data.session?.user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      if (profileError || !profile) return null;

      return {
        id: profile.id,
        tenantId: profile.tenant_id,
        name: profile.name,
        email: profile.email,
        avatarInitials: profile.avatar_initials,
        role: profile.role,
        plan: profile.plan,
        createdAt: profile.created_at
      };
    } catch (err) {
      console.error("Get Current User error", err);
      return null;
    }
  },

  // --- SaaS Admin Features ---

  getAllUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'saas_admin'); // Filter out admins themselves if desired

      if (error) {
        console.error(error);
        return [];
      }

      return data.map((p: any) => ({
        id: p.id,
        tenantId: p.tenant_id,
        name: p.name,
        email: p.email,
        avatarInitials: p.avatar_initials,
        role: p.role,
        plan: p.plan,
        createdAt: p.created_at
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  updateUserPlan: async (userId: string, newPlan: 'free' | 'premium') => {
    try {
      await supabase
        .from('profiles')
        .update({ plan: newPlan })
        .eq('id', userId);
    } catch (err) {
      console.error(err);
    }
  },

  getTickets: async (): Promise<SupportTicket[]> => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false });

      if (error) return [];

      return data.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        userName: t.profiles?.name || 'Desconhecido',
        subject: t.subject,
        status: t.status,
        date: t.created_at
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  resolveTicket: async (ticketId: string) => {
    try {
      await supabase
        .from('support_tickets')
        .update({ status: 'closed' })
        .eq('id', ticketId);
    } catch (err) {
      console.error(err);
    }
  }
};