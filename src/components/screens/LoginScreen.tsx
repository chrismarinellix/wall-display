import { useState, useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, UserPlus, LogIn, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPasskeys,
  registerPasskey,
  getPasskeyByCredentialId,
  updatePasskeyCounter,
  logActivity,
} from '../../services/supabase';

// Helper to encode/decode base64url
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate a random challenge
function generateChallenge(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return bufferToBase64url(array.buffer);
}

const RP_NAME = 'Wall Display';
const RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

// Only these emails can access the app
const ALLOWED_EMAILS = [
  'chrismarinelli@live.com',
  'cparuit@gmail.com',
];

export function LoginScreen() {
  const { setPasskeyAuth, hasRegisteredPasskeys, checkPasskeys } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(hasRegisteredPasskeys ? 'login' : 'register');
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = useCallback(async () => {
    const email = userEmail.trim().toLowerCase();

    if (!email) {
      setError('Please enter your email');
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if email is allowed
    if (!ALLOWED_EMAILS.includes(email)) {
      setError('Access denied. This email is not authorized.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const userId = crypto.randomUUID();
      const challenge = generateChallenge();

      // Create registration options
      const registrationOptions = {
        challenge,
        rp: {
          name: RP_NAME,
          id: RP_ID,
        },
        user: {
          id: userId,
          name: email,
          displayName: email,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' as const },  // ES256
          { alg: -257, type: 'public-key' as const }, // RS256
        ],
        timeout: 60000,
        attestation: 'none' as const,
        authenticatorSelection: {
          authenticatorAttachment: 'platform' as const,
          userVerification: 'required' as const,
          residentKey: 'required' as const,
          requireResidentKey: true,
        },
      };

      // Start the registration
      const credential = await startRegistration({ optionsJSON: registrationOptions });

      // Store the credential
      await registerPasskey({
        user_id: userId,
        user_name: email,
        credential_id: credential.id,
        public_key: JSON.stringify(credential.response),
        counter: 0,
      });

      // Update passkey check and authenticate
      await checkPasskeys();
      setPasskeyAuth(userId, email);

      // Log the registration
      await logActivity(email, 'register', 'Passkey registered successfully', 'login');

    } catch (e: unknown) {
      console.error('Registration failed:', e);
      if (e instanceof Error) {
        if (e.name === 'NotAllowedError') {
          setError('Registration was cancelled or not allowed');
        } else if (e.name === 'InvalidStateError') {
          setError('A passkey already exists for this device');
        } else {
          setError(e.message || 'Registration failed');
        }
      } else {
        setError('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  }, [userEmail, setPasskeyAuth, checkPasskeys]);

  const handleLogin = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const passkeys = await getPasskeys();
      if (passkeys.length === 0) {
        setError('No passkeys registered. Please register first.');
        setMode('register');
        setLoading(false);
        return;
      }

      const challenge = generateChallenge();

      // Create authentication options
      const authOptions = {
        challenge,
        timeout: 60000,
        rpId: RP_ID,
        userVerification: 'required' as const,
        allowCredentials: passkeys.map(p => ({
          id: p.credential_id,
          type: 'public-key' as const,
          transports: ['internal' as const],
        })),
      };

      // Start authentication
      const credential = await startAuthentication({ optionsJSON: authOptions });

      // Find the matching passkey
      const matchedPasskey = await getPasskeyByCredentialId(credential.id);
      if (!matchedPasskey) {
        setError('Passkey not found');
        setLoading(false);
        return;
      }

      // Verify the email is still in the allowed list
      const email = matchedPasskey.user_name.toLowerCase();
      if (!ALLOWED_EMAILS.includes(email)) {
        setError('Access denied. This account is no longer authorized.');
        setLoading(false);
        return;
      }

      // Update the counter (in a real app, you'd verify the signature server-side)
      const newCounter = matchedPasskey.counter + 1;
      await updatePasskeyCounter(credential.id, newCounter);

      // Authenticate the user
      setPasskeyAuth(matchedPasskey.user_id, matchedPasskey.user_name);

      // Log the login
      await logActivity(matchedPasskey.user_name, 'login', 'Passkey authentication successful', 'login');

    } catch (e: unknown) {
      console.error('Authentication failed:', e);
      if (e instanceof Error) {
        if (e.name === 'NotAllowedError') {
          setError('Authentication was cancelled');
        } else {
          setError(e.message || 'Authentication failed');
        }
      } else {
        setError('Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  }, [setPasskeyAuth]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#fff',
        borderRadius: 24,
        padding: 40,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 80,
            height: 80,
            margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={40} color="#fff" />
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>
            Wall Display
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
            {mode === 'register'
              ? 'Set up your passkey to secure access'
              : 'Sign in with your passkey'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 14,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 12,
            marginBottom: 24,
            color: '#dc2626',
            fontSize: 14,
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Registration mode */}
        {mode === 'register' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#666',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Enter your email"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 16,
                  border: '2px solid #e5e5e5',
                  borderRadius: 12,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e5e5'}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={loading || !userEmail.trim()}
              style={{
                width: '100%',
                padding: '16px 24px',
                fontSize: 16,
                fontWeight: 600,
                color: '#fff',
                background: loading || !userEmail.trim()
                  ? '#ccc'
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                border: 'none',
                borderRadius: 12,
                cursor: loading || !userEmail.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: loading || !userEmail.trim() ? 'none' : '0 4px 16px rgba(59, 130, 246, 0.3)',
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 20,
                    height: 20,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  Setting up...
                </>
              ) : (
                <>
                  <Fingerprint size={22} />
                  Register Passkey
                </>
              )}
            </button>

            {hasRegisteredPasskeys && (
              <button
                onClick={() => setMode('login')}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: '14px 24px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#666',
                  background: 'transparent',
                  border: '1px solid #e5e5e5',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <LogIn size={18} />
                Sign in with existing passkey
              </button>
            )}
          </>
        )}

        {/* Login mode */}
        {mode === 'login' && (
          <>
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '20px 24px',
                fontSize: 18,
                fontWeight: 600,
                color: '#fff',
                background: loading
                  ? '#ccc'
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                border: 'none',
                borderRadius: 12,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(59, 130, 246, 0.3)',
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 24,
                    height: 24,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  Verifying...
                </>
              ) : (
                <>
                  <Fingerprint size={28} />
                  Sign in with Passkey
                </>
              )}
            </button>

            <button
              onClick={() => setMode('register')}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '14px 24px',
                fontSize: 14,
                fontWeight: 500,
                color: '#666',
                background: 'transparent',
                border: '1px solid #e5e5e5',
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <UserPlus size={18} />
              Register new passkey
            </button>
          </>
        )}

        {/* Info */}
        <div style={{
          marginTop: 32,
          padding: 16,
          background: '#f8f8f8',
          borderRadius: 12,
          fontSize: 13,
          color: '#666',
          lineHeight: 1.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Fingerprint size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: '#333' }}>Passkeys</strong> use your device's biometrics
              (fingerprint, face, or PIN) for secure, password-free authentication.
            </div>
          </div>
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
