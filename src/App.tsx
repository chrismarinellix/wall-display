import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance, initializeMsal } from './services/microsoft/microsoftAuth';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import { ScreenProvider } from './contexts/ScreenContext';
import { ScreenContainer } from './components/layout/ScreenContainer';
import { AnnouncementProvider } from './components/AnnouncementProvider';
import './index.css';

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
        <ScreenProvider>
          <ScreenContainer />
        </ScreenProvider>
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
