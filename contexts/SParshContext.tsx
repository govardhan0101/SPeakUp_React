import React, { createContext, useContext, useState, ReactNode } from 'react';
import { VibeType } from '../types';

interface SParshContextType {
  vibe: VibeType | null;
  setVibe: (vibe: VibeType | null) => void;
  avatarState: 'idle' | 'listening' | 'speaking';
  setAvatarState: (state: 'idle' | 'listening' | 'speaking') => void;
}

const SParshContext = createContext<SParshContextType | undefined>(undefined);

export const SParshProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vibe, setVibe] = useState<VibeType | null>('calm');
  const [avatarState, setAvatarState] = useState<'idle' | 'listening' | 'speaking'>('idle');

  return (
    <SParshContext.Provider value={{ vibe, setVibe, avatarState, setAvatarState }}>
      {children}
    </SParshContext.Provider>
  );
};

export const useSParsh = () => {
  const context = useContext(SParshContext);
  if (!context) {
    throw new Error('useSParsh must be used within a SParshProvider');
  }
  return context;
};