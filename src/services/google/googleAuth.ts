// Google OAuth configuration
// Uses @react-oauth/google for the OAuth flow

export interface GoogleAuthState {
  accessToken: string | null;
  expiresAt: number | null;
  userEmail: string | null;
}

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

export const storeGoogleTokens = (accessToken: string, expiresIn: number): GoogleAuthState => {
  const state: GoogleAuthState = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
    userEmail: null,
  };
  localStorage.setItem('google_auth', JSON.stringify(state));
  return state;
};

export const getGoogleAuth = (): GoogleAuthState | null => {
  const stored = localStorage.getItem('google_auth');
  if (!stored) return null;

  try {
    const state = JSON.parse(stored) as GoogleAuthState;
    // Check if token is expired
    if (state.expiresAt && Date.now() > state.expiresAt) {
      localStorage.removeItem('google_auth');
      return null;
    }
    return state;
  } catch {
    return null;
  }
};

export const clearGoogleAuth = () => {
  localStorage.removeItem('google_auth');
};
