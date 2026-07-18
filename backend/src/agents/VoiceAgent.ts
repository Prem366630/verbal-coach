export interface VoiceConfig {
  selectedVoice: string; // voice name
  speed: number; // speed multiplier (0.5 to 2.0)
  pitch: number; // pitch adjustment
}

export class VoiceAgent {
  private config: VoiceConfig = {
    selectedVoice: 'Google US English',
    speed: 1.0,
    pitch: 1.0
  };

  public getVoiceConfig(): VoiceConfig {
    return this.config;
  }

  public updateVoiceConfig(update: Partial<VoiceConfig>): VoiceConfig {
    this.config = { ...this.config, ...update };
    return this.config;
  }

  /**
   * Translates config into speech commands suitable for frontend consumption.
   */
  public getSpeechParams() {
    return {
      voice: this.config.selectedVoice,
      rate: this.config.speed,
      pitch: this.config.pitch
    };
  }
}
