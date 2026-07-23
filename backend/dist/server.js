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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http = __importStar(require("http"));
const ws_1 = require("ws");
const dotenv = __importStar(require("dotenv"));
const crypto = __importStar(require("crypto"));
const db_1 = __importDefault(require("./db"));
const agentManager_1 = require("./agents/agentManager");
const ai_1 = require("./ai");
dotenv.config();
const app = (0, express_1.default)();
const server = http.createServer(app);
const wss = new ws_1.WebSocketServer({ noServer: true });
const agentManager = new agentManager_1.AgentManager();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Helper: Hashing passwords with Node's crypto
function hashPassword(pwd) {
    return crypto.createHash('sha256').update(pwd).digest('hex');
}
// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    try {
        const existing = await db_1.default.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const user = await db_1.default.user.create({
            data: {
                email,
                passwordHash: hashPassword(password),
                name,
                commStyle: 'Professional',
                streak: 0
            }
        });
        // Create baseline progress record
        await db_1.default.progress.create({
            data: {
                userId: user.id,
                strengths: 'Excited to learn',
                weaknesses: 'Needs practice',
                practiceTime: 0,
                confidence: 60.0
            }
        });
        return res.status(201).json({ userId: user.id, name: user.name, email: user.email });
    }
    catch (error) {
        console.error('Registration database error:', error);
        return res.status(500).json({ error: 'Authentication service temporarily unavailable.' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    try {
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user || user.passwordHash !== hashPassword(password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        return res.json({ userId: user.id, name: user.name, email: user.email });
    }
    catch (error) {
        console.error('Login database error:', error);
        return res.status(500).json({ error: 'Authentication service temporarily unavailable.' });
    }
});
// --- PROFILE ROUTES ---
app.get('/api/profile', async (req, res) => {
    const userId = parseInt(req.query.userId);
    if (!userId)
        return res.status(400).json({ error: 'Missing userId' });
    try {
        const profile = await agentManager.getMemoryAgent().getUserProfile(userId);
        return res.json(profile);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
app.put('/api/profile', async (req, res) => {
    const { userId, ...updateData } = req.body;
    if (!userId)
        return res.status(400).json({ error: 'Missing userId' });
    try {
        const updated = await agentManager.getMemoryAgent().updateUserProfile(userId, updateData);
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// --- DASHBOARD & ANALYTICS ---
app.get('/api/dashboard', async (req, res) => {
    const userId = parseInt(req.query.userId);
    if (!userId)
        return res.status(400).json({ error: 'Missing userId' });
    try {
        const stats = await agentManager.getProgressAgent().getDashboardStats(userId);
        return res.json(stats);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// --- VOCABULARY & MISTAKES ---
app.get('/api/vocabulary', async (req, res) => {
    const userId = parseInt(req.query.userId);
    if (!userId)
        return res.status(400).json({ error: 'Missing userId' });
    try {
        const vocab = await agentManager.getMemoryAgent().getVocabularyList(userId);
        return res.json(vocab);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
app.get('/api/mistakes', async (req, res) => {
    const userId = parseInt(req.query.userId);
    if (!userId)
        return res.status(400).json({ error: 'Missing userId' });
    try {
        const mistakes = await agentManager.getMemoryAgent().getMistakes(userId);
        return res.json(mistakes);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// --- DAILY LEARNING PLAN ---
app.get('/api/learning-plan', async (req, res) => {
    const userId = parseInt(req.query.userId);
    if (!userId)
        return res.status(400).json({ error: 'Missing userId' });
    const dateStr = new Date().toISOString().split('T')[0];
    try {
        const user = await agentManager.getMemoryAgent().getUserProfile(userId);
        const careerGoal = user?.learningGoals || 'Software Developer';
        const plan = await agentManager.getLearningAgent().getOrCreateDailyPlan(userId, dateStr, careerGoal);
        return res.json(plan);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
app.post('/api/learning-plan/complete', async (req, res) => {
    const { planId } = req.body;
    if (!planId)
        return res.status(400).json({ error: 'Missing planId' });
    try {
        await agentManager.getLearningAgent().completeDailyPlan(planId);
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// --- SESSION REPORTS ---
app.get('/api/reports', async (req, res) => {
    const userId = parseInt(req.query.userId);
    if (!userId)
        return res.status(400).json({ error: 'Missing userId' });
    try {
        const reports = await db_1.default.session.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(reports);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// --- VOCABULARY & PRONUNCIATION TRAINER ROUTES ---
app.get('/api/vocabulary', async (req, res) => {
    const userId = parseInt(req.query.userId);
    if (!userId)
        return res.status(400).json({ error: 'Missing userId' });
    try {
        const vocab = await db_1.default.vocabulary.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(vocab);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
app.post('/api/vocabulary/status', async (req, res) => {
    const { userId, word, status, definition, context } = req.body;
    if (!userId || !word)
        return res.status(400).json({ error: 'Missing parameters' });
    try {
        const existing = await db_1.default.vocabulary.findFirst({
            where: { userId, word }
        });
        if (existing) {
            await db_1.default.vocabulary.update({
                where: { id: existing.id },
                data: { status }
            });
        }
        else {
            await db_1.default.vocabulary.create({
                data: {
                    userId,
                    word,
                    status: status || 'Learned',
                    definition: definition || 'Corporate executive vocabulary term',
                    context: context || 'Used in professional meetings and interviews'
                }
            });
        }
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// --- RESUME & JD PARSER ROUTE ---
app.post('/api/resume/parse', async (req, res) => {
    const { userId, resumeText, jobDescription } = req.body;
    if (!userId || !resumeText) {
        return res.status(400).json({ error: 'Missing userId or resumeText' });
    }
    try {
        const prompt = `
You are an Executive Resume & Candidate Talent Evaluator. Analyze the provided Candidate Resume text and optional target Job Description.

Candidate Resume Text:
"""
${resumeText}
"""

Target Job Description:
"""
${jobDescription || 'Not specified'}
"""

Respond strictly with a valid JSON object matching this schema:
{
  "candidateName": "Extracted name or User",
  "detectedRole": "Primary target software or engineering role detected",
  "primarySkills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
  "experienceSummary": "A concise 2-sentence summary of candidate technical background",
  "interviewFocusAreas": ["System Architecture", "Coding Standards", "Ownership & Problem Solving"],
  "strengthAreas": ["Strong backend experience", "Clear project scope"],
  "recommendedQuestions": [
    "Tell me about a challenging project on your resume.",
    "How do you handle system architecture tradeoffs?"
  ]
}
`;
        const rawJson = await (0, ai_1.generateAnalysis)('Output strictly valid JSON only.', prompt, '', 'gemini-1.5-pro');
        let parsedData = {};
        try {
            const match = rawJson.match(/\{[\s\S]*\}/);
            if (match) {
                parsedData = JSON.parse(match[0]);
            }
            else {
                parsedData = JSON.parse(rawJson);
            }
        }
        catch (e) {
            parsedData = {
                detectedRole: 'Software Developer',
                primarySkills: ['Full-Stack', 'APIs', 'Problem Solving'],
                experienceSummary: 'Experienced candidate in software development and project delivery.',
                interviewFocusAreas: ['Technical Architecture', 'Communication Clarity']
            };
        }
        // Persist parsed resume skills to database User profile
        await db_1.default.user.update({
            where: { id: parseInt(userId) },
            data: {
                resumeText: resumeText.substring(0, 5000),
                parsedSkills: JSON.stringify(parsedData)
            }
        });
        return res.json({ success: true, parsedData });
    }
    catch (error) {
        console.error('Resume parsing error:', error);
        return res.status(500).json({ error: 'Failed to analyze resume.' });
    }
});
// --- PROFILE EDIT & PERMANENT ACCOUNT DELETION ROUTES ---
app.put('/api/user/profile', async (req, res) => {
    const { userId, name, avatarUrl } = req.body;
    if (!userId)
        return res.status(400).json({ error: 'Missing userId' });
    try {
        const updated = await db_1.default.user.update({
            where: { id: parseInt(userId) },
            data: {
                ...(name ? { name } : {}),
                ...(avatarUrl !== undefined ? { avatarUrl } : {})
            }
        });
        return res.json({ success: true, user: { id: updated.id, name: updated.name, avatarUrl: updated.avatarUrl } });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
app.delete('/api/user/delete', async (req, res) => {
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ error: 'Missing userId' });
    const uid = parseInt(userId);
    try {
        // Delete all associated candidate data in database
        await db_1.default.$transaction([
            db_1.default.session.deleteMany({ where: { userId: uid } }),
            db_1.default.progress.deleteMany({ where: { userId: uid } }),
            db_1.default.mistake.deleteMany({ where: { userId: uid } }),
            db_1.default.vocabulary.deleteMany({ where: { userId: uid } }),
            db_1.default.dailyPlan.deleteMany({ where: { userId: uid } }),
            db_1.default.user.delete({ where: { id: uid } })
        ]);
        return res.json({ success: true, message: 'Account and associated records deleted permanently.' });
    }
    catch (error) {
        console.error('Account deletion error:', error);
        return res.status(500).json({ error: 'Failed to delete account permanently.' });
    }
});
// --- WEBSOCKET VOICE SERVER ---
wss.on('connection', (ws) => {
    console.log('New WebSocket connection established.');
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'start-session': {
                    const { sessionId, userId, sessionType, sessionMode, jobDescription, targetRole } = data;
                    const result = await agentManager.startSession(sessionId, userId, sessionType, sessionMode, jobDescription, targetRole);
                    ws.send(JSON.stringify({
                        event: 'session-started',
                        message: result.initialMessage,
                        voiceParams: result.voiceParams
                    }));
                    break;
                }
                case 'user-message': {
                    const { sessionId, text, durationSeconds } = data;
                    const result = await agentManager.processUserMessage(sessionId, text, durationSeconds);
                    ws.send(JSON.stringify({
                        event: 'agent-response',
                        response: result.responseMessage,
                        correction: result.correction,
                        pronunciation: result.pronunciation,
                        speechStats: result.speechStats,
                        voiceParams: result.voiceParams
                    }));
                    break;
                }
                case 'end-session': {
                    const { sessionId } = data;
                    const report = await agentManager.endSession(sessionId);
                    if (report) {
                        ws.send(JSON.stringify({
                            event: 'session-ended',
                            report
                        }));
                    }
                    break;
                }
                default:
                    ws.send(JSON.stringify({ event: 'error', message: 'Unknown action type.' }));
            }
        }
        catch (err) {
            console.error('WebSocket message error:', err);
            ws.send(JSON.stringify({ event: 'error', message: err.message }));
        }
    });
    ws.on('close', () => {
        console.log('WebSocket connection closed.');
    });
});
// Integrate Websocket handling into HTTP Server
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`AI Communication Coach server listening on port ${PORT}`);
});
