import { useAuth } from '../../contexts/AuthContext';
import { Mail, Calendar } from 'lucide-react';

export function ConnectionStatus() {
  const { auth } = useAuth();

  return (
    <div className="flex items-center gap-3">
      {/* Google status */}
      <div
        className={`flex items-center gap-1 text-xs ${
          auth.google.isAuthenticated ? 'text-eink-dark' : 'text-eink-mid'
        }`}
        title={auth.google.isAuthenticated ? 'Gmail connected' : 'Gmail not connected'}
      >
        <Mail size={12} />
        <span className="eink-mono">G</span>
        {auth.google.isAuthenticated && <span className="text-[8px]">●</span>}
      </div>

      {/* Microsoft status */}
      <div
        className={`flex items-center gap-1 text-xs ${
          auth.microsoft.isAuthenticated ? 'text-eink-dark' : 'text-eink-mid'
        }`}
        title={auth.microsoft.isAuthenticated ? 'Outlook connected' : 'Outlook not connected'}
      >
        <Calendar size={12} />
        <span className="eink-mono">M</span>
        {auth.microsoft.isAuthenticated && <span className="text-[8px]">●</span>}
      </div>
    </div>
  );
}
