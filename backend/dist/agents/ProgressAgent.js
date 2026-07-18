"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressAgent = void 0;
const db_1 = __importDefault(require("../db"));
class ProgressAgent {
    /**
     * Tracks user practice duration and updates daily streaks.
     */
    async recordPracticeTime(userId, minutesPlayed) {
        const user = await db_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            return null;
        let progress = await db_1.default.progress.findFirst({ where: { userId } });
        if (!progress) {
            progress = await db_1.default.progress.create({
                data: {
                    userId,
                    strengths: 'Eager to learn, responsive',
                    weaknesses: 'Occasional tense errors, mild pauses',
                    practiceTime: minutesPlayed,
                    confidence: 70.0
                }
            });
        }
        else {
            progress = await db_1.default.progress.update({
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
        }
        else {
            const diffMs = now.getTime() - lastActive.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (diffDays <= 1.5) {
                // Active streak continue (if active yesterday or today)
                if (diffDays > 0.8) {
                    currentStreak += 1;
                }
            }
            else {
                // Streak reset
                currentStreak = 1;
            }
        }
        await db_1.default.user.update({
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
    calculateConfidence(hesitationScore, responseLength, speechSpeed) {
        let score = 80;
        // Penalty for high hesitation
        score -= hesitationScore * 0.4;
        // Penalty for extremely short answers (shows fear or lack of vocabulary)
        if (responseLength < 5) {
            score -= 20;
        }
        else if (responseLength < 10) {
            score -= 10;
        }
        else if (responseLength > 20) {
            score += 5; // Bonus for longer structured answers
        }
        // Speed penalty (too slow/fast indicates lack of confidence/nervousness)
        if (speechSpeed < 90) {
            score -= 15;
        }
        else if (speechSpeed > 180) {
            score -= 10; // Talking too fast due to nervousness
        }
        return Math.max(30, Math.min(100, Math.round(score)));
    }
    /**
     * Retrieves statistical trends for progress dashboards.
     */
    async getDashboardStats(userId) {
        const progress = await db_1.default.progress.findFirst({ where: { userId } });
        const user = await db_1.default.user.findUnique({ where: { id: userId } });
        const sessions = await db_1.default.session.findMany({
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
exports.ProgressAgent = ProgressAgent;
