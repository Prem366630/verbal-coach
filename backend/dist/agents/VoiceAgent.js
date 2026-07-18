"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceAgent = void 0;
class VoiceAgent {
    config = {
        selectedVoice: 'Google US English',
        speed: 1.0,
        pitch: 1.0
    };
    getVoiceConfig() {
        return this.config;
    }
    updateVoiceConfig(update) {
        this.config = { ...this.config, ...update };
        return this.config;
    }
    /**
     * Translates config into speech commands suitable for frontend consumption.
     */
    getSpeechParams() {
        return {
            voice: this.config.selectedVoice,
            rate: this.config.speed,
            pitch: this.config.pitch
        };
    }
}
exports.VoiceAgent = VoiceAgent;
