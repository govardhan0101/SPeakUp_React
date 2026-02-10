import * as storage from '../services/storage';
import { encryptData, decryptData } from '../utils/encryption';
import { sendMessageToSParsh } from '../services/geminiService';
import { analyzeSentimentAndSchedule } from '../services/sentimentAgent';

// Mock AI
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
    GoogleGenAI: class {
        chats = {
            create: () => ({
                sendMessage: vi.fn().mockResolvedValue({ text: 'AI Response' })
            })
        };
        models = {
            generateContent: (...args: any) => mockGenerateContent(...args)
        };
    },
    Type: { OBJECT: 'OBJECT', NUMBER: 'NUMBER', BOOLEAN: 'BOOLEAN', STRING: 'STRING' }
}));

describe('Services', () => {
    
    describe('Encryption', () => {
        it('encrypts and decrypts correctly', () => {
            const original = "Secret Text";
            const enc = encryptData(original);
            expect(enc).not.toBe(original);
            expect(enc).toContain('ENC_');
            const dec = decryptData(enc);
            expect(dec).toBe(original);
        });
    });

    describe('Storage Service', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('initializes slots only if null', async () => {
            // First run
            const slots = await storage.getSlots();
            expect(slots.length).toBeGreaterThan(0); // Mock slots
            
            // Delete all
            localStorage.setItem('speakup_cloud_slots', '[]');
            const emptySlots = await storage.getSlots();
            expect(emptySlots.length).toBe(0); // Should remain empty
        });

        it('saves and retrieves chats', async () => {
            await storage.saveChatMessage('user1', { id: '1', role: 'user', text: 'Hi', timestamp: new Date() });
            const history = await storage.getChatHistory('user1');
            expect(history[0].text).toBe('Hi');
        });
    });

    describe('Sentiment Agent', () => {
        it('detects risk and suggests slot', async () => {
            mockGenerateContent.mockResolvedValueOnce({
                text: JSON.stringify({
                    sentimentScore: 20,
                    riskLevel: 'MODERATE',
                    recommendedAction: 'SUGGEST_BOOKING',
                    reasoning: 'Bad mood'
                })
            });

            // Mock getting slots
            localStorage.setItem('speakup_cloud_slots', JSON.stringify([{ id: 's1', status: 'open', date: 'Today', time: '5pm' }]));

            const msg = await analyzeSentimentAndSchedule('user1', 'test@spjimr.org', [{ id: '1', role: 'user', text: 'I am sad', timestamp: new Date() }]);
            
            expect(msg).not.toBeNull();
            expect(msg?.role).toBe('agent');
            expect(msg?.metadata?.type).toBe('booking_suggestion');
        });
    });
});