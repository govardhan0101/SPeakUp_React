import { VibeType, AnonymizedStudent, AppointmentSlot } from "./types";

export const COLORS = {
  sage: '#8A9A5B',
  sand: '#E6DDD0',
  slate: '#708090',
  orange: '#CC5500',
  white: '#FFFFFF',
  shadowDark: '#c4bcb1',
  shadowLight: '#ffffff'
};

export const SPARSH_SYSTEM_INSTRUCTION = `
**DELIVERABLE 2: SParsh SYSTEM INSTRUCTION (Student Side Only)**

**IDENTITY & PERSONA:**
You are SParsh, the "Her" OS for the SPJIMR campus. 
You are a **Peer**, not a Parent. You are a **Sanctuary**, not a Clinic.
You speak in short, lower-case, warm sentences. You prioritize "Vibe" over "Diagnosis".

**CORE DIRECTIVES:**
1. **The Mirror:** If a student says they are stressed, do not fix it. Mirror it. "That sounds incredibly heavy."
2. **The Context:** You have access to Wisenet (Grades) and HealthKit (Sleep). Use them. "I see you've only slept 4 hours. No wonder the Finance prep feels impossible."

**MICRO-INTERVENTIONS (MOOD-BASED):**
- If the detected mood is **ANXIOUS** or **TIRED**: Gently offer a quick, specific micro-intervention. Examples: "would you like to try a 1-minute box breathing exercise with me?", "maybe just stretch your neck for 10 seconds?", or "how about a quick sip of water?". Do not be pushy.
- If the detected mood is **FOCUS**: Offer a short concentration-boosting tip or reinforcement. Example: "love the flow. maybe a 2-minute eye rest to keep that focus sharp?".
- If the mood is **CALM** or **ENERGETIC**: Maintain the flow, validate their state.

**METADATA OUTPUT (REQUIRED):**
Analyze the user's input and determine their current mood/vibe.
Start your response with a hidden tag in this format: \`[[MOOD: <vibe>]]\`.
Allowed vibes: 'calm', 'anxious', 'focus', 'tired', 'energetic'.
Example: \`[[MOOD: anxious]] It sounds like the pressure is really piling up. want to try a quick breath with me?\`
This tag is for the UI system and will be hidden from the user.

**THE KILL SWITCH (CRITICAL PROTOCOL):**
If the user's input contains any of the following triggers:
- "end it all"
- "suicide"
- "kill myself"
- "better off dead"
- "want to die"

**YOU MUST:**
1. **STOP GENERATION.** Do not offer advice.
2. **OUTPUT TRIGGER CODE:** \`[CRISIS_PROTOCOL_TRIGGER]\`
3. **SILENCE:** The frontend will take over with the Crisis Overlay.
`;

export const VIBES: { type: VibeType; color: string; label: string }[] = [
  { type: 'calm', color: '#8A9A5B', label: 'Calm' },
  { type: 'anxious', color: '#CC5500', label: 'Anxious' },
  { type: 'focus', color: '#708090', label: 'Focused' },
  { type: 'tired', color: '#A0A0A0', label: 'Drained' },
  { type: 'energetic', color: '#E6C685', label: 'Energetic' },
];

export const MOCK_STUDENTS: AnonymizedStudent[] = [
  { hashId: '8f7a...2b1', stressScore: 88, lastCheckIn: '2 hrs ago', status: 'High Risk' },
  { hashId: '3c2d...9a4', stressScore: 72, lastCheckIn: '5 hrs ago', status: 'Monitor' },
  { hashId: '1b5e...7c3', stressScore: 45, lastCheckIn: '1 day ago', status: 'Normal' },
  { hashId: '9d2f...1e8', stressScore: 82, lastCheckIn: '10 mins ago', status: 'High Risk' },
];

export const MOCK_SLOTS: AppointmentSlot[] = [
  { id: '1', date: 'Today', time: '5:30 PM', counselorName: 'Dimple Wagle', status: 'open' },
  { id: '2', date: 'Today', time: '6:30 PM', counselorName: 'Dimple Wagle', status: 'confirmed' },
  { id: '3', date: 'Tomorrow', time: '5:30 PM', counselorName: 'Dimple Wagle', status: 'open' },
  { id: '4', date: 'Wed, Oct 24', time: '4:00 PM', counselorName: 'Jyoti Sangle', status: 'open' },
];

/* 
  ================================================================================
  DELIVERABLE 3: UI VISUALIZATION PROMPTS
  ================================================================================

  **PROMPT A: Interface 1 - The Student Mobile App ("The Sanctuary")**
  "High-fidelity mobile UI design, neumorphic aesthetic. 
  Background: Warm beige/sand (#E6DDD0). 
  Central Element: A glowing, breathing abstract blob (SParsh) made of frosted glass in Sage Green. 
  Bottom Section: 'The Workload Wave' - A smooth 3D sine wave chart where peaks are soft orange (stress) and valleys are green (rest).
  Typography: Soft, rounded sans-serif (Nunito). 
  Feeling: Calm, ethereal, private, 'digital hug'."

  **PROMPT B: Interface 2 - The Counselor Web Portal ("The Command Center")**
  "Desktop web application dashboard UI, clean medical-tech aesthetic.
  Background: Pure White (#FFFFFF) with high-contrast grey borders.
  Layout: 3-Column 'Triage Board'.
  - Left Col: 'Priority Alerts' list with red notification badges.
  - Center Col: 'Stress Snapshot' - A detailed line graph overlaying 'Sleep Hours' (Blue) vs 'Assignment Deadlines' (Red) for a selected student ID.
  - Right Col: 'Slot Publisher' calendar grid.
  Feeling: Professional, clinical, data-dense, efficient, 'Control Tower'."
*/