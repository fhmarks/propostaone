import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, Tenant } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  tenant: Tenant | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, tenantName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data: profileData } = await supabase
      .from('propostaone_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData as Profile);

      const { data: tenantData } = await supabase
        .from('propostaone_tenants')
        .select('*')
        .eq('id', profileData.tenant_id)
        .maybeSingle();

      if (tenantData) {
        setTenant(tenantData as Tenant);
      }
    } else {
      setProfile(null);
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  // Step 1: onAuthStateChange must be synchronous — NEVER async.
  // Async callbacks cause a Supabase-js v2 deadlock: any Supabase query
  // inside the callback triggers another auth event, blocking forever.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setProfile(null);
        setTenant(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Step 2: Fetch profile in a separate effect watching user ID.
  // Runs safely outside the auth lock, after onAuthStateChange updates user.
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchProfile(user.id).finally(() => setLoading(false));
  }, [user?.id]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email: string, password: string, name: string, tenantName: string) {
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError || !data.user) {
      return { error: signUpError };
    }

    const { data: tenantData, error: tenantError } = await supabase
      .from('propostaone_tenants')
      .insert({ name: tenantName, email })
      .select()
      .single();

    if (tenantError) {
      return { error: tenantError };
    }

    const { error: profileError } = await supabase
      .from('propostaone_profiles')
      .insert({
        id: data.user.id,
        tenant_id: tenantData.id,
        full_name: name,
        email,
        role: 'owner',
      });

    return { error: profileError };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, tenant, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
