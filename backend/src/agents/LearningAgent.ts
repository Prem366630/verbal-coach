import prisma from '../db';
import { generateAnalysis } from '../ai';

export class LearningAgent {
  /**
   * Generates a daily training plan based on user profile and goals.
   */
  public async getOrCreateDailyPlan(userId: number, dateStr: string, careerGoal: string): Promise<any> {
    const existing = await prisma.dailyPlan.findFirst({
      where: { userId, date: dateStr }
    });

    if (existing) {
      return existing;
    }

    // Dynamic generation
    const prompt = `
      You are the LearningAgent of an AI Career and Communication Coach.
      The user's career goal is: "${careerGoal}".
      Generate a realistic, micro-learning plan for today containing:
      1. A grammar topic goal.
      2. A vocabulary category or words to learn.
      3. A pronunciation focal point.
      4. A "Daily Real-World Speaking Mission" (e.g., "Describe how you'd pitch a feature to a client in 2 minutes").
      
      Response Format (JSON only):
      {
        "grammarGoal": "grammar explanation/exercise topic",
        "vocabGoal": "vocabulary list topic",
        "pronunciationGoal": "pronunciation target",
        "speakMission": "actionable mission description"
      }
    `;

    let planData = {
      grammarGoal: 'Master past tense verbs (went vs. go).',
      vocabGoal: 'Technical architecture verbs (optimize, orchestrate, modularize).',
      pronunciationGoal: 'Emphasis on multi-syllable terms (development, comfortable).',
      speakMission: 'Pitch a project you completed in 60 seconds with no filler words.'
    };

    try {
      const generated = await generateAnalysis(prompt, careerGoal);
      const parsed = JSON.parse(generated);
      planData = { ...planData, ...parsed };
    } catch (e) {
      console.warn('Failed to generate daily plan from AI, using defaults.');
    }

    return prisma.dailyPlan.create({
      data: {
        userId,
        date: dateStr,
        ...planData,
        done: false
      }
    });
  }

  /**
   * Updates daily plan progress.
   */
  public async completeDailyPlan(planId: number) {
    return prisma.dailyPlan.update({
      where: { id: planId },
      data: { done: true }
    });
  }
}
