import { PublicClientApplication, Configuration, AccountInfo } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: ['User.Read', 'Mail.Read', 'Calendars.Read'],
};

export const graphScopes = {
  mail: ['Mail.Read'],
  calendar: ['Calendars.Read'],
};

export const initializeMsal = async () => {
  await msalInstance.initialize();
  // Handle redirect response if any
  await msalInstance.handleRedirectPromise();
};

export const getActiveAccount = (): AccountInfo | null => {
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
};

export const getAccessToken = async (scopes: string[]): Promise<string | null> => {
  const account = getActiveAccount();
  if (!account) return null;

  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes,
      account,
    });
    return response.accessToken;
  } catch {
    // Silent token acquisition failed
    try {
      const response = await msalInstance.acquireTokenPopup({ scopes });
      return response.accessToken;
    } catch (popupError) {
      console.error('Token acquisition failed:', popupError);
      return null;
    }
  }
};

export const signIn = async (): Promise<AccountInfo | null> => {
  try {
    const response = await msalInstance.loginPopup(loginRequest);
    return response.account;
  } catch (error) {
    console.error('Login failed:', error);
    return null;
  }
};

export const signOut = async (): Promise<void> => {
  const account = getActiveAccount();
  if (account) {
    await msalInstance.logoutPopup({ account });
  }
};
