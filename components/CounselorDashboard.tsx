import React, { useState, useEffect } from 'react';
import { MOCK_STUDENTS } from '../constants';
import EnvironmentWidget from './EnvironmentWidget';
import { AlertTriangle, Clock, Activity, Bell, FilePlus, ClipboardList, PlusCircle, Trash2, CheckCircle, XCircle, LogOut, MessageSquare, Send, Mail, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as db from '../services/storage';
import { AppointmentSlot, P2PMessage } from '../types';

// Mock Graph Data
const stressData = [
  { name: 'Mon', sleep: 6, workload: 40 },
  { name: 'Tue', sleep: 5, workload: 70 },
  { name: 'Wed', sleep: 4, workload: 90 }, 
  { name: 'Thu', sleep: 5, workload: 60 },
  { name: 'Fri', sleep: 7, workload: 30 },
];

const CounselorDashboard: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  
  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Input States
  const [taskInput, setTaskInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<P2PMessage[]>([]);
  
  // Scheduling State
  const [pickerDate, setPickerDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Inbox State
  const [conversations, setConversations] = useState<{ studentId: string, lastMessage: P2PMessage | null, unreadCount: number }[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);

  // Derived
  const pendingRequests = slots.filter(s => s.status === 'requested').length;

  // Poll for updates
  useEffect(() => {
    const fetchUpdates = async () => {
        setSlots(await db.getSlots());
        
        // Fetch Inbox Data
        const convos = await db.getCounselorConversations('counselor_dimple');
        setConversations(convos);
        const unread = convos.reduce((acc, curr) => acc + curr.unreadCount, 0);
        setTotalUnread(unread);

        // Fetch active chat details if open
        if (showChatModal && selectedStudent) {
            setChatHistory(await db.getP2PThread('counselor_dimple', selectedStudent));
        }
    };

    const interval = setInterval(fetchUpdates, 3000);
    const init = async () => fetchUpdates();
    init();
    return () => clearInterval(interval);
  }, [showChatModal, selectedStudent]);

  // Actions
  const handleSlotAction = async (slotId: string, action: 'confirm' | 'reject' | 'delete') => {
      if (action === 'delete') await db.deleteSlot(slotId);
      else if (action === 'confirm') await db.updateSlotStatus(slotId, 'confirmed');
      else if (action === 'reject') await db.updateSlotStatus(slotId, 'open');
      setSlots(await db.getSlots());
  };

  const handleIssueLeave = async () => {
      // Confirm Leave Logic
      const emailMap = "mba.rohan@spjimr.org"; 
      await db.issueLeave(emailMap, {
        isActive: true,
        issuedDate: new Date().toLocaleDateString(),
        expiryDate: new Date(Date.now() + 86400000 * 2).toLocaleDateString(),
        issuedBy: "Dr. Dimple Wagle",
        reason: "Counselor Prescribed Rest"
      });
      setShowLeaveModal(false);
      alert("Leave Letter Issued & Sent to Admin.");
  };

  const handleAssignTask = async () => {
     if(!taskInput.trim()) return;
     const emailMap = "mba.rohan@spjimr.org"; 
     await db.assignTask(emailMap, {
         id: Date.now().toString(),
         title: taskInput,
         description: "Prescribed activity.",
         isCompleted: false,
         assignedBy: "Dr. Dimple Wagle"
     });
     setTaskInput('');
     setShowTaskModal(false);
     alert("Task Assigned.");
  };

  const handlePublishSlot = async () => {
      if (!selectedTime) return;
      
      const dateStr = pickerDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      
      await db.createSlot({
          id: Date.now().toString(),
          date: dateStr,
          time: selectedTime,
          counselorName: "Dr. Dimple Wagle",
          status: 'open'
      });
      setSlots(await db.getSlots());
      setShowScheduleModal(false);
      setSelectedTime(null);
  };

  const handleSendMessage = async () => {
      if(!chatInput.trim() || !selectedStudent) return;
      await db.sendP2PMessage({
          id: Date.now().toString(),
          senderId: 'counselor_dimple',
          receiverId: selectedStudent,
          text: chatInput,
          timestamp: new Date().toISOString(),
          isRead: false
      });
      setChatInput('');
      setChatHistory(await db.getP2PThread('counselor_dimple', selectedStudent));
  };

  const openChatFromInbox = async (studentId: string) => {
      setSelectedStudent(studentId);
      await db.markThreadAsRead('counselor_dimple', studentId);
      setShowInboxModal(false);
      setShowChatModal(true);
      setChatHistory(await db.getP2PThread('counselor_dimple', studentId));
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      return { days, firstDay };
  };

  const changeMonth = (delta: number) => {
      const newDate = new Date(pickerDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setPickerDate(newDate);
  };

  const timeSlots = [];
  for (let i = 9; i <= 18; i++) { // 9 AM to 6 PM
      const h = i > 12 ? i - 12 : i;
      const ampm = i >= 12 ? 'PM' : 'AM';
      timeSlots.push(`${h}:00 ${ampm}`);
      timeSlots.push(`${h}:30 ${ampm}`);
  }

  return (
    <div className="h-full bg-gray-50 text-slate-800 font-sans flex flex-col relative">
      
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="bg-[#8A9A5B] p-2 rounded-lg"><Activity className="text-white" size={24} /></div>
          <div><h1 className="text-xl font-bold text-slate-800">SPeakUp <span className="text-slate-400 font-normal">| Command Center</span></h1></div>
        </div>
        <div className="flex items-center gap-6">
          {/* Inbox Alert */}
          <div className="relative">
              <button onClick={() => setShowInboxModal(true)} title="Messages" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Mail className="text-slate-500 hover:text-slate-800" size={20} />
              </button>
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse border-2 border-white">{totalUnread}</span>
             )}
          </div>

          <div className="relative">
             <Bell className="text-slate-500 hover:text-slate-800 cursor-pointer" size={20} />
             {pendingRequests > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-bounce">{pendingRequests}</span>
             )}
          </div>
          <button onClick={() => window.location.reload()} title="Logout">
              <LogOut className="text-slate-400 hover:text-red-500 transition-colors" size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">DW</div>
            <span className="text-sm font-medium">Dr. Dimple Wagle</span>
          </div>
        </div>
      </header>
      
      <EnvironmentWidget variant="counselor" />

      {/* Main Grid */}
      <div className="flex-1 p-8 grid grid-cols-12 gap-6 overflow-hidden">
        
        {/* LEFT: Alerts */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-slate-700">Priority Alerts</h2>
            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold">Live</span>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {MOCK_STUDENTS.map((student, idx) => (
              <div key={idx} onClick={() => setSelectedStudent(student.hashId)} 
                className={`p-4 rounded-lg border cursor-pointer transition-colors group ${selectedStudent === student.hashId ? 'border-[#8A9A5B] ring-1 ring-[#8A9A5B]' : ''} ${student.stressScore > 80 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs text-slate-500">{student.hashId}</span>
                  {student.status === 'High Risk' && <AlertTriangle size={14} className="text-red-500" />}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                     <div className="text-sm font-medium text-slate-700">Stress Score</div>
                     <div className={`text-xl font-bold ${student.stressScore > 80 ? 'text-red-600' : 'text-slate-700'}`}>{student.stressScore}</div>
                  </div>
                  <div className="text-right"><div className="text-xs text-slate-400">Last Active</div><div className="text-xs font-medium text-slate-600">{student.lastCheckIn}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Case File */}
        <div className="col-span-6 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Case File: {selectedStudent || 'Select a student'}</h2>
                <p className="text-sm text-slate-500">{selectedStudent ? 'MBA Year 1 • High Workload detected' : 'Click a student on the left to view details'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowLeaveModal(true)} disabled={!selectedStudent} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50 transition-colors">
                    <FilePlus size={14}/> Issue Leave
                </button>
                <button onClick={() => setShowTaskModal(true)} disabled={!selectedStudent} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 transition-colors">
                    <ClipboardList size={14}/> Assign Task
                </button>
                <button onClick={() => setShowChatModal(true)} disabled={!selectedStudent} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#8A9A5B] text-white rounded-md hover:bg-[#728248] shadow-sm transition-colors disabled:opacity-50">
                    <MessageSquare size={14} /> Chat
                </button>
              </div>
            </div>
            
            <div className="p-6 flex-1">
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={stressData}>
                  <defs>
                    <linearGradient id="colorWorkload" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="workload" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorWorkload)" name="Workload" />
                  <Area type="monotone" dataKey="sleep" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSleep)" name="Sleep" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT: Slot Publisher */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-slate-700">Slot Publisher</h2>
            <button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-2 text-xs bg-[#8A9A5B] text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-[#728248] transition-colors">
                <PlusCircle size={14}/> Schedule Session
            </button>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto">
             {slots.map(slot => (
                 <div key={slot.id} className={`flex flex-col gap-2 p-3 rounded-lg border ${slot.status === 'confirmed' ? 'bg-blue-50 border-blue-100' : slot.status === 'requested' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-slate-400"/>
                            <div>
                                <div className="text-sm font-bold text-slate-700">{slot.time}</div>
                                <div className="text-xs text-slate-500">{slot.date}</div>
                            </div>
                        </div>
                        <button onClick={() => handleSlotAction(slot.id, 'delete')}><Trash2 size={14} className="text-slate-300 hover:text-red-500"/></button>
                     </div>
                     
                     {slot.status === 'requested' && (
                         <div className="mt-2 p-2 bg-white rounded border border-yellow-100">
                             <div className="text-xs text-slate-500 mb-2">Req: {slot.bookedByStudentName}</div>
                             <div className="flex gap-2">
                                 <button onClick={() => handleSlotAction(slot.id, 'confirm')} className="flex-1 bg-green-500 text-white text-xs py-1 rounded hover:bg-green-600">Accept</button>
                                 <button onClick={() => handleSlotAction(slot.id, 'reject')} className="flex-1 bg-red-100 text-red-500 text-xs py-1 rounded hover:bg-red-200">Reject</button>
                             </div>
                         </div>
                     )}

                     {slot.status === 'confirmed' && (
                         <div className="flex items-center gap-1 text-xs text-blue-600 font-bold">
                             <CheckCircle size={12}/> Confirmed: {slot.bookedByStudentName?.split(' ')[0]}
                         </div>
                     )}

                     {slot.status === 'open' && <div className="text-xs text-slate-400 italic">Open for booking</div>}
                 </div>
             ))}
          </div>
        </div>
      </div>

      {/* Leave Modal */}
      {showLeaveModal && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-8 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col h-[80vh]">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-slate-800">Generate Wellness Leave Letter</h3>
                      <button onClick={() => setShowLeaveModal(false)}><XCircle className="text-slate-400 hover:text-red-500"/></button>
                  </div>
                  <div className="flex-1 p-8 bg-gray-50 overflow-y-auto font-serif text-slate-700 leading-relaxed">
                      <p className="mb-8 text-right">Date: {new Date().toLocaleDateString()}</p>
                      <p className="mb-4">To,<br/>The PGDM Office / Admin,<br/>SPJIMR Campus.</p>
                      <p className="mb-4 font-bold underline">Subject: Medical Leave Recommendation for Student ID: {selectedStudent}</p>
                      <p className="mb-4">Respected Sir/Ma'am,</p>
                      <p className="mb-4">
                          This is to certify that the student with ID <strong>{selectedStudent}</strong> has been under my observation and counseling. 
                          Based on their current mental health metrics and our sessions, I strongly recommend a period of rest and recovery.
                      </p>
                      <p className="mb-4">
                          <strong>Recommended Leave Period:</strong> 2 Days<br/>
                          <strong>Reason:</strong> Acute Stress & Burnout Recovery
                      </p>
                      <p className="mb-8">Kindly grant the necessary leave to support their well-being.</p>
                      <p>Sincerely,<br/><br/><strong>Dr. Dimple Wagle</strong><br/>Campus Counselor, SPJIMR</p>
                  </div>
                  <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-4">
                      <button onClick={() => setShowLeaveModal(false)} className="px-4 py-2 text-slate-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                      <button onClick={handleIssueLeave} className="px-6 py-2 bg-[#8A9A5B] text-white rounded-lg shadow-md hover:bg-[#76854d]">Sign & Issue</button>
                  </div>
              </div>
          </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
                  <h3 className="font-bold text-lg mb-4 text-slate-700">Assign Wellness Task</h3>
                  <textarea 
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="Describe the task (e.g. 'Take a 15min walk without phone')..."
                    className="w-full h-32 p-3 border border-gray-200 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-slate-500 text-sm">Cancel</button>
                      <button onClick={handleAssignTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Assign</button>
                  </div>
              </div>
          </div>
      )}

      {/* Inbox Modal */}
      {showInboxModal && (
          <div className="absolute inset-0 z-50 bg-black/20 flex items-start justify-end p-4 animate-in slide-in-from-right duration-200 backdrop-blur-sm">
             <div className="w-80 bg-white rounded-xl shadow-2xl h-[calc(100vh-2rem)] flex flex-col mt-16 mr-4">
                 <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-slate-800 text-white rounded-t-xl">
                     <h3 className="font-bold">Messages</h3>
                     <button onClick={() => setShowInboxModal(false)}><XCircle size={18}/></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-2">
                     {conversations.length === 0 && <p className="text-center text-slate-400 text-xs mt-10">No messages yet.</p>}
                     {conversations.map(c => (
                         <div key={c.studentId} onClick={() => openChatFromInbox(c.studentId)} className="p-3 hover:bg-blue-50 cursor-pointer rounded-lg border border-gray-100">
                             <div className="flex justify-between items-start mb-1">
                                 <span className="font-bold text-sm text-slate-700 truncate w-32">{c.studentId}</span>
                                 <span className="text-[10px] text-slate-400">{new Date(c.lastMessage?.timestamp || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                 <p className="text-xs text-slate-500 truncate w-48">{c.lastMessage?.text}</p>
                                 {c.unreadCount > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full">{c.unreadCount}</span>}
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
          </div>
      )}

      {/* Schedule Session Modal */}
      {showScheduleModal && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
              <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><CalendarIcon size={18}/> Schedule Session</h3>
                <button onClick={() => setShowScheduleModal(false)}><XCircle size={18}/></button>
              </div>
              
              <div className="p-6 flex flex-col gap-6">
                {/* Calendar */}
                <div>
                   <div className="flex justify-between items-center mb-4">
                      <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft size={20}/></button>
                      <h4 className="font-bold text-slate-700">{pickerDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                      <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight size={20}/></button>
                   </div>
                   <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-400 font-bold">
                      <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                   </div>
                   <div className="grid grid-cols-7 gap-1">
                      {/* Padding */}
                      {[...Array(getDaysInMonth(pickerDate).firstDay)].map((_, i) => <div key={`pad-${i}`} />)}
                      {/* Days */}
                      {[...Array(getDaysInMonth(pickerDate).days)].map((_, i) => {
                          const d = i + 1;
                          const isSelected = d === pickerDate.getDate();
                          return (
                              <button 
                                key={d}
                                onClick={() => {
                                    const newD = new Date(pickerDate);
                                    newD.setDate(d);
                                    setPickerDate(newD);
                                }}
                                className={`h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors ${isSelected ? 'bg-[#8A9A5B] text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                              >
                                {d}
                              </button>
                          )
                      })}
                   </div>
                </div>

                {/* Time Picker (Scrollable Roll) */}
                <div>
                   <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Clock size={14}/> Select Time</h4>
                   <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                       {timeSlots.map(t => (
                           <button 
                             key={t} 
                             onClick={() => setSelectedTime(t)}
                             className={`flex-shrink-0 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${selectedTime === t ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white border-gray-200 text-slate-600 hover:border-[#8A9A5B]'}`}
                           >
                             {t}
                           </button>
                       ))}
                   </div>
                </div>

                <button 
                  disabled={!selectedTime}
                  onClick={handlePublishSlot}
                  className="w-full bg-[#8A9A5B] text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#75844d] transition-colors"
                >
                   Publish Slot
                </button>
              </div>
            </div>
          </div>
      )}

      {/* Chat Modal */}
      {showChatModal && (
          <div className="absolute bottom-4 right-4 w-96 h-[500px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 animate-in slide-in-from-bottom duration-300">
              <div className="p-4 bg-slate-800 text-white rounded-t-xl flex justify-between items-center">
                  <h3 className="font-bold text-sm">Chat: {selectedStudent}</h3>
                  <button onClick={() => setShowChatModal(false)}><XCircle size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {chatHistory.map(m => (
                      <div key={m.id} className={`flex ${m.senderId === 'counselor_dimple' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-2 rounded-lg text-sm ${m.senderId === 'counselor_dimple' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}>
                              {m.text}
                          </div>
                      </div>
                  ))}
              </div>
              <div className="p-3 border-t border-gray-200 flex gap-2">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 border rounded px-2 text-sm outline-none" placeholder="Type..." />
                  <button onClick={handleSendMessage} className="bg-blue-600 text-white p-2 rounded"><Send size={16}/></button>
              </div>
          </div>
      )}

    </div>
  );
};

export default CounselorDashboard;