import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthError {
  message: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      toast({
        title: "Account Created",
        description: "Please check your email to verify your account.",
        variant: "default",
        duration: 5000
      });

      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Sign Up Failed", 
        description: authError.message,
        variant: "destructive"
      });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've been successfully signed in.",
        variant: "default"
      });

      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Sign In Failed",
        description: authError.message,
        variant: "destructive"
      });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed Out",
        description: "You've been successfully signed out.",
        variant: "default"
      });
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Sign Out Failed",
        description: authError.message,
        variant: "destructive"
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) throw error;

      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions.",
        variant: "default"
      });

      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Password Reset Failed",
        description: authError.message,
        variant: "destructive"
      });
      return { error: authError };
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword
  };
};