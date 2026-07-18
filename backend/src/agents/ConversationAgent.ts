import { generateAnalysis } from '../ai';

export interface ConversationConfig {
  coachingMode: boolean; // true = coach immediately, false = conversational only (no corrections)
  careerGoal: string;
}

export class ConversationAgent {
  /**
   * Generates the next response for a general coaching conversation.
   */
  public async respond(
    userMessage: string,
    history: { role: string; content: string }[],
    config: ConversationConfig
  ): Promise<string> {
    const isShortAnswer = userMessage.split(/\s+/).length < 4;
    const isOffTopic = this.detectOffTopic(userMessage);

    let prompt = `
      You are the ConversationAgent of an AI Communication and Career Coach.
      Your personality is calm, professional, supportive, and instructive.
      The user's career goal is: "${config.careerGoal}".
      
      Instructions:
      - Always ask exactly ONE question at a time.
      - Keep responses concise and focused (under 3 sentences).
      - Do not lecture on grammar.
    `;

    if (isOffTopic) {
      prompt += `
        - The user's input seems off-topic.
        - Politely acknowledge their point briefly, but guide them naturally back to professional communication or their career goal.
      `;
    } else if (isShortAnswer && config.coachingMode) {
      prompt += `
        - The user gave a very short answer.
        - Encourage them to expand by giving a prompt like: "Could you tell me more about that?" or asking for a specific example.
      `;
    }

    try {
      return await generateAnalysis(prompt, userMessage, JSON.stringify(history));
    } catch (e) {
      return this.fallbackResponse(userMessage, isShortAnswer, isOffTopic, config.careerGoal);
    }
  }

  private detectOffTopic(text: string): boolean {
    const offTopicKeywords = ['weather', 'movie', 'game', 'sports', 'football', 'music', 'joke', 'play'];
    const lowercase = text.toLowerCase();
    return offTopicKeywords.some(keyword => lowercase.includes(keyword));
  }

  private fallbackResponse(
    userMessage: string,
    isShortAnswer: boolean,
    isOffTopic: boolean,
    careerGoal: string
  ): string {
    if (isOffTopic) {
      return "That is interesting! However, to make the most of our practice today, let's connect it back to your career goals. How does communication play a role in that area?";
    }
    if (isShortAnswer) {
      return "I see. Could you expand on that details? For instance, what specific actions did you take or what did you learn?";
    }
    return `That makes sense. In terms of your career goal as a ${careerGoal}, what challenges do you face in daily communication?`;
  }
}
