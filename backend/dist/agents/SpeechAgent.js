"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechAgent = void 0;
class SpeechAgent {
    fillerList = ['um', 'umm', 'actually', 'basically', 'like', 'you know'];
    /**
     * Analyzes speech statistics from a text transcript and duration.
     */
    analyzeSpeech(text, durationSeconds) {
        const words = text.toLowerCase().split(/\s+/);
        const fillerWords = {};
        let totalFillers = 0;
        // Initialize filler counts
        this.fillerList.forEach(filler => {
            fillerWords[filler] = 0;
        });
        // Check for fillers in the words
        words.forEach((word, idx) => {
            // Direct word match
            if (this.fillerList.includes(word)) {
                fillerWords[word]++;
                totalFillers++;
            }
            // Phrase match (e.g., "you know")
            if (word === 'you' && words[idx + 1] === 'know') {
                fillerWords['you know']++;
                totalFillers++;
            }
        });
        const totalWords = words.filter(w => w.trim().length > 0).length;
        const speechSpeed = durationSeconds > 0 ? (totalWords / durationSeconds) * 60 : 130; // standard WPM is 130-150
        // Estimate hesitation: based on filler words relative to total words
        const fillerRatio = totalWords > 0 ? totalFillers / totalWords : 0;
        const hesitationScore = Math.min(100, Math.round(fillerRatio * 300)); // scale up ratio for scoring
        return {
            fillerWords,
            totalFillers,
            hesitationScore,
            speechSpeed: Math.round(speechSpeed),
            durationSeconds
        };
    }
    /**
     * Detects if the user wants to adjust speed (e.g. "speak slower", "talk faster").
     */
    checkSpeedAdjustmentRequest(text) {
        const lowercase = text.toLowerCase();
        if (lowercase.includes('speak slower') || lowercase.includes('talk slower') || lowercase.includes('go slower')) {
            return 0.8;
        }
        if (lowercase.includes('speak faster') || lowercase.includes('talk faster') || lowercase.includes('go faster')) {
            return 1.2;
        }
        if (lowercase.includes('normal speed') || lowercase.includes('speak normally')) {
            return 1.0;
        }
        return null;
    }
}
exports.SpeechAgent = SpeechAgent;
