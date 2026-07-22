import express from 'express';
import cors from 'cors';
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import prisma from './db';
import { AgentManager } from './agents/agentManager';
import { generateAnalysis } from './ai';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const agentManager = new AgentManager();

app.use(cors());
app.use(express.json());

// Helper: Hashing passwords with Node's crypto
function hashPassword(pwd: string): string {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        name,
        commStyle: 'Professional',
        streak: 0
      }
    });

    // Create baseline progress record
    await prisma.progress.create({
      data: {
        userId: user.id,
        strengths: 'Excited to learn',
        weaknesses: 'Needs practice',
        practiceTime: 0,
        confidence: 60.0
      }
    });

    return res.status(201).json({ userId: user.id, name: user.name, email: user.email });
  } catch (error: any) {
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.json({ userId: user.id, name: user.name, email: user.email });
  } catch (error: any) {
    console.error('Login database error:', error);
    return res.status(500).json({ error: 'Authentication service temporarily unavailable.' });
  }
});

// --- PROFILE ROUTES ---

app.get('/api/profile', async (req, res) => {
  const userId = parseInt(req.query.userId as string);
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const profile = await agentManager.getMemoryAgent().getUserProfile(userId);
    return res.json(profile);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/profile', async (req, res) => {
  const { userId, ...updateData } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const updated = await agentManager.getMemoryAgent().updateUserProfile(userId, updateData);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- DASHBOARD & ANALYTICS ---

app.get('/api/dashboard', async (req, res) => {
  const userId = parseInt(req.query.userId as string);
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const stats = await agentManager.getProgressAgent().getDashboardStats(userId);
    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- VOCABULARY & MISTAKES ---

app.get('/api/vocabulary', async (req, res) => {
  const userId = parseInt(req.query.userId as string);
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const vocab = await agentManager.getMemoryAgent().getVocabularyList(userId);
    return res.json(vocab);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/mistakes', async (req, res) => {
  const userId = parseInt(req.query.userId as string);
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const mistakes = await agentManager.getMemoryAgent().getMistakes(userId);
    return res.json(mistakes);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- DAILY LEARNING PLAN ---

app.get('/api/learning-plan', async (req, res) => {
  const userId = parseInt(req.query.userId as string);
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const dateStr = new Date().toISOString().split('T')[0];

  try {
    const user = await agentManager.getMemoryAgent().getUserProfile(userId);
    const careerGoal = user?.learningGoals || 'Software Developer';
    const plan = await agentManager.getLearningAgent().getOrCreateDailyPlan(userId, dateStr, careerGoal);
    return res.json(plan);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/learning-plan/complete', async (req, res) => {
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ error: 'Missing planId' });

  try {
    await agentManager.getLearningAgent().completeDailyPlan(planId);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- SESSION REPORTS ---

app.get('/api/reports', async (req, res) => {
  const userId = parseInt(req.query.userId as string);
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const reports = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(reports);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- VOCABULARY & PRONUNCIATION TRAINER ROUTES ---

app.get('/api/vocabulary', async (req, res) => {
  const userId = parseInt(req.query.userId as string);
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const vocab = await prisma.vocabulary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(vocab);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/vocabulary/status', async (req, res) => {
  const { userId, word, status, definition, context } = req.body;
  if (!userId || !word) return res.status(400).json({ error: 'Missing parameters' });

  try {
    const existing = await prisma.vocabulary.findFirst({
      where: { userId, word }
    });

    if (existing) {
      await prisma.vocabulary.update({
        where: { id: existing.id },
        data: { status }
      });
    } else {
      await prisma.vocabulary.create({
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
  } catch (error: any) {
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

    const rawJson = await generateAnalysis('Output strictly valid JSON only.', prompt, '', 'gemini-1.5-pro');
    let parsedData: any = {};
    try {
      const match = rawJson.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        parsedData = JSON.parse(rawJson);
      }
    } catch (e) {
      parsedData = {
        detectedRole: 'Software Developer',
        primarySkills: ['Full-Stack', 'APIs', 'Problem Solving'],
        experienceSummary: 'Experienced candidate in software development and project delivery.',
        interviewFocusAreas: ['Technical Architecture', 'Communication Clarity']
      };
    }

    // Persist parsed resume skills to database User profile
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        resumeText: resumeText.substring(0, 5000),
        parsedSkills: JSON.stringify(parsedData)
      }
    });

    return res.json({ success: true, parsedData });
  } catch (error: any) {
    console.error('Resume parsing error:', error);
    return res.status(500).json({ error: 'Failed to analyze resume.' });
  }
});

// --- WEBSOCKET VOICE SERVER ---

wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection established.');

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'start-session': {
          const { sessionId, userId, sessionType, sessionMode, jobDescription, targetRole } = data;
          const result = await agentManager.startSession(
            sessionId,
            userId,
            sessionType,
            sessionMode,
            jobDescription,
            targetRole
          );
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
    } catch (err: any) {
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
