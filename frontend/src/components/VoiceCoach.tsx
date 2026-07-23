import { useEffect, useState, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  AlertTriangle,
  Send
} from 'lucide-react';
import { WS_URL, type UserProfile } from '../App';

interface VoiceCoachProps {
  profile: UserProfile;
}

export default function VoiceCoach({ profile }: VoiceCoachProps) {
  const [activeSession, setActiveSession] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [transcript, setTranscript] = useState<{ role: string; content: string }[]>([]);
  const [interimInput, setInterimInput] = useState('');
  const [coachSpeaking, setCoachSpeaking] = useState(false);
  
  // Real-time analysis metrics
  const [currentCorrection, setCurrentCorrection] = useState<any>(null);
  const [pronunciationErrors, setPronunciationErrors] = useState<any[]>([]);
  const [speechStats, setSpeechStats] = useState<any>(null);

  // Audio configuration
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [muted, setMuted] = useState(false);

  // Audio Visualizer Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // WebSocket and Speech Recognition References
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const isUserSpeakingRef = useRef(false);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      stopSession();
    };
  }, []);

  // Web Audio Visualizer Setup
  const startVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();
    } catch (err) {
      console.warn('Microphone permission denied or unsupported. Visualizer disabled.', err);
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        // Premium gradient fill
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#a855f7');
        ctx.fillStyle = gradient;

        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    };

    draw();
  };

  const stopVisualizer = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  // Speak coach text response
  const speakText = (text: string) => {
    if (!synthRef.current || muted) return;

    // Stop listening before starting speech to avoid self-interruption
    stopSpeechRecognition();
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    
    // Voice configurations
    utterance.rate = voiceSpeed;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => {
      setCoachSpeaking(true);
      stopSpeechRecognition();
    };

    utterance.onend = () => {
      setCoachSpeaking(false);
      // Restart speech recognition after coach finishes talking
      startSpeechRecognition();
    };

    utterance.onerror = () => {
      setCoachSpeaking(false);
      startSpeechRecognition();
    };

    synthRef.current.speak(utterance);
  };

  // Speech Recognition setup (STT)
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isUserSpeakingRef.current = true;
    };

    recognition.onresult = (event: any) => {
      // Interruption logic: If user starts speaking, immediately stop coach
      if (synthRef.current && synthRef.current.speaking) {
        synthRef.current.cancel();
        setCoachSpeaking(false);
      }

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      setInterimInput(interim || final);

      // Handle pause silence: trigger send message after 2.5 seconds of final text silence
      if (final.trim().length > 0) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          sendUserMessage(final.trim());
          setInterimInput('');
        }, 2000);
      }
    };

    recognition.onend = () => {
      isUserSpeakingRef.current = false;
      // Restart automatically if session is still active
      if (activeSession && !coachSpeaking) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {}
  };

  const stopSpeechRecognition = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
  };

  // Session Initiation
  const startSession = () => {
    const newSessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    setSessionId(newSessionId);
    setActiveSession(true);
    setTranscript([]);

    startVisualizer();

    // Setup WebSockets
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'start-session',
        sessionId: newSessionId,
        userId: profile.id,
        sessionType: 'Conversation',
        sessionMode: 'Practice'
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.event === 'session-started') {
        const text = data.message;
        setTranscript([{ role: 'assistant', content: text }]);
        speakText(text);
      } 
      
      else if (data.event === 'agent-response') {
        const reply = data.response;
        setTranscript(prev => [...prev, { role: 'assistant', content: reply }]);

        // Speed adjustment callback from server
        if (data.voiceParams?.rate) {
          setVoiceSpeed(data.voiceParams.rate);
        }

        // Set immediate correction logs
        if (data.correction) {
          setCurrentCorrection(data.correction);
        } else {
          setCurrentCorrection(null);
        }

        if (data.pronunciation && data.pronunciation.length > 0) {
          setPronunciationErrors(data.pronunciation);
        } else {
          setPronunciationErrors([]);
        }

        if (data.speechStats) {
          setSpeechStats(data.speechStats);
        }

        speakText(reply);
      }
      
      else if (data.event === 'error') {
        const errMsg = data.message;
        setTranscript(prev => [...prev, { role: 'assistant', content: `[System Error] ${errMsg}` }]);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed.');
    };
  };

  const sendUserMessage = (text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    setTranscript(prev => [...prev, { role: 'user', content: text }]);

    wsRef.current.send(JSON.stringify({
      type: 'user-message',
      sessionId,
      text,
      durationSeconds: 5
    }));
  };

  const handleDoneSpeaking = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (interimInput && interimInput.trim().length > 0) {
      sendUserMessage(interimInput.trim());
      setInterimInput('');
    }
  };

  const stopSession = () => {
    stopSpeechRecognition();
    stopVisualizer();

    if (synthRef.current) {
      synthRef.current.cancel();
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'end-session',
        sessionId
      }));
    }

    setActiveSession(false);
    setCoachSpeaking(false);
    setInterimInput('');
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.25rem' }}>Voice Coach</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Practice real-time continuous speaking. Talk naturally, and the coach will analyze your flow.
        </p>
      </header>

      <div className="voice-grid">
        {/* Left Side: Waveform and Conversation logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main Visualizer Area */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="visualizer-container" style={{ width: '100%', maxWidth: '500px' }}>
              {activeSession ? (
                <canvas ref={canvasRef} width={500} height={160} style={{ width: '100%', height: '100%' }} />
              ) : (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Click Start Coaching to begin speaking.
                </div>
              )}
            </div>

            {activeSession ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {!coachSpeaking && (
                  <button 
                    onClick={handleDoneSpeaking} 
                    disabled={!interimInput.trim()} 
                    className="btn" 
                    style={{ opacity: !interimInput.trim() ? 0.6 : 1 }}
                  >
                    <Send size={18} /> Done Speaking (Send)
                  </button>
                )}
                <button onClick={stopSession} className="btn btn-secondary" style={{ color: 'var(--accent-err)' }}>
                  <MicOff size={18} /> Stop Session
                </button>
                <button onClick={() => setMuted(!muted)} className="btn btn-secondary">
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />} {muted ? 'Unmute' : 'Mute'}
                </button>
              </div>
            ) : (
              <button onClick={startSession} className="btn" style={{ marginTop: '1.5rem', padding: '1rem 2rem', fontSize: '1.1rem' }}>
                <Mic size={20} /> Start Voice Session
              </button>
            )}

            {activeSession && (
              <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: coachSpeaking ? 'var(--primary)' : 'var(--accent)', fontWeight: 600 }}>
                {coachSpeaking ? 'Coach is talking...' : 'Listening to you... go ahead!'}
              </div>
            )}
          </div>

          {/* Real-time Transcription Stream */}
          <div className="card" style={{ flexGrow: 1, minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Conversation Log</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem', flexGrow: 1 }}>
              {transcript.map((msg, index) => (
                <div 
                  key={index}
                  style={{ 
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.role === 'user' ? 'var(--hover-bg)' : 'rgba(255,255,255,0.05)',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    maxWidth: '80%',
                    fontSize: '0.9rem',
                    borderLeft: msg.role === 'assistant' ? '3px solid var(--secondary)' : 'none'
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 600 }}>
                    {msg.role === 'user' ? 'You' : 'Coach'}
                  </div>
                  {msg.content}
                </div>
              ))}
              {interimInput && (
                <div style={{ alignSelf: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '0.75rem', maxWidth: '80%', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  {interimInput}...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Real-time correction and metrics overlay */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Real-time Corrections Card */}
          <div className="card" style={{ borderLeft: currentCorrection ? '4px solid var(--accent-err)' : '1px solid var(--card-border)' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle style={{ color: currentCorrection ? 'var(--accent-err)' : 'var(--text-secondary)' }} /> Grammar Corrections
            </h3>
            {currentCorrection ? (
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Original:</div>
                <div style={{ fontSize: '0.9rem', textDecoration: 'line-through', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  "{currentCorrection.original}"
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>Corrected Formulation:</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5rem' }}>
                  "{currentCorrection.corrected}"
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                  {currentCorrection.explanation}
                </p>
                <div style={{ fontSize: '0.75rem', marginTop: '0.75rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  Now repeat this sentence slower to internalize the rule.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                No active grammar mistakes. Talk naturally and corrections will display here immediately.
              </div>
            )}
          </div>

          {/* Pronunciation Assistant Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Pronunciation Assistant</h3>
            {pronunciationErrors.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pronunciationErrors.map((err, idx) => (
                  <div key={idx} style={{ paddingBottom: '0.75rem', borderBottom: idx < pronunciationErrors.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{err.word}</strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>[{err.phoneticSpelling}]</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{err.tip}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                No phonetic issues detected in your last turn.
              </div>
            )}
          </div>

          {/* Live Hesitation & Speed Metrics */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Real-time Speech Metrics</h3>
            {speechStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Speech Speed (WPM):</span>
                  <strong>{speechStats.speechSpeed} WPM</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Hesitation Level:</span>
                  <span className={`score-badge ${speechStats.hesitationScore > 40 ? 'score-badge-danger' : 'score-badge-success'}`}>
                    {speechStats.hesitationScore > 40 ? 'High Hesitation' : 'Fluent Flow'}
                  </span>
                </div>
                
                {/* Filler Words tracker */}
                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Filler Words Tracked:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {Object.entries(speechStats.fillerWords).map(([word, count]: any) => (
                      <span 
                        key={word} 
                        style={{ 
                          fontSize: '0.75rem', 
                          background: count > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)', 
                          color: count > 0 ? '#ef4444' : 'var(--text-secondary)',
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '0.25rem',
                          fontWeight: count > 0 ? 'bold' : 'normal'
                        }}
                      >
                        {word}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Begin speaking to display real-time speech analytics.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
