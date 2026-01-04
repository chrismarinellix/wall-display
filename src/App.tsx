import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance, initializeMsal } from './services/microsoft/microsoftAuth';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ScreenProvider } from './contexts/ScreenContext';
import { ScreenContainer } from './components/layout/ScreenContainer';
import { LoginScreen } from './components/screens/LoginScreen';
import './index.css';
// AnnouncementProvider removed - not currently used

// Auth gate component - shows login screen if not authenticated
function AuthGate() {
  const { isAppAuthenticated } = useAuth();

  if (!isAppAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <ScreenProvider>
      <ScreenContainer />
    </ScreenProvider>
  );
}

function App() {
  // Initialize MSAL on app load
  useEffect(() => {
    initializeMsal().catch(console.error);
  }, []);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // If no OAuth is configured, still show the app (weather works without auth)
  const content = (
    <SettingsProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </SettingsProvider>
  );

  // Wrap with Google OAuth if client ID is provided
  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <MsalProvider instance={msalInstance}>
          {content}
        </MsalProvider>
      </GoogleOAuthProvider>
    );
  }

  // No Google OAuth, just MSAL
  return (
    <MsalProvider instance={msalInstance}>
      {content}
    </MsalProvider>
  );
}

export default App;
