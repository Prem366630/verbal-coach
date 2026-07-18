"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryAgent = void 0;
const db_1 = __importDefault(require("../db"));
class MemoryAgent {
    /**
     * Retrieves user profile and history.
     */
    async getUserProfile(userId) {
        return db_1.default.user.findUnique({
            where: { id: userId }
        });
    }
    /**
     * Updates user goals and profile settings.
     */
    async updateUserProfile(userId, updateData) {
        return db_1.default.user.update({
            where: { id: userId },
            data: updateData
        });
    }
    /**
     * Saves a grammar/pronunciation mistake.
     */
    async logMistake(userId, type, original, corrected, explanation) {
        const existing = await db_1.default.mistake.findFirst({
            where: { userId, type, originalText: original }
        });
        if (existing) {
            return db_1.default.mistake.update({
                where: { id: existing.id },
                data: { repeatCount: existing.repeatCount + 1 }
            });
        }
        return db_1.default.mistake.create({
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
    async learnWord(userId, word, definition, context) {
        const wordClean = word.toLowerCase().trim();
        const existing = await db_1.default.vocabulary.findFirst({
            where: { userId, word: wordClean }
        });
        if (existing) {
            return existing;
        }
        return db_1.default.vocabulary.create({
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
    async getMistakes(userId) {
        return db_1.default.mistake.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }
    /**
     * Retrieves vocabulary list.
     */
    async getVocabularyList(userId) {
        return db_1.default.vocabulary.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }
}
exports.MemoryAgent = MemoryAgent;
