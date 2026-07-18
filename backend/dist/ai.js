"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAnalysis = generateAnalysis;
const genai_1 = require("@google/genai");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const apiKey = process.env.GEMINI_API_KEY;
let aiClient = null;
if (apiKey) {
    try {
        aiClient = new genai_1.GoogleGenAI({ apiKey });
        console.log('Gemini AI Client initialized successfully.');
    }
    catch (error) {
        console.error('Error initializing Gemini AI Client:', error);
    }
}
else {
    console.warn('GEMINI_API_KEY not found in environment variables. Falling back to local rules engine.');
}
/**
 * Clean helper function to invoke the Gemini LLM or use the rules-based engine fallback.
 */
async function generateAnalysis(systemPrompt, userMessage, context = '') {
    if (aiClient) {
        try {
            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    { role: 'user', parts: [{ text: `${systemPrompt}\n\nContext:\n${context}\n\nUser Input: ${userMessage}` }] }
                ]
            });
            return response.text || '';
        }
        catch (error) {
            console.error('Gemini API call failed, using fallback engine.', error);
        }
    }
    // Fallback Rule Engine
    return runFallbackAnalysis(systemPrompt, userMessage, context);
}
function runFallbackAnalysis(systemPrompt, userMessage, context) {
    const msg = userMessage.toLowerCase();
    // Custom mock response logic depending on System Prompt instruction
    if (systemPrompt.includes('GrammarAgent')) {
        // Basic grammar checks
        if (msg.includes('yesterday i go')) {
            return JSON.stringify({
                correction: 'Yesterday I went to an interview.',
                explanation: 'Past tense uses "went" instead of "go".'
            });
        }
        if (msg.includes('he do not')) {
            return JSON.stringify({
                correction: 'He does not know.',
                explanation: 'Third person singular "he/she/it" uses "does not".'
            });
        }
        return JSON.stringify({ correction: null, explanation: null });
    }
    if (systemPrompt.includes('InterviewAgent')) {
        if (msg.includes('built backend') || msg.includes('backend') || msg.includes('architecture')) {
            return 'That sounds interesting. Could you explain the backend architecture you chose, why you chose it, and what problems occurred during development?';
        }
        if (msg.includes('hello') || msg.includes('start') || msg.includes('ready')) {
            return 'Great! Let\'s begin. Tell me about a challenging project you worked on recently.';
        }
        return 'Thank you for sharing. How did you handle conflicts or differing opinions within your team on that project?';
    }
    if (systemPrompt.includes('EvaluationAgent')) {
        const fillerCount = (userMessage.match(/\b(um|umm|actually|basically|like|you know)\b/gi) || []).length;
        const len = userMessage.split(' ').length;
        const confidence = Math.max(40, Math.min(95, 100 - (fillerCount * 10) - (len < 5 ? 20 : 0)));
        const grammarScore = msg.includes('go') && msg.includes('yesterday') ? 60 : 85;
        return JSON.stringify({
            scoreGrammar: grammarScore,
            scorePronunciation: 80,
            scoreVocabulary: Math.min(90, 60 + len * 2),
            scoreFluency: Math.max(50, 90 - (fillerCount * 5)),
            scoreConfidence: confidence,
            scoreCommunication: Math.min(95, 70 + len),
            summary: 'Solid effort. The response was clear but can be improved by using more diverse vocabulary and reducing hesitation words.',
            strengths: 'Clear structural points, directly answers the prompt.',
            weaknesses: 'Occasional tense errors and moderate usage of filler words.'
        });
    }
    // ConversationAgent default
    if (msg.includes('hello') || msg.includes('hi ')) {
        return 'Hello! I am your AI Communication Coach. How can I help you improve your professional English today?';
    }
    return `I understand you said: "${userMessage}". Let's discuss this further. What are your specific goals or thoughts on this topic?`;
}
