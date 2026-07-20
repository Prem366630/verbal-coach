import { SpeechAgent } from './SpeechAgent';
import { VoiceAgent } from './VoiceAgent';
import { ConversationAgent } from './ConversationAgent';
import { GrammarAgent } from './GrammarAgent';
import { PronunciationAgent } from './PronunciationAgent';
import { InterviewAgent, InterviewConfig } from './InterviewAgent';
import { EvaluationAgent } from './EvaluationAgent';
import { MemoryAgent } from './MemoryAgent';
import { LearningAgent } from './LearningAgent';
import { ProgressAgent } from './ProgressAgent';

export interface SessionState {
  sessionId: string;
  userId: number;
  type: 'Conversation' | 'HR' | 'Technical' | 'Behavioral';
  mode: 'Practice' | 'Real';
  coachingMode: boolean;
  history: { role: string; content: string }[];
  startTime: Date;
  jobDescription?: string;
  targetRole?: string;
}

export class AgentManager {
  private speechAgent = new SpeechAgent();
  private voiceAgent = new VoiceAgent();
  private conversationAgent = new ConversationAgent();
  private grammarAgent = new GrammarAgent();
  private pronunciationAgent = new PronunciationAgent();
  private interviewAgent = new InterviewAgent();
  private evaluationAgent = new EvaluationAgent();
  private memoryAgent = new MemoryAgent();
  private learningAgent = new LearningAgent();
  private progressAgent = new ProgressAgent();

  // Active sessions lookup
  private activeSessions = new Map<string, SessionState>();

  /**
   * Initializes a new session.
   */
  public async startSession(
    sessionId: string,
    userId: number,
    type: SessionState['type'],
    mode: SessionState['mode'],
    jobDescription?: string,
    targetRole?: string
  ): Promise<{ initialMessage: string; voiceParams: any }> {
    const user = await this.memoryAgent.getUserProfile(userId);
    const careerGoal = user?.learningGoals || 'Software Developer';

    const sessionState: SessionState = {
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
      const greetings = [
        `Hello ${user?.name || 'there'}! As your communication coach, let's work on your career goal: "${careerGoal}". What specific scenario or topic would you like to practice today?`,
        `Hi ${user?.name || 'there'}! Let's sharpen your English and communication for your target role as a ${careerGoal}. What is the biggest communication challenge you faced recently?`,
        `Hello ${user?.name || 'there'}! Ready for today's session? In your career as a ${careerGoal}, clear communication is key. What area or project do you want to describe to me first?`,
        `Welcome back, ${user?.name || 'there'}. Let's target your speaking confidence and vocabulary for the ${careerGoal} role. Tell me, how was your day, and did you have any technical or professional discussions today?`
      ];
      initialMessage = greetings[Math.floor(Math.random() * greetings.length)];
    } else {
      // Interview initialization
      const config: InterviewConfig = { type, mode, jobDescription, targetRole: targetRole || careerGoal };
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
  public async processUserMessage(
    sessionId: string,
    text: string,
    durationSeconds: number = 5
  ): Promise<{
    interrupted?: boolean;
    correction?: any;
    pronunciation?: any[];
    responseMessage: string;
    speechStats: any;
    voiceParams: any;
  }> {
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
    let pronunciation: any[] = [];

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
        await this.memoryAgent.logMistake(
          session.userId,
          'Grammar',
          gramCorrection.original,
          gramCorrection.corrected,
          gramCorrection.explanation
        );

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
    } else {
      // Interview flow
      const config: InterviewConfig = {
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
  public async endSession(sessionId: string): Promise<any> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`endSession: Session ${sessionId || 'empty'} not active. Ignoring cleanup.`);
      return null;
    }

    const durationMinutes = Math.max(1, Math.round((new Date().getTime() - session.startTime.getTime()) / 60000));
    
    // Evaluate session
    const report = await this.evaluationAgent.evaluateSession(
      session.userId,
      session.sessionId,
      session.type,
      session.mode,
      session.history
    );

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
  public getMemoryAgent() { return this.memoryAgent; }
  public getLearningAgent() { return this.learningAgent; }
  public getProgressAgent() { return this.progressAgent; }
}
