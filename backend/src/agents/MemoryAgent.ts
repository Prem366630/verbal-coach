import prisma from '../db';

export class MemoryAgent {
  /**
   * Retrieves user profile and history.
   */
  public async getUserProfile(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId }
    });
  }

  /**
   * Updates user goals and profile settings.
   */
  public async updateUserProfile(userId: number, updateData: any) {
    return prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  }

  /**
   * Saves a grammar/pronunciation mistake.
   */
  public async logMistake(userId: number, type: string, original: string, corrected: string, explanation: string) {
    const existing = await prisma.mistake.findFirst({
      where: { userId, type, originalText: original }
    });

    if (existing) {
      return prisma.mistake.update({
        where: { id: existing.id },
        data: { repeatCount: existing.repeatCount + 1 }
      });
    }

    return prisma.mistake.create({
      data: {
        userId,
        type,
        originalText: original,
        correctedText: corrected,
        explanation
      }
    });
  }

  /**
   * Adds or updates a word in the vocabulary bank.
   */
  public async learnWord(userId: number, word: string, definition?: string, context?: string) {
    const wordClean = word.toLowerCase().trim();
    const existing = await prisma.vocabulary.findFirst({
      where: { userId, word: wordClean }
    });

    if (existing) {
      return existing;
    }

    return prisma.vocabulary.create({
      data: {
        userId,
        word: wordClean,
        definition: definition || 'Added from coaching session context.',
        context,
        status: 'Learned'
      }
    });
  }

  /**
   * Retrieves mistakes logs for revision.
   */
  public async getMistakes(userId: number) {
    return prisma.mistake.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Retrieves vocabulary list.
   */
  public async getVocabularyList(userId: number) {
    return prisma.vocabulary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
