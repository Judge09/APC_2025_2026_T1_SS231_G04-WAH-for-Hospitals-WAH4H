import React, { useState, useEffect } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

interface SessionTimeoutProps {
  children: React.ReactNode;
}

const SessionTimeout: React.FC<SessionTimeoutProps> = ({ children }) => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);

// Timeout Configuration
  const TIMEOUT = 15 * 60 * 1000;      // 15 minutes total (900,000 ms)
  const WARNING_TIME = 30 * 1000;     // Show warning after 30 seconds (leaves 30s to react)

  const handleOnIdle = () => {
    // User has been idle for 15 minutes
    handleLogout();
  };

  const handleOnPrompt = () => {
    // Show warning modal at 14 minutes
    setShowWarning(true);
  };

  const handleOnActive = () => {
    // User became active again
    setShowWarning(false);
  };

  const handleLogout = () => {
    setShowWarning(false);
    logout();
    navigate('/login', { replace: true });
  };

  const handleStayLoggedIn = () => {
    setShowWarning(false);
    activate();
  };

  const { activate, getRemainingTime } = useIdleTimer({
    onIdle: handleOnIdle,
    onPrompt: handleOnPrompt,
    onActive: handleOnActive,
    timeout: TIMEOUT,
    promptBeforeIdle: TIMEOUT - WARNING_TIME,
    throttle: 500,
    crossTab: true, // Critical: Sync activity across all tabs
    syncTimers: 200,
    leaderElection: true,
    disabled: !isAuthenticated, // Only track when user is logged in
  });

  // Update countdown every second when warning modal is shown
  useEffect(() => {
    if (showWarning) {
      const interval = setInterval(() => {
        const remaining = Math.ceil(getRemainingTime() / 1000);
        setCountdown(remaining > 0 ? remaining : 0);
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [showWarning, getRemainingTime]);

  // Don't render modal if user is not authenticated
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 border-2 border-orange-500">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Session Expiring Soon
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your session will expire due to inactivity to protect patient data and ensure HIPAA compliance.
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-orange-800 font-medium text-center">
                    Logging out in <span className="text-xl font-bold">{countdown}</span> second{countdown !== 1 ? 's' : ''}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Move your mouse or click "Stay Logged In" to continue your session.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium transition-colors duration-200"
              >
                Logout Now
              </button>
              <button
                onClick={handleStayLoggedIn}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors duration-200"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SessionTimeout;
