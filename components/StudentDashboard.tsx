import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Calendar, BookOpen, Activity, Home, CheckSquare, Heart, Lock, User as UserIcon, LogOut, MessageSquare, XCircle, AlertCircle, Cloud, Sparkles, Key } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import SParshAvatar from './SParshAvatar';
import EnvironmentWidget from './EnvironmentWidget';
import { sendMessageToSParsh } from '../services/geminiService';
import { analyzeSentimentAndSchedule } from '../services/sentimentAgent';
import { VIBES } from '../constants';
import { Message, WellnessTask, WellnessLeave, AppointmentSlot, JournalEntry, P2PMessage } from '../types';
import * as db from '../services/storage';
import { useSParsh } from '../contexts/SParshContext';

interface Props {
  triggerCrisis: () => void;
  userEmail: string;
  userId: string;
}

const StudentDashboard: React.FC<Props> = ({ triggerCrisis, userEmail, userId }) => {
  const { vibe, setVibe, setAvatarState } = useSParsh();
  
  const [activeTab, setActiveTab] = useState<'home' | 'journal' | 'tasks' | 'booking'>('home');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Error States
  const [apiError, setApiError] = useState(false);
  const [fallbackConsentNeeded, setFallbackConsentNeeded] = useState(false);
  const [lastUserMessageText, setLastUserMessageText] = useState<string>('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Profile State
  const [showProfile, setShowProfile] = useState(false);

  // Dynamic Data States
  const [tasks, setTasks] = useState<WellnessTask[]>([]);
  const [activeLeave, setActiveLeave] = useState<WellnessLeave | null>(null);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [journalText, setJournalText] = useState('');

  // P2P Chat States
  const [showP2P, setShowP2P] = useState(false);
  const [p2pMessages, setP2PMessages] = useState<P2PMessage[]>([]);
  const [p2pInput, setP2PInput] = useState('');

  // Load Data
  useEffect(() => {
    const loadData = async () => {
        setIsCloudSyncing(true);
        const history = await db.getChatHistory(userId);
        setMessages(history);
        setTasks(await db.getTasks(userEmail));
        setActiveLeave(await db.getActiveLeave(userEmail));
        setSlots(await db.getSlots());
        setIsCloudSyncing(false);
    };
    loadData();
    // Poll slots every 5s
    const interval = setInterval(async () => {
        setSlots(await db.getSlots());
        if(showP2P) {
            setP2PMessages(await db.getP2PThread(userId, 'counselor_dimple'));
        }
    }, 5000); 
    return () => clearInterval(interval);
  }, [userId, userEmail, showP2P]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages]);

  const processMessageSend = async (textToSend: string, forceFallback = false) => {
      setAvatarState('listening');
      setIsLoading(true);
      setApiError(false);
      setFallbackConsentNeeded(false);

      const validHistory = messages.filter(m => !m.text.includes("Token Limit Reached"));
      
      const history = validHistory.map(m => ({ role: m.role === 'agent' ? 'model' : m.role, parts: [{ text: m.text }] }));
      const response = await sendMessageToSParsh(history, textToSend, true, forceFallback || isFallbackMode);
      
      setIsLoading(false);
      setAvatarState('speaking');

      // Check for API Configuration Error (400/403/Invalid Key)
      if (response.text.includes("API key not valid") || response.text.includes("System Error")) {
          setApiError(true);
      }

      if (response.needsFallbackConsent) {
          setFallbackConsentNeeded(true);
          const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: response.text, timestamp: new Date() };
          setMessages(prev => [...prev, modelMsg]);
      } else {
          // Success
          if (response.detectedMood) setVibe(response.detectedMood);
          if (response.isCrisis) triggerCrisis();

          const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: response.text, timestamp: new Date() };
          const updatedMessages = [...validHistory, 
                { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: new Date() } as Message, 
                modelMsg
          ];
          setMessages(updatedMessages);
          
          setIsCloudSyncing(true);
          await db.saveChatMessage(userId, modelMsg);
          setIsCloudSyncing(false);

          // --- TRIGGER AUTONOMOUS AGENT (SLM) ---
          analyzeSentimentAndSchedule(userId, userEmail, updatedMessages).then(async (agentMsg) => {
             if (agentMsg) {
                 // Handle Agent Interventions
                 
                 // 1. Critical SOS Trigger
                 if (agentMsg.metadata?.type === 'crisis_trigger') {
                     triggerCrisis();
                 }

                 // 2. Task Assignment (Refresh UI)
                 if (agentMsg.metadata?.type === 'task_assignment') {
                     setTasks(await db.getTasks(userEmail)); // Refresh tasks instantly
                     // We can optionally switch tabs, but a notification bubble is less intrusive
                 }

                 setMessages(prev => [...prev, agentMsg]);
                 await db.saveChatMessage(userId, agentMsg);
             }
          });
      }
      
      setTimeout(() => setAvatarState('idle'), 3000);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText;
    
    // Add user message to UI
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLastUserMessageText(textToSend); // Save for retry

    setIsCloudSyncing(true);
    await db.saveChatMessage(userId, userMsg);
    setIsCloudSyncing(false);
    
    await processMessageSend(textToSend);
  };

  const handleFallbackConfirm = async () => {
      setIsFallbackMode(true);
      setMessages(prev => prev.slice(0, -1)); 
      await processMessageSend(lastUserMessageText, true);
  };

  const toggleTask = async (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
    await db.toggleTaskCompletion(userEmail, id);
  };

  const handleBookSlot = async (slotId: string) => {
    setIsCloudSyncing(true);
    const userName = userEmail.split('@')[0].replace('.', ' ');
    const success = await db.requestSlot(slotId, userId, userName);
    setIsCloudSyncing(false);
    if (success) {
        setSlots(await db.getSlots());
        alert("Session Requested. Waiting for Counselor Confirmation.");
    } else {
        alert("This slot is no longer available.");
    }
  };

  const handleCancelSlot = async (slotId: string) => {
      setIsCloudSyncing(true);
      await db.updateSlotStatus(slotId, 'open');
      setSlots(await db.getSlots());
      setIsCloudSyncing(false);
  };

  const handleSaveJournal = async () => {
      if(!journalText.trim() || !vibe) return;
      setIsCloudSyncing(true);
      const entry: JournalEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          vibe: vibe,
          encryptedText: journalText
      };
      await db.saveJournal(userId, entry);
      setJournalText('');
      setIsCloudSyncing(false);
      alert("Journal Entry Encrypted & Saved Successfully.");
  };

  const handleP2PSend = async () => {
      if(!p2pInput.trim()) return;
      await db.sendP2PMessage({
          id: Date.now().toString(),
          senderId: userId,
          receiverId: 'counselor_dimple', // Demo ID
          text: p2pInput,
          timestamp: new Date().toISOString(),
          isRead: false
      });
      setP2PInput('');
      setP2PMessages(await db.getP2PThread(userId, 'counselor_dimple'));
  };

  const data = [
    { name: 'Mon', stress: 40 },
    { name: 'Tue', stress: 60 },
    { name: 'Wed', stress: 75 },
    { name: 'Thu', stress: 90 },
    { name: 'Fri', stress: 50 },
    { name: 'Sat', stress: 30 },
    { name: 'Sun', stress: 20 },
  ];

  return (
    <div className="h-full flex flex-col max-w-md mx-auto relative overflow-hidden bg-[#E6DDD0]">
      
      {/* Header */}
      <div className="px-6 py-6 flex justify-between items-center bg-[#E6DDD0] z-10 relative">
        <div>
          <h2 className="text-xl font-bold text-[#708090]">Hi, {userEmail.split('.')[1]?.split('@')[0] || 'Student'}</h2>
          <div className="flex items-center gap-2 mt-1">
             {activeLeave?.isActive && (
                <span className="bg-[#8A9A5B] text-white text-[10px] px-2 py-1 rounded-full animate-pulse">On Wellness Leave</span>
             )}
             {isCloudSyncing && (
                 <span className="flex items-center gap-1 text-[10px] text-blue-500 font-bold animate-pulse">
                     <Cloud size={10} /> Syncing...
                 </span>
             )}
          </div>
        </div>
        <div className="flex gap-2 relative">
             <button onClick={() => setShowP2P(true)} className="neu-icon-btn p-3 rounded-full text-[#708090]">
                 <MessageSquare size={20} />
             </button>
             <button onClick={() => setShowProfile(!showProfile)} className="neu-icon-btn p-3 rounded-full text-[#8A9A5B]">
                <UserIcon size={20} />
             </button>
             
             {showProfile && (
                 <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl p-2 w-40 z-50 animate-in fade-in zoom-in duration-200">
                     <button onClick={() => window.location.reload()} className="w-full text-left px-4 py-2 text-red-500 text-sm font-bold flex items-center gap-2 hover:bg-gray-100 rounded-lg">
                         <LogOut size={14}/> Logout
                     </button>
                 </div>
             )}
        </div>
      </div>

      {/* API Error Banner - Handles Token Expiry */}
      {apiError && (
          <div className="mx-4 mb-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 animate-in slide-in-from-top shadow-md">
              <Key size={20} className="mt-1 flex-shrink-0" />
              <div>
                  <h3 className="font-bold text-sm">Authentication Error</h3>
                  <p className="text-xs">The AI Token has expired. Please update <code>process.env.API_KEY</code> or retry later.</p>
              </div>
          </div>
      )}

      {/* P2P Chat Modal */}
      {showP2P && (
          <div className="absolute inset-0 z-40 bg-[#E6DDD0] flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="p-4 border-b border-gray-300 flex justify-between items-center bg-white/50">
                  <h3 className="font-bold text-[#708090]">Counselor Chat (Encrypted)</h3>
                  <button onClick={() => setShowP2P(false)}><XCircle className="text-slate-400"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {p2pMessages.map(m => (
                      <div key={m.id} className={`flex ${m.senderId === userId ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.senderId === userId ? 'bg-[#8A9A5B] text-white' : 'bg-white text-slate-600'}`}>
                              {m.text}
                          </div>
                      </div>
                  ))}
                  {p2pMessages.length === 0 && <p className="text-center text-slate-400 text-xs mt-10">Start a secure conversation with your counselor.</p>}
              </div>
              <div className="p-4 bg-white/50">
                  <div className="flex gap-2">
                      <input type="text" value={p2pInput} onChange={e => setP2PInput(e.target.value)} placeholder="Type a message..." className="flex-1 p-2 rounded-lg border border-gray-300 outline-none" />
                      <button onClick={handleP2PSend} className="bg-[#8A9A5B] text-white p-2 rounded-lg"><Send size={18}/></button>
                  </div>
              </div>
          </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-32 px-4 scrollbar-hide">
        
        {activeTab === 'home' && (
          <>
             <EnvironmentWidget variant="student" />
            <SParshAvatar />
            
            <div className="space-y-4 mb-8 min-h-[200px]">
               {messages.length === 0 && (
                 <div className="text-center text-[#708090]/60 italic mt-[-20px] mb-4">
                   "Your chat history is encrypted in the cloud. How are you feeling right now?"
                 </div>
               )}
               {messages.map(msg => (
                 <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                   
                   {/* AGENTIC MESSAGE (SLM INTERVENTION) */}
                   {msg.role === 'agent' ? (
                       <div className="w-[85%] bg-white border border-[#8A9A5B] p-4 rounded-xl shadow-lg animate-in slide-in-from-left duration-500 mb-2">
                           <div className="flex items-center gap-2 mb-2 text-[#8A9A5B] font-bold text-xs">
                               <Sparkles size={12}/> SParsh Guardian
                           </div>
                           <p className="text-sm text-slate-600 mb-3">{msg.text}</p>
                           
                           {/* Slot Booking Widget */}
                           {msg.metadata?.type === 'booking_suggestion' && msg.metadata.slotId && (
                               <button 
                                 onClick={() => handleBookSlot(msg.metadata!.slotId!)}
                                 className="w-full bg-[#8A9A5B] text-white py-2 rounded-lg text-xs font-bold hover:bg-[#728248] transition-colors flex items-center justify-center gap-2">
                                 <Calendar size={12}/> Book: {msg.metadata.slotTime}
                               </button>
                           )}

                           {/* Task Assigned Widget */}
                           {msg.metadata?.type === 'task_assignment' && (
                               <div className="w-full bg-blue-50 text-blue-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-blue-100">
                                   <CheckSquare size={12}/> Task Added: {msg.metadata.taskName}
                               </div>
                           )}
                       </div>
                   ) : (
                       // STANDARD CHAT MESSAGE
                       <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed
                         ${msg.role === 'user' ? 'bg-[#8A9A5B] text-white rounded-br-none shadow-md' : 'neu-flat text-[#708090] rounded-bl-none'}`}>
                         {msg.text}
                       </div>
                   )}
                   
                   {msg.text.includes("Token Limit Reached") && fallbackConsentNeeded && msg.role === 'model' && (
                       <div className="mt-2 flex gap-2 animate-in fade-in duration-300">
                           <button onClick={handleFallbackConfirm} className="bg-[#CC5500] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:scale-105 transition-transform">
                               Yes, Switch Model
                           </button>
                           <button onClick={() => setFallbackConsentNeeded(false)} className="bg-gray-300 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-400 transition-colors">
                               Wait for Reset
                           </button>
                       </div>
                   )}
                 </div>
               ))}
               {isLoading && <div className="text-center text-xs text-slate-400 animate-pulse">SParsh is listening...</div>}
               <div ref={messagesEndRef} />
            </div>

            <div className="neu-pressed rounded-full p-2 flex items-center pr-2 mb-6">
               <input 
                 type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Speak to SParsh..."
                 className="flex-1 bg-transparent border-none outline-none px-4 text-[#708090] placeholder-slate-400"
               />
               <button onClick={handleSend} className="bg-[#8A9A5B] text-white p-2 rounded-full shadow-md"><Send size={18} /></button>
            </div>

            <div className="flex items-center gap-1 justify-center mb-6 text-[10px] text-slate-400">
                <Lock size={10} /> End-to-End Encrypted Cloud Storage
                {isFallbackMode && <span className="ml-2 text-orange-500 font-bold flex items-center gap-1"> <AlertCircle size={10}/> Fallback Model Active</span>}
            </div>

            <div className="neu-pressed rounded-3xl p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#708090] flex items-center gap-2"><Activity size={16}/> Workload Meter</h3>
                <span className="text-xs bg-[#CC5500]/10 text-[#CC5500] px-2 py-1 rounded-full">Peak Load</span>
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <Tooltip />
                    <Area type="monotone" dataKey="stress" stroke="#CC5500" fillOpacity={0.2} fill="#CC5500" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === 'tasks' && (
           <div className="animate-in slide-in-from-bottom-10 duration-500 space-y-6">
             <h2 className="text-2xl font-bold text-[#708090]">Wellness Routines</h2>
             {activeLeave?.isActive && (
                <div className="neu-flat p-6 rounded-2xl border-l-4 border-[#8A9A5B]">
                   <h3 className="text-lg font-bold text-[#8A9A5B] mb-1">Wellness Leave Active</h3>
                   <p className="text-xs text-[#708090] mb-4">Issued by {activeLeave.issuedBy} until {activeLeave.expiryDate}</p>
                </div>
             )}
             {tasks.length === 0 && <p className="text-center text-slate-400 mt-10">No tasks assigned yet.</p>}
             <div className="space-y-4">
               {tasks.map(task => (
                 <div key={task.id} onClick={() => toggleTask(task.id)} className={`p-4 rounded-2xl flex items-center gap-4 transition-all cursor-pointer ${task.isCompleted ? 'neu-pressed opacity-60' : 'neu-flat'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.isCompleted ? 'border-[#8A9A5B] bg-[#8A9A5B]' : 'border-slate-400'}`}>
                      {task.isCompleted && <CheckSquare size={14} className="text-white"/>}
                    </div>
                    <div>
                       <h4 className={`font-bold ${task.isCompleted ? 'text-slate-400 line-through' : 'text-[#708090]'}`}>{task.title}</h4>
                       <p className="text-xs text-slate-400">Assigned by {task.assignedBy}</p>
                    </div>
                 </div>
               ))}
             </div>
           </div>
        )}

        {activeTab === 'journal' && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
             <h3 className="text-xl font-bold text-[#708090] mb-6">Vibe Check</h3>
             <div className="grid grid-cols-2 gap-4 mb-8">
               {VIBES.map(v => (
                 <button key={v.type} onClick={() => setVibe(v.type)}
                   className={`p-6 rounded-2xl transition-all duration-300 flex flex-col items-center gap-2 ${vibe === v.type ? 'neu-pressed ring-2 ring-[#8A9A5B]' : 'neu-flat hover:-translate-y-1'}`}>
                   <div className="w-8 h-8 rounded-full" style={{ backgroundColor: v.color }}></div>
                   <span className="text-sm font-medium text-[#708090]">{v.label}</span>
                 </button>
               ))}
             </div>
             <div className="neu-pressed rounded-2xl p-4">
               <textarea 
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Pour it out here. It's encrypted..." 
                className="w-full bg-transparent border-none outline-none h-40 text-[#708090] placeholder-slate-400 resize-none"
               />
               <div className="flex justify-end mt-2">
                 <button onClick={handleSaveJournal} className="bg-[#8A9A5B] text-white px-6 py-2 rounded-full shadow-lg text-sm active:scale-95 transition-transform">Encrypt & Save</button>
               </div>
             </div>
          </div>
        )}

        {activeTab === 'booking' && (
          <div className="animate-in slide-in-from-right-10 duration-500 space-y-4">
            <h3 className="text-xl font-bold text-[#708090] mb-6">Book a Sanctuary Slot</h3>
            {slots.map(slot => {
                const isMyBooking = slot.bookedByStudentId === userId;
                let btnText = 'Select';
                let btnClass = 'bg-[#E6DDD0] text-[#8A9A5B] border border-[#8A9A5B]';
                let statusText = '';
                
                if (slot.status === 'confirmed') {
                    btnText = isMyBooking ? 'Confirmed' : 'Taken';
                    btnClass = isMyBooking ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400';
                    statusText = isMyBooking ? 'Slot Confirmed' : '';
                } else if (slot.status === 'requested') {
                    btnText = isMyBooking ? 'Cancel Req' : 'Pending';
                    btnClass = isMyBooking ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-400';
                    statusText = isMyBooking ? 'Waiting Approval' : '';
                }

                return (
                  <div key={slot.id} className="neu-flat p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#708090]">{slot.counselorName}</div>
                      <div className="text-sm text-slate-400">{slot.date} • {slot.time}</div>
                      {statusText && <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">{statusText}</div>}
                    </div>
                    <button 
                      disabled={slot.status !== 'open' && !isMyBooking} 
                      onClick={() => {
                          if (slot.status === 'open') handleBookSlot(slot.id);
                          if (isMyBooking && slot.status === 'requested') handleCancelSlot(slot.id);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 ${btnClass}`}>
                      {btnText}
                    </button>
                  </div>
                );
            })}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-[#E6DDD0] border-t border-[#c4bcb1] p-2 pb-6 flex justify-around items-center z-20">
         <button onClick={() => setActiveTab('home')} className={`p-2 rounded-full transition-colors ${activeTab === 'home' ? 'text-[#8A9A5B]' : 'text-slate-400'}`}><Home size={24} /></button>
         <button onClick={() => setActiveTab('tasks')} className={`p-2 rounded-full transition-colors ${activeTab === 'tasks' ? 'text-[#8A9A5B]' : 'text-slate-400'}`}><CheckSquare size={24} /></button>
         <div className="w-12 h-12 -mt-8 rounded-full bg-[#8A9A5B] flex items-center justify-center shadow-lg text-white animate-pulse"><Heart size={24} fill="white" /></div>
         <button onClick={() => setActiveTab('journal')} className={`p-2 rounded-full transition-colors ${activeTab === 'journal' ? 'text-[#8A9A5B]' : 'text-slate-400'}`}><BookOpen size={24} /></button>
         <button onClick={() => setActiveTab('booking')} className={`p-2 rounded-full transition-colors ${activeTab === 'booking' ? 'text-[#8A9A5B]' : 'text-slate-400'}`}><Calendar size={24} /></button>
      </div>
    </div>
  );
};

export default StudentDashboard;