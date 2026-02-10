import { User, Role, Message, AppointmentSlot, WellnessTask, WellnessLeave, JournalEntry, P2PMessage } from '../types';
import { encryptData, decryptData } from '../utils/encryption';
import { MOCK_SLOTS } from '../constants';

const CLOUD_KEYS = {
  USERS: 'speakup_cloud_users',
  CHATS: 'speakup_cloud_chats',
  TASKS: 'speakup_cloud_tasks',
  LEAVES: 'speakup_cloud_leaves',
  SLOTS: 'speakup_cloud_slots',
  JOURNALS: 'speakup_cloud_journals',
  P2P_MSGS: 'speakup_cloud_p2p_msgs'
};

// --- Cloud Simulation Helpers ---

// Simulate network latency (200-500ms)
const networkDelay = () => new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

const cloudGet = <T>(key: string, defaultVal: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultVal;
};

const cloudSet = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- Auth ---
export const loginOrRegisterUser = async (email: string, role: Role): Promise<User> => {
  await networkDelay();
  const users = cloudGet<User[]>(CLOUD_KEYS.USERS, []);
  let user = users.find(u => u.email === email);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      name: email.split('@')[0].replace('.', ' '),
      email,
      role,
      program: role === 'student' ? email.split('.')[0] : undefined
    };
    users.push(user);
    cloudSet(CLOUD_KEYS.USERS, users);
  }
  return user;
};

// --- AI Chat History ---
export const saveChatMessage = async (userId: string, message: Message) => {
  // No delay for save to make UI snappy, assuming optimistic UI updates
  const allChats = cloudGet<Record<string, Message[]>>(CLOUD_KEYS.CHATS, {});
  const userChats = allChats[userId] || [];
  
  // Encrypt payload before "sending to cloud"
  const payload = { ...message, text: encryptData(message.text) };
  
  userChats.push(payload);
  allChats[userId] = userChats;
  cloudSet(CLOUD_KEYS.CHATS, allChats);
};

export const getChatHistory = async (userId: string): Promise<Message[]> => {
  await networkDelay();
  const allChats = cloudGet<Record<string, Message[]>>(CLOUD_KEYS.CHATS, {});
  const userChats = allChats[userId] || [];
  // Decrypt on retrieval
  return userChats.map(msg => ({ 
      ...msg, 
      text: decryptData(msg.text),
      // Fix date objects lost during JSON stringify
      timestamp: new Date(msg.timestamp) 
  }));
};

// --- P2P Messaging (Encrypted) ---
export const sendP2PMessage = async (msg: P2PMessage) => {
    await networkDelay();
    const allMsgs = cloudGet<P2PMessage[]>(CLOUD_KEYS.P2P_MSGS, []);
    const encrypted = { ...msg, text: encryptData(msg.text) };
    allMsgs.push(encrypted);
    cloudSet(CLOUD_KEYS.P2P_MSGS, allMsgs);
};

