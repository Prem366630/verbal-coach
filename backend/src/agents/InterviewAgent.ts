import { generateAnalysis } from '../ai';

export interface InterviewConfig {
  type: 'HR' | 'Technical' | 'Behavioral' | 'Managerial';
  mode: 'Practice' | 'Real';
  jobDescription?: string;
  targetRole?: string;
}

export class InterviewAgent {
  private currentQuestionIndex = 0;
  private questions: string[] = [];
  private lastAnswerWasKnowledgeGap = false;

  /**
   * Initializes interview questions based on config and JD.
   */
  public async initializeInterview(config: InterviewConfig): Promise<string[]> {
    this.currentQuestionIndex = 0;
    this.lastAnswerWasKnowledgeGap = false;

    if (config.jobDescription) {
      // Analyze JD to make customized interview questions
      const prompt = `
        You are the InterviewAgent. Analyze the following Job Description (JD) and role:
        Role: ${config.targetRole || 'Software Professional'}
        Generate exactly 5 highly realistic, custom interview questions (mix of technical, HR, and behavioral) based on the JD details.
        Return them as a JSON string array.
      `;
      try {
        const jdAnalysis = await generateAnalysis(prompt, config.jobDescription);
        this.questions = JSON.parse(jdAnalysis);
        if (Array.isArray(this.questions) && this.questions.length > 0) {
          return this.questions;
        }
      } catch (e) {
        console.warn('Failed to parse dynamic JD questions, using preloaded questions.');
      }
    }

    // Default preloaded questions based on type
    this.questions = this.getDefaultQuestions(config.type);
    return this.questions;
  }

  /**
   * Generates the next question or a dynamic follow-up.
   */
  public async handleResponse(
    userResponse: string,
    history: { role: string; content: string }[],
    config: InterviewConfig
  ): Promise<{ question: string; isFollowUp: boolean; isComplete: boolean }> {
    
    // Check if this answer reveals a knowledge gap
    const lowercase = userResponse.toLowerCase();
    const indicatesKnowledgeGap = 
      lowercase.includes("i don't know") || 
      lowercase.includes("not sure") || 
      lowercase.includes("forgot") || 
      (userResponse.split(' ').length < 4 && lowercase.includes('no'));

    if (indicatesKnowledgeGap && config.mode === 'Practice') {
      this.lastAnswerWasKnowledgeGap = true;
      const topicPrompt = `Identify what technical concept or behavioral skill the user is struggling with based on this history:`;
      const topic = await generateAnalysis(topicPrompt, userResponse, JSON.stringify(history));
      
      return {
        question: `No worries! In professional communication, if you don't know a concept, you can say: "I haven't had the opportunity to work deeply with that specific technology yet, but I understand it is used for...". Let's practice. Can you repeat that, or explain how you would research it?`,
        isFollowUp: true,
        isComplete: false
      };
    }

    if (this.lastAnswerWasKnowledgeGap) {
      this.lastAnswerWasKnowledgeGap = false;
      // Continue to next question
    }

    // Practice Mode: generate a dynamic challenging follow-up
    if (config.mode === 'Practice' && Math.random() > 0.4 && this.currentQuestionIndex > 0) {
      const prompt = `
        You are the Interviewer. The user just answered the question. 
        Challenge their claim or ask a deep follow-up question.
        Example: If they said they built a backend, ask about architecture, performance bottlenecks, or database choices.
        Keep the follow-up concise and professional.
      `;
      const followUp = await generateAnalysis(prompt, userResponse, JSON.stringify(history));
      return {
        question: followUp,
        isFollowUp: true,
        isComplete: false
      };
    }

    // Increment question index
    this.currentQuestionIndex++;

    if (this.currentQuestionIndex >= this.questions.length) {
      return {
        question: "That concludes our interview questions today. Thank you for your time. I will now compile your evaluation report.",
        isFollowUp: false,
        isComplete: true
      };
    }

    return {
      question: this.questions[this.currentQuestionIndex],
      isFollowUp: false,
      isComplete: false
    };
  }

  private getDefaultQuestions(type: 'HR' | 'Technical' | 'Behavioral' | 'Managerial'): string[] {
    switch (type) {
      case 'Technical':
        return [
          "Tell me about a challenging technical architectural design you built and why you chose it.",
          "How do you handle API performance bottlenecks and database indexing?",
          "Can you explain the difference between REST, WebSockets, and gRPC, and when you would use each?",
          "How do you manage state and cache layers in a highly scalable distributed application?",
          "What is your approach to automated testing and continuous integration?"
        ];
      case 'Behavioral':
        return [
          "Tell me about a time you had a conflict with a team member. How did you resolve it?",
          "Describe a situation where a project deadline was at risk and how you handled it.",
          "Give me an example of a mistake you made on the job. What did you learn?",
          "How do you handle scope creep when working on a tight client timeline?",
          "Describe a time you had to explain a complex technical topic to a non-technical stakeholder."
        ];
      case 'Managerial':
        return [
          "How do you delegate tasks among engineers with different skill levels?",
          "Describe your style of mentorship and how you help junior engineers grow.",
          "How do you handle an underperforming engineer in your team?",
          "How do you balance technical debt against building new features?",
          "Tell me about a time you had to align multiple departments around a product roadmap."
        ];
      case 'HR':
      default:
        return [
          "Tell me about yourself and your professional journey.",
          "Why are you interested in joining our company, and what values do you bring?",
          "What are your long-term career aspirations, and where do you see yourself in five years?",
          "What do you consider to be your greatest strengths and weaknesses?",
          "Why should we hire you over other candidates for this role?"
        ];
    }
  }
}
