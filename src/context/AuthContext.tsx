
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User, UserRole } from '@/lib/types';
import { loginUser as loginUserServerAction, signupUser as signupUserServerAction } from '@/app/actions/auth-actions';
import { addClientLogEntry } from '@/app/actions/logging-actions';

interface AuthUser extends Pick<User, 'id' | 'email' | 'name' | 'role' | 'phone' | 'accountStatus'> {}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  login: (email: string, password_plaintext: string) => Promise<{ success: boolean; message?: string; user?: AuthUser }>; 
  signup: (name: string, email: string, password_plaintext: string, redirectPath?: string, postAuthAction?: string) => Promise<{ success: boolean; message?: string; user?: AuthUser, otpSent?: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); 

  const loadUserFromStorage = useCallback(() => {
    setIsLoadingAuth(true);
    try {
      const storedUser = localStorage.getItem('tablemaster_user_session');
      if (storedUser) {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        addClientLogEntry('[AuthContext] Session loaded from localStorage.', 'INFO', { email: parsedUser.email, role: parsedUser.role });
      } else {
        addClientLogEntry('[AuthContext] No active session in localStorage.', 'INFO');
      }
    } catch (error) {
      console.error("[AuthContext] Error reading auth state from localStorage:", error);
      localStorage.removeItem('tablemaster_user_session');
      addClientLogEntry('[AuthContext] Cleared potentially corrupted localStorage session.', 'WARN');
    }
    setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  const login = useCallback(async (email: string, password_plaintext: string): Promise<{ success: boolean; message?: string; user?: AuthUser }> => {
    setIsLoadingAuth(true);
    addClientLogEntry('[AuthContext] Attempting login via server action.', 'INFO', { email });
    
    const result = await loginUserServerAction(email, password_plaintext); 
    
    if (result.success && result.user) {
      const authUser: AuthUser = result.user; // The user object from the server action already has the password removed.
      
      setUser(authUser);
      setIsAuthenticated(true);
      localStorage.setItem('tablemaster_user_session', JSON.stringify(authUser));
      addClientLogEntry('[AuthContext] Login successful via server.', 'INFO', { email: authUser.email, role: authUser.role });
    } else {
      addClientLogEntry('[AuthContext] Login failed via server.', 'WARN', { email, error: result.message });
    }
    setIsLoadingAuth(false);
    return result;
  }, []);

  const signup = useCallback(async (name: string, email: string, password_plaintext: string, redirectPath?: string, postAuthAction?: string): Promise<{ success: boolean; message?: string; user?: AuthUser, otpSent?: boolean }> => {
    setIsLoadingAuth(true);
    addClientLogEntry('[AuthContext] Attempting signup via server action.', 'INFO', { name, email, redirectPath, postAuthAction });

    const result = await signupUserServerAction(name, email, password_plaintext); 

    if (result.success && result.user) {
      if (result.otpSent) {
        addClientLogEntry('[AuthContext] Signup initiated, OTP sent for verification.', 'INFO', { email });
        let verifyOtpUrl = `/verify-otp?email=${encodeURIComponent(email)}`;
        if (redirectPath) verifyOtpUrl += `&postLoginRedirectPath=${encodeURIComponent(redirectPath)}`;
        if (postAuthAction) verifyOtpUrl += `&postLoginAction=${encodeURIComponent(postAuthAction)}`;
        router.push(verifyOtpUrl);
      } else {
        addClientLogEntry('[AuthContext] Signup created user but OTP step might be missing or failed.', 'WARN', { email, message: result.message });
      }
    } else {
      addClientLogEntry('[AuthContext] Signup failed via server.', 'ERROR', { email, error: result.message });
    }
    setIsLoadingAuth(false);
    return result;
  }, [router]);


  const logout = useCallback(() => {
    addClientLogEntry('[AuthContext] User initiated logout.', 'INFO', { email: user?.email });
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('tablemaster_user_session');
    if (!['/login', '/signup', '/forgot-password', '/reset-password', '/verify-otp'].includes(pathname)) {
        router.push('/login'); 
    }
  }, [router, user?.email, pathname]);

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isLoadingAuth,
    login,
    signup,
    logout
  }), [user, isAuthenticated, isLoadingAuth, login, signup, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
