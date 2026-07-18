import prisma from '../db';

export class ProgressAgent {
  /**
   * Tracks user practice duration and updates daily streaks.
   */
  public async recordPracticeTime(userId: number, minutesPlayed: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    let progress = await prisma.progress.findFirst({ where: { userId } });
    if (!progress) {
      progress = await prisma.progress.create({
        data: {
          userId,
          strengths: 'Eager to learn, responsive',
          weaknesses: 'Occasional tense errors, mild pauses',
          practiceTime: minutesPlayed,
          confidence: 70.0
        }
      });
    } else {
      progress = await prisma.progress.update({
        where: { id: progress.id },
        data: {
          practiceTime: progress.practiceTime + minutesPlayed,
          lastUpdated: new Date()
        }
      });
    }

    // Update streak logic
    let currentStreak = user.streak;
    const now = new Date();
    const lastActive = user.lastActive;

    if (!lastActive) {
      currentStreak = 1;
    } else {
      const diffMs = now.getTime() - lastActive.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays <= 1.5) {
        // Active streak continue (if active yesterday or today)
        if (diffDays > 0.8) {
          currentStreak += 1;
        }
      } else {
        // Streak reset
        currentStreak = 1;
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        streak: currentStreak,
        lastActive: now
      }
    });

    return { progress, streak: currentStreak };
  }

  /**
   * Estimates confidence score based on Speech metrics.
   * Higher response length, lower hesitation score, and faster speed (closer to average) yield higher confidence.
   */
  public calculateConfidence(
    hesitationScore: number,
    responseLength: number,
    speechSpeed: number
  ): number {
    let score = 80;

    // Penalty for high hesitation
    score -= hesitationScore * 0.4;

    // Penalty for extremely short answers (shows fear or lack of vocabulary)
    if (responseLength < 5) {
      score -= 20;
    } else if (responseLength < 10) {
      score -= 10;
    } else if (responseLength > 20) {
      score += 5; // Bonus for longer structured answers
    }

    // Speed penalty (too slow/fast indicates lack of confidence/nervousness)
    if (speechSpeed < 90) {
      score -= 15;
    } else if (speechSpeed > 180) {
      score -= 10; // Talking too fast due to nervousness
    }

    return Math.max(30, Math.min(100, Math.round(score)));
  }

  /**
   * Retrieves statistical trends for progress dashboards.
   */
  public async getDashboardStats(userId: number) {
    const progress = await prisma.progress.findFirst({ where: { userId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 7
    });

    return {
      streak: user?.streak || 0,
      totalPracticeMinutes: progress?.practiceTime || 0,
      averageConfidence: progress?.confidence || 75.0,
      strengths: progress?.strengths ? progress.strengths.split(',') : [],
      weaknesses: progress?.weaknesses ? progress.weaknesses.split(',') : [],
      recentPerformance: sessions.map(s => ({
        id: s.id,
        type: s.type,
        date: s.createdAt.toLocaleDateString(),
        grammar: s.scoreGrammar,
        pronunciation: s.scorePronunciation,
        vocabulary: s.scoreVocabulary,
        fluency: s.scoreFluency,
        confidence: s.scoreConfidence
      }))
    };
  }
}
