import { GoogleGenAI, Type } from "@google/genai";
import { SPARSH_SYSTEM_INSTRUCTION } from "../constants";
import { VibeType } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const sendMessageToSParsh = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
  useThinking: boolean = true,
  useFallback: boolean = false
): Promise<{ text: string; isCrisis: boolean; detectedMood?: VibeType; modelUsed: 'primary' | 'fallback' }> => {
  
  // 1. Client-side "Kill Switch" pre-check for zero latency safety
  const crisisKeywords = [/suicide/i, /kill myself/i, /end it all/i, /want to die/i, /self-harm/i];
  if (crisisKeywords.some(rx => rx.test(newMessage))) {
    return {
      text: "I am activating the safety protocol. Please hold on.",
      isCrisis: true,
      modelUsed: 'primary'
    };
  }

  // Model Selection Logic
  // Primary: gemini-3-pro-preview (Thinking) or gemini-3-flash-preview (Fast)
  // Fallback: gemini-3-flash-preview (Stable/Available)
  const modelId = useFallback ? 'gemini-3-flash-preview' : (useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview');
  const modelUsed = useFallback ? 'fallback' : 'primary';
  
  // Configure thinking budget if using Pro model and NOT in fallback
  const thinkingConfig = (useThinking && !useFallback) ? { thinkingBudget: 32768 } : undefined;

  try {
    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: SPARSH_SYSTEM_INSTRUCTION,
        thinkingConfig: thinkingConfig,
        temperature: 0.7,
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      })),
    });

    const result = await chat.sendMessage({
      message: newMessage
    });

    let text = result.text || "I'm having trouble connecting to my thoughts right now.";
    let detectedMood: VibeType | undefined = undefined;
    
    // 2. Parse Hidden Mood Tag [[MOOD: <vibe>]]
    const moodMatch = text.match(/\[\[MOOD:\s*(\w+)\]\]/i);
    if (moodMatch && moodMatch[1]) {
        const rawMood = moodMatch[1].toLowerCase();
        if (['calm', 'anxious', 'focus', 'tired', 'energetic'].includes(rawMood)) {
            detectedMood = rawMood as VibeType;
        }
        // Remove tag from user-facing text
        text = text.replace(moodMatch[0], '').trim();
    }

    // 3. Check for Crisis Trigger
    const isCrisis = text.includes("[CRISIS_PROTOCOL_TRIGGER]");
    
    if (isCrisis) {
      text = "I hear you, and I am concerned. Please hold on while I connect you to support.";
    }

    return { text, isCrisis, detectedMood, modelUsed };

  } catch (error: any) {
    console.error(`SParsh Error (${modelId}):`, error);

    // Extract Status/Code robustly
    const status = error?.status || error?.response?.status;
    const code = error?.code || error?.error?.code; 
    const msg = error?.message || JSON.stringify(error);

    // HANDLER: 404 NOT FOUND (Model doesn't exist/unavailable)
    // If the primary model fails, automatically try the fallback.
    if (status === 404 || code === 404 || msg.includes("404") || msg.includes("NOT_FOUND")) {
        if (!useFallback) {
            console.log("Primary model not found (404). Auto-switching to fallback model...");
            return sendMessageToSParsh(history, newMessage, false, true);
        } else {
             return { text: "System Error: Unable to access AI models. Please contact support.", isCrisis: false, modelUsed: 'fallback' };
        }
    }

    // HANDLER: 429 RESOURCE EXHAUSTED (Quota)
    if (status === 429 || code === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      if (!useFallback) {
          console.log("Quota limit reached on primary model. Auto-switching to fallback...");
          return sendMessageToSParsh(history, newMessage, false, true);
      } else {
          // Even fallback failed
          return { 
            text: "I'm currently overwhelmed with conversations (Quota Exceeded). Please give me a moment to recharge and try again later.", 
            isCrisis: false,
            modelUsed: 'fallback'
          };
      }
    }

    // Handle API Key error gracefully
    if (msg.includes("API key not valid")) {
        return { text: "System Error: API key not valid. Please check configuration.", isCrisis: false, modelUsed: modelUsed };
    }

    return { text: "I'm feeling a bit disconnected. Can we try again in a moment?", isCrisis: false, modelUsed: modelUsed };
  }
};

export const getResourcesNearby = async (lat: number, lng: number, query: string = "mental health clinics") => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Find ${query} near me.`,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: {
                        latLng: {
                            latitude: lat,
                            longitude: lng
                        }
                    }
                }
            }
        });
        
        return response.text;
    } catch (e) {
        console.error("Maps Error", e);
        return "Unable to fetch location data right now.";
    }
}