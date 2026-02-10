import React, { useState } from 'react';
import StudentDashboard from './components/StudentDashboard';
import CounselorDashboard from './components/CounselorDashboard';
import AdminDashboard from './components/AdminDashboard';
import CrisisOverlay from './components/CrisisOverlay';
import LoginScreen from './components/LoginScreen';
import { Role } from './types';
import { SParshProvider } from './contexts/SParshContext';

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isCrisisMode, setIsCrisisMode] = useState(false);

  const handleLogin = (role: Role, email: string, id: string) => {
    setCurrentRole(role);
    setUserEmail(email);
    setUserId(id);
  };

  if (!currentRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <SParshProvider>
      <div className="min-h-screen bg-[#E6DDD0] relative font-sans">
        
        {/* Crisis Overlay (Global) */}
        {isCrisisMode && (
          <CrisisOverlay onDismiss={() => setIsCrisisMode(false)} />
        )}

        {/* Main Routing */}
        <main className="h-screen w-full">
          {currentRole === 'student' && (
            <StudentDashboard triggerCrisis={() => setIsCrisisMode(true)} userEmail={userEmail} userId={userId} />
          )}
          {currentRole === 'counselor' && (
            <CounselorDashboard />
          )}
          {currentRole === 'admin' && (
            <AdminDashboard />
          )}
        </main>
      </div>
    </SParshProvider>
  );
}