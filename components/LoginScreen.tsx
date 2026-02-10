import React, { useState } from 'react';
import { Role } from '../types';
import { loginOrRegisterUser } from '../services/storage';

interface Props {
  onLogin: (role: Role, email: string, userId: string) => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'splash' | 'form'>('splash');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSplashClick = () => setStep('form');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.endsWith('@spjimr.org')) {
      setError('Please use your official @spjimr.org email.');
      return;
    }

    setIsAuthenticating(true);

    let role: Role = 'counselor'; 

    if (email === 'admin@spjimr.org') {
      role = 'admin';
    } else {
      const localPart = email.split('@')[0];
      if (localPart.includes('.')) {
        role = 'student';
      } else {
        role = 'counselor';
      }
    }

    try {
        // Call Storage Service to Create/Get User
        const user = await loginOrRegisterUser(email, role);
        
        // Simulate Network Delay
        setTimeout(() => {
            onLogin(user.role, user.email, user.id);
            setIsAuthenticating(false);
        }, 800);

    } catch (err) {
        setError("Authentication failed. Please try again.");
        setIsAuthenticating(false);
    }
  };

  if (step === 'splash') {
    return (
      <div 
        onClick={handleSplashClick}
        className="h-screen w-full bg-[#E6DDD0] flex flex-col items-center justify-center cursor-pointer animate-in fade-in duration-700"
      >
        <div className="relative w-48 h-48 mb-8">
           <div className="absolute inset-0 bg-[#8A9A5B] rounded-full opacity-20 animate-ping"></div>
           <div className="absolute inset-4 bg-[#8A9A5B] rounded-full opacity-40 animate-pulse"></div>
           <div className="absolute inset-8 bg-[#8A9A5B] rounded-full flex items-center justify-center shadow-xl">
              <span className="text-white text-5xl font-bold">S</span>
           </div>
        </div>
        <h1 className="text-4xl font-bold text-[#708090] tracking-wider mb-2">SPeakUp</h1>
        <p className="text-[#CC5500] text-sm uppercase tracking-widest">SPJIMR Ecosystem</p>
        <p className="mt-12 text-[#708090]/50 text-sm animate-bounce">Tap to Begin</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#E6DDD0] flex items-center justify-center p-6">
      <div className="neu-flat p-8 rounded-3xl w-full max-w-sm animate-in zoom-in duration-300">
        <h2 className="text-2xl font-bold text-[#708090] mb-2 text-center">Welcome Back</h2>
        <p className="text-center text-slate-400 text-sm mb-8">Sign in with your SPJIMR ID</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-[#708090] ml-2 mb-1">OFFICIAL EMAIL</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. mba.rohan@spjimr.org"
              className="neu-pressed w-full p-4 rounded-xl text-[#708090] outline-none focus:ring-2 focus:ring-[#8A9A5B]/50 transition-all"
              required
              disabled={isAuthenticating}
            />
            {error && <p className="text-xs text-red-500 mt-2 ml-2">{error}</p>}
          </div>

          <button 
            type="submit"
            disabled={isAuthenticating}
            className="w-full bg-[#8A9A5B] text-white py-4 rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2"
          >
            {isAuthenticating ? (
                <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Authenticating...
                </>
            ) : "Authenticate"}
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>Format Guide:</p>
          <p>Student: program.name@spjimr.org</p>
          <p>Counselor: name@spjimr.org</p>
          <p>Admin: admin@spjimr.org</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;