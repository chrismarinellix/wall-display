import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthState {
  google: {
    isAuthenticated: boolean;
    accessToken: string | null;
    userEmail: string | null;
  };
  microsoft: {
    isAuthenticated: boolean;
    userEmail: string | null;
  };
}

interface AuthContextType {
  auth: AuthState;
  setGoogleAuth: (token: string | null, email?: string | null) => void;
  setMicrosoftAuth: (isAuth: boolean, email?: string | null) => void;
  isAnyAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const initialAuthState: AuthState = {
  google: {
    isAuthenticated: false,
    accessToken: null,
    userEmail: null,
  },
  microsoft: {
    isAuthenticated: false,
    userEmail: null,
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    // Restore from localStorage
    const stored = localStorage.getItem('wall-display-auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Check if Google token is expired
        if (parsed.google?.expiresAt && Date.now() > parsed.google.expiresAt) {
          parsed.google = initialAuthState.google;
        }
        return { ...initialAuthState, ...parsed };
      } catch {
        return initialAuthState;
      }
    }
    return initialAuthState;
  });

  useEffect(() => {
    localStorage.setItem('wall-display-auth', JSON.stringify(auth));
  }, [auth]);

  const setGoogleAuth = (token: string | null, email?: string | null) => {
    setAuth(prev => ({
      ...prev,
      google: {
        isAuthenticated: !!token,
        accessToken: token,
        userEmail: email ?? prev.google.userEmail,
      },
    }));
  };

  const setMicrosoftAuth = (isAuth: boolean, email?: string | null) => {
    setAuth(prev => ({
      ...prev,
      microsoft: {
        isAuthenticated: isAuth,
        userEmail: email ?? prev.microsoft.userEmail,
      },
    }));
  };

  const isAnyAuthenticated = auth.google.isAuthenticated || auth.microsoft.isAuthenticated;

  return (
    <AuthContext.Provider value={{ auth, setGoogleAuth, setMicrosoftAuth, isAnyAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
