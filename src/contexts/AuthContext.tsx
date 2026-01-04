import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuthSession, saveAuthSession, clearAuthSession, getPasskeys } from '../services/supabase';

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
  passkey: {
    isAuthenticated: boolean;
    userId: string | null;
    userName: string | null;
  };
}

interface AuthContextType {
  auth: AuthState;
  setGoogleAuth: (token: string | null, email?: string | null) => void;
  setMicrosoftAuth: (isAuth: boolean, email?: string | null) => void;
  setPasskeyAuth: (userId: string, userName: string) => void;
  logout: () => void;
  isAppAuthenticated: boolean; // Main app gate - requires passkey
  isAnyAuthenticated: boolean; // For calendar/email features
  hasRegisteredPasskeys: boolean;
  checkPasskeys: () => Promise<void>;
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
  passkey: {
    isAuthenticated: false,
    userId: null,
    userName: null,
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    // Restore from localStorage
    const stored = localStorage.getItem('wall-display-auth');
    let state = initialAuthState;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Check if Google token is expired
        if (parsed.google?.expiresAt && Date.now() > parsed.google.expiresAt) {
          parsed.google = initialAuthState.google;
        }
        state = { ...initialAuthState, ...parsed };
      } catch {
        state = initialAuthState;
      }
    }

    // Check for existing passkey session
    const passkeySession = getAuthSession();
    if (passkeySession) {
      state = {
        ...state,
        passkey: {
          isAuthenticated: true,
          userId: passkeySession.userId,
          userName: passkeySession.userName,
        },
      };
    }

    return state;
  });

  const [hasRegisteredPasskeys, setHasRegisteredPasskeys] = useState(false);

  // Check if any passkeys are registered
  const checkPasskeys = useCallback(async () => {
    const passkeys = await getPasskeys();
    setHasRegisteredPasskeys(passkeys.length > 0);
  }, []);

  useEffect(() => {
    checkPasskeys();
  }, [checkPasskeys]);

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

  const setPasskeyAuth = useCallback((userId: string, userName: string) => {
    saveAuthSession(userId, userName);
    setAuth(prev => ({
      ...prev,
      passkey: {
        isAuthenticated: true,
        userId,
        userName,
      },
    }));
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setAuth(prev => ({
      ...prev,
      passkey: {
        isAuthenticated: false,
        userId: null,
        userName: null,
      },
    }));
  }, []);

  const isAnyAuthenticated = auth.google.isAuthenticated || auth.microsoft.isAuthenticated;
  const isAppAuthenticated = auth.passkey.isAuthenticated;

  return (
    <AuthContext.Provider value={{
      auth,
      setGoogleAuth,
      setMicrosoftAuth,
      setPasskeyAuth,
      logout,
      isAppAuthenticated,
      isAnyAuthenticated,
      hasRegisteredPasskeys,
      checkPasskeys,
    }}>
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
