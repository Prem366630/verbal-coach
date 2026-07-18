import { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Play, 
  Mic, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  ChevronRight
} from 'lucide-react';
import { WS_URL, type UserProfile } from '../App';

interface InterviewCenterProps {
  profile: UserProfile;
}

export default function InterviewCenter({ profile }: InterviewCenterProps) {
  // Settings Form State
  const [interviewType, setInterviewType] = useState<'HR' | 'Technical' | 'Behavioral' | 'Managerial'>('Technical');
  const [mode, setMode] = useState<'Practice' | 'Real'>('Practice');
  const [jobDescription, setJobDescription] = useState('');
  const [targetRole, setTargetRole] = useState(profile.targetRole || '');

  // Active Session State
  const [activeSession, setActiveSession] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [transcript, setTranscript] = useState<{ role: string; content: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [interimInput, setInterimInput] = useState('');
  const [evaluationReport, setEvaluationReport] = useState<any>(null);
  
  // Audio Speech Recognition Refs
  const recognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      stopInterview(false);
    };
  }, []);

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onend = () => {
      startSpeechRecognition();
    };

    synthRef.current.speak(utterance);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListeningRef.current = true;
    };

    recognition.onresult = (event: any) => {
      // Interruption logic (only in Practice mode)
      if (mode === 'Practice' && synthRef.current && synthRef.current.speaking) {
        synthRef.current.cancel();
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
      if (final.trim().length > 0) {
        setUserInput(final.trim());
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      if (activeSession && !synthRef.current?.speaking) {
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
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
  };

  const startInterview = () => {
    const newSessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    setSessionId(newSessionId);
    setActiveSession(true);
    setTranscript([]);
    setEvaluationReport(null);
    setUserInput('');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'start-session',
        sessionId: newSessionId,
        userId: profile.id,
        sessionType: interviewType,
        sessionMode: mode,
        jobDescription: jobDescription || undefined,
        targetRole: targetRole || undefined
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.event === 'session-started') {
        setTranscript([{ role: 'assistant', content: data.message }]);
        speakText(data.message);
      } 
      
      else if (data.event === 'agent-response') {
        setTranscript(prev => [...prev, { role: 'assistant', content: data.response }]);
        speakText(data.response);
      } 
      
      else if (data.event === 'session-ended') {
        setEvaluationReport(data.report);
        setActiveSession(false);
      }
    };
  };

  const submitAnswer = () => {
    if (!userInput.trim() || !wsRef.current) return;
    
    stopSpeechRecognition();
    setTranscript(prev => [...prev, { role: 'user', content: userInput }]);
    
    wsRef.current.send(JSON.stringify({
      type: 'user-message',
      sessionId,
      text: userInput,
      durationSeconds: 10
    }));

    setUserInput('');
    setInterimInput('');
  };

  const stopInterview = (triggerReport = true) => {
    stopSpeechRecognition();
    if (synthRef.current) synthRef.current.cancel();

    if (triggerReport && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'end-session',
        sessionId
      }));
    } else {
      setActiveSession(false);
    }
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.25rem' }}>Interview Preparation</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Practice standard and custom role-specific interviews with dynamic follow-up logic.
        </p>
      </header>

      {!activeSession && !evaluationReport && (
        <section className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings style={{ color: 'var(--primary)' }} /> Interview Setup Config
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Interview Category</label>
              <select className="form-input" value={interviewType} onChange={e => setInterviewType(e.target.value as any)}>
                <option value="Technical">Technical Interview (Systems, Coding, Logic)</option>
                <option value="HR">HR Interview (Values, Alignment)</option>
                <option value="Behavioral">Behavioral Interview (Situation/Task/Action/Result)</option>
                <option value="Managerial">Managerial Interview (Mentorship, Scale)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Evaluation Mode</label>
              <select className="form-input" value={mode} onChange={e => setMode(e.target.value as any)}>
                <option value="Practice">Practice Mode (Immediate coaching corrections)</option>
                <option value="Real">Real Interview Mode (No interruptions, score later)</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Target Role (for customized evaluation)</label>
              <input 
                type="text" 
                className="form-input" 
                value={targetRole} 
                onChange={e => setTargetRole(e.target.value)} 
                placeholder="e.g. Lead Full-Stack Architect" 
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Job Description / JD details (Optional)</label>
              <textarea 
                className="form-input" 
                rows={4} 
                value={jobDescription} 
                onChange={e => setJobDescription(e.target.value)} 
                placeholder="Copy-paste the complete Job Description text here. The AI interviewer will generate customized questions based on it." 
              />
            </div>

            <button onClick={startInterview} className="btn" style={{ gridColumn: 'span 2', justifyContent: 'center', padding: '1rem' }}>
              <Play size={18} /> Start Interview Simulation
            </button>
          </div>
        </section>
      )}

      {activeSession && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Interview Question Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
            <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.1rem' }}>{interviewType} Interview</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mode: {mode}</span>
              </div>
              <button onClick={() => stopInterview(true)} className="btn btn-secondary" style={{ color: 'var(--accent-err)', borderColor: 'var(--accent-err)' }}>
                Finish & Evaluate
              </button>
            </div>

            {/* Conversation list */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              {transcript.map((msg, idx) => (
                <div 
                  key={idx}
                  style={{ 
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.role === 'user' ? 'var(--hover-bg)' : 'rgba(255,255,255,0.04)',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    maxWidth: '85%',
                    fontSize: '0.9rem'
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 600 }}>
                    {msg.role === 'user' ? 'You' : 'Interviewer'}
                  </div>
                  {msg.content}
                </div>
              ))}
              {interimInput && (
                <div style={{ alignSelf: 'flex-end', background: 'rgba(255,255,255,0.01)', padding: '0.75rem 1rem', borderRadius: '0.75rem', maxWidth: '85%', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  {interimInput}...
                </div>
              )}
            </div>

            {/* User Input controls */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ flexGrow: 1 }} 
                  placeholder="Type your response or speak into your microphone..." 
                  value={userInput} 
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                />
                <button onClick={submitAnswer} className="btn">
                  Submit <ChevronRight size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <Mic size={14} style={{ color: 'var(--primary)' }} />
                <span>Speaking is continuously captured. Take a pause to automatically queue, or click Submit.</span>
              </div>
            </div>
          </div>

          {/* Guidelines Sidebar */}
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Interviewing Rules</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <li>Answer clearly and structurally (Situation-Task-Action-Result format is recommended).</li>
              <li>Provide specifics: outline what exact technologies or strategies you used.</li>
              <li>{mode === 'Practice' ? 'Practice mode will display corrections immediately.' : 'Real mode will evaluate you silently.'}</li>
              <li>Avoid jargon unless you can explain it. If you trigger a knowledge gap, the interviewer will guide you.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Evaluation Report Page */}
      {evaluationReport && (
        <section className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
            Evaluation Report Card
          </h2>

          {/* Scores Overview Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Grammar</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{evaluationReport.scoreGrammar}%</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Pronunciation</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{evaluationReport.scorePronunciation}%</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Vocabulary</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{evaluationReport.scoreVocabulary}%</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Fluency</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{evaluationReport.scoreFluency}%</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Confidence</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{evaluationReport.scoreConfidence}%</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Communication</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>{evaluationReport.scoreCommunication}%</div>
            </div>
          </div>

          {/* Feedback details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="card" style={{ background: 'rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} style={{ color: 'var(--secondary)' }} /> Overall Summary
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{evaluationReport.summary}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="card">
                <h3 style={{ fontSize: '1rem', color: '#10b981', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} /> Key Strengths
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{evaluationReport.strengths}</p>
              </div>

              <div className="card">
                <h3 style={{ fontSize: '1rem', color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} /> Areas to Improve
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{evaluationReport.weaknesses}</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => setEvaluationReport(null)} className="btn">
              Back to Interview Room
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
