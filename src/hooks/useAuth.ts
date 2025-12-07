import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  created_at?: string;
  last_login?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const API_BASE_URL = 'http://localhost:3001';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    isAuthenticated: false,
  });

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');

      if (storedToken) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setAuthState({
              user: data.user,
              token: storedToken,
              loading: false,
              isAuthenticated: true,
            });
          } else {
            localStorage.removeItem('auth_token');
            setAuthState({
              user: null,
              token: null,
              loading: false,
              isAuthenticated: false,
            });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('auth_token');
          setAuthState({
            user: null,
            token: null,
            loading: false,
            isAuthenticated: false,
          });
        }
      } else {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
        }));
      }
    };

    initializeAuth();
  }, []);

  const login = (user: User, token: string) => {
    localStorage.setItem('auth_token', token);
    setAuthState({
      user,
      token,
      loading: false,
      isAuthenticated: true,
    });
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setAuthState({
      user: null,
      token: null,
      loading: false,
      isAuthenticated: false,
    });
  };

  return {
    ...authState,
    login,
    logout,
  };
}
