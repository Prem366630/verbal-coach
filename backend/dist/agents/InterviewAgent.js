"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewAgent = void 0;
const ai_1 = require("../ai");
class InterviewAgent {
    currentQuestionIndex = 0;
    questions = [];
    lastAnswerWasKnowledgeGap = false;
    /**
     * Initializes interview questions based on config and JD.
     */
    async initializeInterview(config) {
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
                const jdAnalysis = await (0, ai_1.generateAnalysis)(prompt, config.jobDescription);
                this.questions = JSON.parse(jdAnalysis);
                if (Array.isArray(this.questions) && this.questions.length > 0) {
                    return this.questions;
                }
            }
            catch (e) {
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
    async handleResponse(userResponse, history, config) {
        // Check if this answer reveals a knowledge gap
        const lowercase = userResponse.toLowerCase();
        const indicatesKnowledgeGap = lowercase.includes("i don't know") ||
            lowercase.includes("not sure") ||
            lowercase.includes("forgot") ||
            lowercase.includes("no idea");
        if (indicatesKnowledgeGap && !this.lastAnswerWasKnowledgeGap) {
            this.lastAnswerWasKnowledgeGap = true;
            const followUpPrompt = `
        The candidate responded: "${userResponse}".
        They expressed uncertainty or a knowledge gap. Ask a helpful, supportive follow-up question that guides them to think about how they would approach finding the answer or handling the gap professionally. Keep it concise.
      `;
            const followUpQuestion = await (0, ai_1.generateAnalysis)(followUpPrompt, userResponse);
            return {
                question: followUpQuestion,
                isFollowUp: true,
                isComplete: false
            };
        }
        this.lastAnswerWasKnowledgeGap = false;
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex >= this.questions.length) {
            return {
                question: "That concludes our workplace simulation & interview questions today. Thank you for your time. I will now compile your executive evaluation report.",
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
    getDefaultQuestions(type) {
        switch (type) {
            case 'SystemDesign':
                return [
                    "Walk me through a high-availability system architecture you designed. How did you handle fault tolerance and data replication?",
                    "Suppose your microservices architecture experiences a sudden 10x traffic spike. How do you prevent cascading failures?",
                    "How do you decide between SQL relational schemas versus NoSQL document databases for high-throughput transactional systems?",
                    "Describe your strategy for API rate limiting, authentication, and edge caching using CDNs.",
                    "How do you monitor distributed traces and debug latency bottlenecks across multiple microservices?"
                ];
            case 'STARMethod':
                return [
                    "Describe a high-stakes crisis situation on a project (SITUATION/TASK). What specific actions did you take (ACTION), and what was the quantifiable business outcome (RESULT)?",
                    "Give an example of when you had to convince skeptical executive stakeholders to adopt a major technical direction.",
                    "Tell me about a time when a critical bug occurred in production. How did you lead the incident response and post-mortem?",
                    "Describe a situation where you had to deliver a critical milestone despite missing half your engineering resources.",
                    "Give an example of how you mentored a struggling colleague and helped them improve their technical output."
                ];
            case 'ExecutivePresentation':
                return [
                    "Imagine you are presenting a major Q3 technical roadmap to non-technical C-suite executives. How do you open your presentation to command immediate authority?",
                    "How do you handle hostile or aggressive questions from audience members during a live product demo?",
                    "Explain a complex distributed systems concept (like Paxos or Raft Consensus) in 60 seconds as if presenting to a non-technical audience.",
                    "How do you structure your vocal cadence, body language, and slide deck when pitching a high-value technical proposal?",
                    "Describe your strategy for conducting executive Q&A sessions after a major project presentation."
                ];
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
exports.InterviewAgent = InterviewAgent;
