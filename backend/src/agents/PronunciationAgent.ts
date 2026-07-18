export interface PronunciationFeedback {
  word: string;
  phoneticSpelling: string;
  tip: string;
  needsPractice: boolean;
}

export class PronunciationAgent {
  private pronunciationGuide: { [key: string]: { phonetic: string; tip: string } } = {
    determine: { phonetic: 'dih-TUR-min', tip: 'Say "min" at the end, not "mine".' },
    comfortable: { phonetic: 'KUMF-ter-buhl', tip: 'The "o" and "r" are slurred; it sounds like kumf-ter-buhl.' },
    schedule: { phonetic: 'SKEJ-ool', tip: 'Start with a "sk" sound, followed by "ej-ool".' },
    development: { phonetic: 'dih-VEL-up-ment', tip: 'Put the emphasis on the second syllable: di-VEL-op-ment.' },
    architecture: { phonetic: 'AHR-kih-tek-cher', tip: 'The "ch" is pronounced like a "k".' },
    database: { phonetic: 'DAY-tuh-bays', tip: 'The first syllable is "day" as in daytime.' }
  };

  /**
   * Evaluates text for common pronunciation pitfalls and returns targeted training feedback.
   */
  public analyzePronunciation(text: string): PronunciationFeedback[] {
    const words = text.toLowerCase().split(/\s+/).map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ''));
    const feedback: PronunciationFeedback[] = [];

    words.forEach(word => {
      if (this.pronunciationGuide[word]) {
        feedback.push({
          word,
          phoneticSpelling: this.pronunciationGuide[word].phonetic,
          tip: this.pronunciationGuide[word].tip,
          needsPractice: true
        });
      }
    });

    return feedback;
  }
}