export const getP2PThread = async (userId1: string, userId2: string): Promise<P2PMessage[]> => {
    // Shorter delay for polling
    const allMsgs = cloudGet<P2PMessage[]>(CLOUD_KEYS.P2P_MSGS, []);
    const thread = allMsgs.filter(m => 
        (m.senderId === userId1 && m.receiverId === userId2) || 
        (m.senderId === userId2 && m.receiverId === userId1)
    );
    return thread.map(m => ({ ...m, text: decryptData(m.text) })).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const getCounselorConversations = async (counselorId: string) => {
  const allMsgs = cloudGet<P2PMessage[]>(CLOUD_KEYS.P2P_MSGS, []);
  const convos: Record<string, { studentId: string, lastMessage: P2PMessage | null, unreadCount: number }> = {};

  allMsgs.forEach(msg => {
     if (msg.senderId === counselorId || msg.receiverId === counselorId) {
         const otherId = msg.senderId === counselorId ? msg.receiverId : msg.senderId;
         
         if (!convos[otherId]) {
             convos[otherId] = { studentId: otherId, lastMessage: null, unreadCount: 0 };
         }
         
         const currentLast = convos[otherId].lastMessage;
         if (!currentLast || new Date(msg.timestamp) > new Date(currentLast.timestamp)) {
             convos[otherId].lastMessage = { ...msg, text: decryptData(msg.text) };
         }
         
         if (msg.receiverId === counselorId && !msg.isRead) {
             convos[otherId].unreadCount++;
         }
     }
  });
  
  return Object.values(convos).sort((a, b) => {
      const ta = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const tb = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return tb - ta;
  });
};

export const markThreadAsRead = async (counselorId: string, studentId: string) => {
    const allMsgs = cloudGet<P2PMessage[]>(CLOUD_KEYS.P2P_MSGS, []);
    let changed = false;
    const updated = allMsgs.map(m => {
        if (m.receiverId === counselorId && m.senderId === studentId && !m.isRead) {
            changed = true;
            return { ...m, isRead: true };
        }
        return m;
    });
    if (changed) cloudSet(CLOUD_KEYS.P2P_MSGS, updated);
}

// --- Appointments & Approval Workflow ---
export const getSlots = async (): Promise<AppointmentSlot[]> => {
  await networkDelay();
  const raw = localStorage.getItem(CLOUD_KEYS.SLOTS);
  // Fixed: Only initialize mock data if the KEY DOES NOT EXIST (null).
  // If key exists but is empty array [], that is valid state (all deleted).
  if (raw === null) {
    cloudSet(CLOUD_KEYS.SLOTS, MOCK_SLOTS);
    return MOCK_SLOTS;
  }
  return JSON.parse(raw);
};

export const requestSlot = async (slotId: string, studentId: string, studentName: string): Promise<boolean> => {
  await networkDelay();
  const slots = await getSlots();
  const index = slots.findIndex(s => s.id === slotId);
  if (index !== -1 && slots[index].status === 'open') {
    slots[index].status = 'requested';
    slots[index].bookedByStudentId = studentId;
    slots[index].bookedByStudentName = studentName;
    cloudSet(CLOUD_KEYS.SLOTS, slots);
    return true;
  }
  return false;
};

export const updateSlotStatus = async (slotId: string, status: 'confirmed' | 'open'): Promise<void> => {
    await networkDelay();
    const slots = await getSlots();
    const index = slots.findIndex(s => s.id === slotId);
    if (index !== -1) {
        if (status === 'open') {
            slots[index].status = 'open';
            slots[index].bookedByStudentId = undefined;
            slots[index].bookedByStudentName = undefined;
        } else {
            slots[index].status = status;
        }
        cloudSet(CLOUD_KEYS.SLOTS, slots);
    }
};

export const deleteSlot = async (slotId: string) => {
    await networkDelay();
    const slots = await getSlots();
    const newSlots = slots.filter(s => s.id !== slotId);
    cloudSet(CLOUD_KEYS.SLOTS, newSlots);
};

export const createSlot = async (slot: AppointmentSlot) => {
  await networkDelay();
  const slots = await getSlots();
  slots.push(slot);
  cloudSet(CLOUD_KEYS.SLOTS, slots);
};

// --- Wellness Tasks ---
export const getTasks = async (studentEmail: string): Promise<WellnessTask[]> => {
  await networkDelay();
  const allTasks = cloudGet<Record<string, WellnessTask[]>>(CLOUD_KEYS.TASKS, {});
  return allTasks[studentEmail] || [];
};

export const assignTask = async (studentEmail: string, task: WellnessTask) => {
  await networkDelay();
  const allTasks = cloudGet<Record<string, WellnessTask[]>>(CLOUD_KEYS.TASKS, {});
  const studentTasks = allTasks[studentEmail] || [];
  studentTasks.push(task);
  allTasks[studentEmail] = studentTasks;
  cloudSet(CLOUD_KEYS.TASKS, allTasks);
};

export const toggleTaskCompletion = async (studentEmail: string, taskId: string) => {
  const allTasks = cloudGet<Record<string, WellnessTask[]>>(CLOUD_KEYS.TASKS, {});
  const studentTasks = allTasks[studentEmail] || [];
  const updatedTasks = studentTasks.map(t => 
    t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
  );
  allTasks[studentEmail] = updatedTasks;
  cloudSet(CLOUD_KEYS.TASKS, allTasks);
};

// --- Leaves ---
export const issueLeave = async (studentEmail: string, leave: WellnessLeave) => {
    await networkDelay();
    const leaves = cloudGet<Record<string, WellnessLeave>>(CLOUD_KEYS.LEAVES, {});
    leaves[studentEmail] = leave;
    cloudSet(CLOUD_KEYS.LEAVES, leaves);
};

export const getActiveLeave = async (studentEmail: string): Promise<WellnessLeave | null> => {
    await networkDelay();
    const leaves = cloudGet<Record<string, WellnessLeave>>(CLOUD_KEYS.LEAVES, {});
    return leaves[studentEmail] || null;
};

// --- Journal ---
export const saveJournal = async (userId: string, entry: JournalEntry) => {
    await networkDelay();
    const allJournals = cloudGet<Record<string, JournalEntry[]>>(CLOUD_KEYS.JOURNALS, {});
    const userJournals = allJournals[userId] || [];
    const encryptedEntry = { ...entry, encryptedText: encryptData(entry.encryptedText) };
    userJournals.push(encryptedEntry);
    allJournals[userId] = userJournals;
    cloudSet(CLOUD_KEYS.JOURNALS, allJournals);
};

export const getJournals = async (userId: string): Promise<JournalEntry[]> => {
    await networkDelay();
    const allJournals = cloudGet<Record<string, JournalEntry[]>>(CLOUD_KEYS.JOURNALS, {});
    const userJournals = allJournals[userId] || [];
    return userJournals.map(j => ({ ...j, encryptedText: decryptData(j.encryptedText) }));
};

// --- Analytics ---
export const getAdminAnalytics = async (metricKey: string, groupBy: string) => {
    await networkDelay();
    const programs = ['MBA-1', 'MBA-2', 'PGDM', 'GMP'];
    const genders = ['Male', 'Female', 'Non-Binary'];
    const years = ['2023', '2024'];
    
    let labels = programs;
    if (groupBy === 'gender') labels = genders;
    if (groupBy === 'year') labels = years;

    return labels.map(label => ({
        name: label,
        value: Math.floor(Math.random() * 40) + 60 
    }));
};