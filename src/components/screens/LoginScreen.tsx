import { useState, useCallback, useEffect, useRef } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, UserPlus, LogIn, Shield, AlertCircle, KeyRound, Smartphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPasskeys,
  registerPasskey,
  getPasskeyByCredentialId,
  updatePasskeyCounter,
  logActivity,
} from '../../services/supabase';

// PIN for fallback authentication
const VALID_PIN = '5253';

// Device trust token key
const DEVICE_TRUST_KEY = 'wall-display-device-trust';

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

// Check if device is trusted
function isDeviceTrusted(): boolean {
  const token = localStorage.getItem(DEVICE_TRUST_KEY);
  if (!token) return false;
  try {
    const data = JSON.parse(token);
    // Check if token is valid and not expired (90 days)
    if (data.trusted && data.timestamp) {
      const expiryDays = 90;
      const expiryMs = expiryDays * 24 * 60 * 60 * 1000;
      if (Date.now() - data.timestamp < expiryMs) {
        return true;
      }
    }
  } catch {
    // Invalid token
  }
  return false;
}

// Save device trust
function trustDevice() {
  const token = {
    trusted: true,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
  };
  localStorage.setItem(DEVICE_TRUST_KEY, JSON.stringify(token));
}

export function LoginScreen() {
  const { setPasskeyAuth, hasRegisteredPasskeys, checkPasskeys } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'pin'>(hasRegisteredPasskeys ? 'login' : 'register');
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const [trustThisDevice, setTrustThisDevice] = useState(true);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check for trusted device on mount
  useEffect(() => {
    if (isDeviceTrusted()) {
      // Auto-login for trusted device
      setPasskeyAuth('trusted-device', 'Trusted Device');
      logActivity('trusted-device', 'auto-login', 'Trusted device auto-login', 'login');
    }
  }, [setPasskeyAuth]);

  // Handle PIN input
  const handlePinChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError(null);

    // Auto-focus next input
    if (digit && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }

    // Check PIN when all digits entered
    if (index === 3 && digit) {
      const fullPin = newPin.join('');
      if (fullPin === VALID_PIN) {
        if (trustThisDevice) {
          trustDevice();
        }
        setPasskeyAuth('pin-user', 'PIN User');
        logActivity('pin-user', 'login', 'PIN authentication successful', 'login');
      } else {
        setError('Incorrect PIN');
        setPin(['', '', '', '']);
        setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
      }
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

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
              : mode === 'pin'
                ? 'Enter your PIN to continue'
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

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={() => setMode('pin')}
                style={{
                  flex: 1,
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
                <KeyRound size={18} />
                Use PIN
              </button>
              <button
                onClick={() => setMode('register')}
                style={{
                  flex: 1,
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
                Register
              </button>
            </div>
          </>
        )}

        {/* PIN mode */}
        {mode === 'pin' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
                Enter your 4-digit PIN
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  ref={(el) => { pinInputRefs.current[index] = el; }}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={pin[index]}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  autoFocus={index === 0}
                  style={{
                    width: 56,
                    height: 64,
                    fontSize: 28,
                    fontWeight: 700,
                    textAlign: 'center',
                    border: `2px solid ${error ? '#ef4444' : '#e5e5e5'}`,
                    borderRadius: 12,
                    outline: 'none',
                    background: '#fff',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    if (!error) e.target.style.borderColor = '#3b82f6';
                  }}
                  onBlur={(e) => {
                    if (!error) e.target.style.borderColor = '#e5e5e5';
                  }}
                />
              ))}
            </div>

            {/* Trust this device */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              background: '#f8f8f8',
              borderRadius: 12,
              cursor: 'pointer',
              marginBottom: 24,
            }}>
              <input
                type="checkbox"
                checked={trustThisDevice}
                onChange={(e) => setTrustThisDevice(e.target.checked)}
                style={{
                  width: 20,
                  height: 20,
                  accentColor: '#3b82f6',
                }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
                  Trust this device
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  Stay signed in for 90 days
                </div>
              </div>
              <Smartphone size={20} color="#888" style={{ marginLeft: 'auto' }} />
            </label>

            <button
              onClick={() => {
                setMode('login');
                setPin(['', '', '', '']);
                setError(null);
              }}
              style={{
                width: '100%',
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
              <Fingerprint size={18} />
              Use Passkey instead
            </button>
          </>
        )}

        {/* Info */}
        {mode !== 'pin' && (
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
        )}
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
