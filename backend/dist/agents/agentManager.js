"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManager = void 0;
const SpeechAgent_1 = require("./SpeechAgent");
const VoiceAgent_1 = require("./VoiceAgent");
const ConversationAgent_1 = require("./ConversationAgent");
const GrammarAgent_1 = require("./GrammarAgent");
const PronunciationAgent_1 = require("./PronunciationAgent");
const InterviewAgent_1 = require("./InterviewAgent");
const EvaluationAgent_1 = require("./EvaluationAgent");
const MemoryAgent_1 = require("./MemoryAgent");
const LearningAgent_1 = require("./LearningAgent");
const ProgressAgent_1 = require("./ProgressAgent");
class AgentManager {
    speechAgent = new SpeechAgent_1.SpeechAgent();
    voiceAgent = new VoiceAgent_1.VoiceAgent();
    conversationAgent = new ConversationAgent_1.ConversationAgent();
    grammarAgent = new GrammarAgent_1.GrammarAgent();
    pronunciationAgent = new PronunciationAgent_1.PronunciationAgent();
    interviewAgent = new InterviewAgent_1.InterviewAgent();
    evaluationAgent = new EvaluationAgent_1.EvaluationAgent();
    memoryAgent = new MemoryAgent_1.MemoryAgent();
    learningAgent = new LearningAgent_1.LearningAgent();
    progressAgent = new ProgressAgent_1.ProgressAgent();
    // Active sessions lookup
    activeSessions = new Map();
    /**
     * Initializes a new session.
     */
    async startSession(sessionId, userId, type, mode, jobDescription, targetRole) {
        const user = await this.memoryAgent.getUserProfile(userId);
        const careerGoal = user?.learningGoals || 'Software Developer';
        const sessionState = {
            sessionId,
            userId,
            type,
            mode,
            coachingMode: mode === 'Practice' || type === 'Conversation',
            history: [],
            startTime: new Date(),
            jobDescription,
            targetRole
        };
        this.activeSessions.set(sessionId, sessionState);
        let initialMessage = '';
        if (type === 'Conversation') {
            initialMessage = `Hello ${user?.name || 'there'}! I am your career coach. Let's practice communicating for your career goal as a ${careerGoal}. What is your biggest challenge currently?`;
        }
        else {
            // Interview initialization
            const config = { type, mode, jobDescription, targetRole: targetRole || careerGoal };
            const questions = await this.interviewAgent.initializeInterview(config);
            initialMessage = questions[0] || 'Let us start the interview. Can you describe your background?';
        }
        sessionState.history.push({ role: 'assistant', content: initialMessage });
        return {
            initialMessage,
            voiceParams: this.voiceAgent.getSpeechParams()
        };
    }
    /**
     * Processes a user statement in real time.
     */
    async processUserMessage(sessionId, text, durationSeconds = 5) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        // 1. Voice Speed Requests
        const requestedSpeed = this.speechAgent.checkSpeedAdjustmentRequest(text);
        if (requestedSpeed) {
            this.voiceAgent.updateVoiceConfig({ speed: requestedSpeed });
        }
        // 2. Speech & Hesitation Analysis
        const stats = this.speechAgent.analyzeSpeech(text, durationSeconds);
        // Save user message to history
        session.history.push({ role: 'user', content: text });
        // 3. Immediate corrections (Tense/Grammar) - only in Practice / Conversation modes
        let correction = null;
        let pronunciation = [];
        if (session.coachingMode) {
            // Pronunciation check
            pronunciation = this.pronunciationAgent.analyzePronunciation(text);
            if (pronunciation.length > 0) {
                pronunciation.forEach(p => {
                    this.memoryAgent.learnWord(session.userId, p.word, p.tip, text);
                });
            }
            // Grammar check
            const gramCorrection = await this.grammarAgent.analyzeGrammar(text);
            if (gramCorrection) {
                correction = gramCorrection;
                // Log mistake in database
                await this.memoryAgent.logMistake(session.userId, 'Grammar', gramCorrection.original, gramCorrection.corrected, gramCorrection.explanation);
                if (gramCorrection.shouldCorrectImmediately) {
                    // Immediately interrupt flow to ask them to repeat the corrected version
                    const responseMessage = `Small correction. Say: "${gramCorrection.corrected}". ${gramCorrection.explanation} Now repeat once.`;
                    session.history.push({ role: 'assistant', content: responseMessage });
                    return {
                        correction,
                        pronunciation,
                        responseMessage,
                        speechStats: stats,
                        voiceParams: this.voiceAgent.getSpeechParams()
                    };
                }
            }
        }
        // 4. Generate general or interview response
        let responseMessage = '';
        if (session.type === 'Conversation') {
            const user = await this.memoryAgent.getUserProfile(session.userId);
            const careerGoal = user?.learningGoals || 'Software Developer';
            responseMessage = await this.conversationAgent.respond(text, session.history, {
                coachingMode: session.coachingMode,
                careerGoal
            });
        }
        else {
            // Interview flow
            const config = {
                type: session.type,
                mode: session.mode,
                jobDescription: session.jobDescription,
                targetRole: session.targetRole
            };
            const nextStep = await this.interviewAgent.handleResponse(text, session.history, config);
            responseMessage = nextStep.question;
            if (nextStep.isComplete) {
                // Handle automated end-of-session trigger if complete
            }
        }
        session.history.push({ role: 'assistant', content: responseMessage });
        return {
            correction,
            pronunciation,
            responseMessage,
            speechStats: stats,
            voiceParams: this.voiceAgent.getSpeechParams()
        };
    }
    /**
     * Concludes a session and generates scores & analytics.
     */
    async endSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            console.warn(`endSession: Session ${sessionId || 'empty'} not active. Ignoring cleanup.`);
            return null;
        }
        const durationMinutes = Math.max(1, Math.round((new Date().getTime() - session.startTime.getTime()) / 60000));
        // Evaluate session
        const report = await this.evaluationAgent.evaluateSession(session.userId, session.sessionId, session.type, session.mode, session.history);
        // Save practice time & update streak
        await this.progressAgent.recordPracticeTime(session.userId, durationMinutes);
        // Remove from active lookup
        this.activeSessions.delete(sessionId);
        return {
            ...report,
            durationMinutes,
            transcript: session.history
        };
    }
    // Getters for other agents
    getMemoryAgent() { return this.memoryAgent; }
    getLearningAgent() { return this.learningAgent; }
    getProgressAgent() { return this.progressAgent; }
}
exports.AgentManager = AgentManager;
