export type Role = 'student' | 'counselor' | 'admin';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  program?: string; // e.g., "MBA Year 1"
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'agent'; 
  text: string;
  timestamp: Date;
  metadata?: {
    type: 'booking_suggestion' | 'task_assignment' | 'crisis_trigger';
    slotId?: string;
    slotTime?: string;
    taskName?: string;
  };
}

export interface P2PMessage {
  id: string;
  senderId: string;
  receiverId: string; // 'counselor' or specific student ID
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface StudentMetric {
  date: string;
  workloadScore: number; // 0-100
  sleepHours: number;
  stressScore: number; // 0-100
}

export interface AnonymizedStudent {
  hashId: string;
  stressScore: number;
  lastCheckIn: string;
  status: 'Normal' | 'Monitor' | 'High Risk';
}

export interface AppointmentSlot {
  id: string;
  date: string;
  time: string;
  counselorName: string;
  status: 'open' | 'requested' | 'confirmed';
  bookedByStudentId?: string;
  bookedByStudentName?: string;
}

export interface WellnessTask {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  assignedBy: string; // Counselor Name or "SParsh Guardian"
}

export interface WellnessLeave {
  isActive: boolean;
  issuedDate: string;
  expiryDate: string;
  issuedBy: string;
  reason: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  vibe: VibeType;
  encryptedText: string;
}

export type VibeType = 'calm' | 'anxious' | 'focus' | 'tired' | 'energetic';

export interface AgentAnalysis {
  sentimentScore: number; // 0-100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendedAction: 'NONE' | 'SUGGEST_BOOKING' | 'ASSIGN_EXERCISE' | 'TRIGGER_SOS';
  reasoning: string;
  specificExercise?: string; // e.g., "Box Breathing"
}