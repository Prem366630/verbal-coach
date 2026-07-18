import { generateAnalysis } from '../ai';

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
  shouldCorrectImmediately: boolean;
}

export class GrammarAgent {
  /**
   * Analyzes text for grammar mistakes and returns structured feedback.
   */
  public async analyzeGrammar(text: string): Promise<GrammarCorrection | null> {
    const prompt = `
      You are the GrammarAgent of an AI Communication Coach.
      Analyze the following user utterance for major grammatical mistakes.
      Important Rules:
      - Correct only significant grammatical errors that impact professionalism, structure, or tense.
      - Ignore insignificant mistakes or colloquial styling.
      - Keep explanations extremely short (1 sentence), simple, and professional.
      
      Response Format (JSON only):
      {
        "corrected": "full corrected sentence or null if no significant mistake",
        "explanation": "brief grammatical correction reason or null",
        "shouldCorrectImmediately": true/false
      }
    `;

    try {
      const responseStr = await generateAnalysis(prompt, text);
      const parsed = JSON.parse(responseStr);
      
      if (parsed.corrected && parsed.corrected !== text) {
        return {
          original: text,
          corrected: parsed.corrected,
          explanation: parsed.explanation || 'Improve grammar and phrasing.',
          shouldCorrectImmediately: parsed.shouldCorrectImmediately !== false
        };
      }
    } catch (error) {
      // Fallback local regex grammar helper for robustness
      return this.localGrammarCheck(text);
    }

    return null;
  }

  private localGrammarCheck(text: string): GrammarCorrection | null {
    const normalized = text.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
    
    // Tense matching
    if (normalized.includes('yesterday i go')) {
      return {
        original: text,
        corrected: text.replace(/yesterday i go/i, 'Yesterday I went'),
        explanation: 'Past tense uses "went".',
        shouldCorrectImmediately: true
      };
    }
    if (normalized.startsWith('yesterday i write')) {
      return {
        original: text,
        corrected: 'Yesterday I wrote...',
        explanation: 'Past tense of write is "wrote".',
        shouldCorrectImmediately: true
      };
    }
    if (normalized.includes('he do not') || normalized.includes('she do not')) {
      return {
        original: text,
        corrected: text.replace(/do not/i, 'does not'),
        explanation: 'Third-person singular uses "does not".',
        shouldCorrectImmediately: true
      };
    }
    if (normalized.includes('i is') || normalized.includes('you is')) {
      return {
        original: text,
        corrected: text.replace(/is/i, normalized.includes('i is') ? 'am' : 'are'),
        explanation: 'Incorrect subject-verb agreement.',
        shouldCorrectImmediately: true
      };
    }

    return null;
  }
}
