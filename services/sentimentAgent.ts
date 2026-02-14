import { GoogleGenAI, Type } from "@google/genai";
import { Message, AgentAnalysis, WellnessTask } from "../types";
import * as db from './storage';

// ---------------------------------------------------------
// API KEY MANAGEMENT
// The application requires a valid API_KEY.
// If your token expired, generate a new one at aistudio.google.com
// ---------------------------------------------------------
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

/**
 * THE AUTONOMOUS GUARDIAN (SLM)
 * Model: Gemini Flash Lite (Low Latency, Low Cost)
 * Role: Background Clinical Triage & Autonomous Intervention
 */
export const analyzeSentimentAndSchedule = async (
  userId: string,
  userEmail: string,
  recentMessages: Message[]
): Promise<Message | null> => {
  
  // 1. Context Window: Last 6 messages to understand trajectory
  const conversationLog = recentMessages
    .slice(-6)
    .map(m => `${m.role.toUpperCase()}: ${m.text}`)
    .join("\n");

  if (!conversationLog) return null;

  try {
    // 2. The Clinical Reasoning Prompt
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `
        Act as an Autonomous Clinical Triage System called "SParsh Guardian".
        Analyze the conversation below. Your job is to act SILENTLY but DECISIVELY.
        
        RULES:
        1. If user mentions insomnia, panic, or restlessness -> ASSIGN_EXERCISE (e.g., "4-7-8 Breathing").
        2. If user mentions "need to talk", "overwhelmed", or sustained distress -> SUGGEST_BOOKING.
        3. If user mentions self-harm, ending it, or extreme hopelessness -> TRIGGER_SOS.
        4. Otherwise -> NONE.
        
        CONVERSATION LOG:
        ${conversationLog}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentimentScore: { type: Type.NUMBER, description: "0 (Worst) to 100 (Best)" },
            riskLevel: { type: Type.STRING, enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] },
            recommendedAction: { type: Type.STRING, enum: ['NONE', 'SUGGEST_BOOKING', 'ASSIGN_EXERCISE', 'TRIGGER_SOS'] },
            specificExercise: { type: Type.STRING, description: "Name of exercise if applicable" },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });

    const analysis: AgentAnalysis = JSON.parse(response.text || '{}');
    console.log("Guardian Analysis:", analysis);

    // -------------------------------------------------------
    // AUTONOMOUS ACTIONS (DB Writes & Interventions)
    // -------------------------------------------------------

    // ACTION 1: TRIGGER SOS (Guardrails Broken)
    if (analysis.recommendedAction === 'TRIGGER_SOS' || analysis.riskLevel === 'CRITICAL') {
        return {
            id: Date.now().toString(),
            role: 'agent',
            text: "CRITICAL ALERT: I am activating the campus emergency protocol. Help is on the way.",
            timestamp: new Date(),
            metadata: { type: 'crisis_trigger' }
        };
    }

    // ACTION 2: ASSIGN EXERCISE (Proactive Care)
    if (analysis.recommendedAction === 'ASSIGN_EXERCISE' && analysis.specificExercise) {
        // Autonomously write to DB
        const newTask: WellnessTask = {
            id: Date.now().toString(),
            title: analysis.specificExercise,
            description: `Auto-assigned by SParsh Guardian based on your chat about: ${analysis.reasoning}`,
            isCompleted: false,
            assignedBy: "SParsh AI"
        };
        await db.assignTask(userEmail, newTask);

        // Notify User
        return {
            id: Date.now().toString(),
            role: 'agent',
            text: `I noticed you're feeling a bit off-center. I've added a "${analysis.specificExercise}" routine to your Tasks tab. Give it a try?`,
            timestamp: new Date(),
            metadata: { 
                type: 'task_assignment',
                taskName: analysis.specificExercise
            }
        };
    }

    // ACTION 3: SUGGEST BOOKING (Connection)
    if (analysis.recommendedAction === 'SUGGEST_BOOKING') {
        const allSlots = await db.getSlots();
        const openSlots = allSlots.filter(s => s.status === 'open');
        
        if (openSlots.length > 0) {
            const bestSlot = openSlots[0];
            return {
                id: Date.now().toString(),
                role: 'agent',
                text: "It sounds like talking to a human might help clarify things. I found an open slot with Dr. Dimple.",
                timestamp: new Date(),
                metadata: {
                    type: 'booking_suggestion',
                    slotId: bestSlot.id,
                    slotTime: `${bestSlot.date} at ${bestSlot.time}`
                }
            };
        }
    }

    return null; // No intervention needed

  } catch (e) {
    console.error("SLM Agent Error:", e);
    // Silent fail is acceptable for the background agent to prevent disrupting the main chat flow
    return null;
  }
};