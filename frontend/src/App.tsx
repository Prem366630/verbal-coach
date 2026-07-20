import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Mic, 
  Briefcase, 
  BookOpen, 
  Sun, 
  Moon, 
  LogOut,
  Sparkles
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import VoiceCoach from './components/VoiceCoach';
import InterviewCenter from './components/InterviewCenter';
import LearningHub from './components/LearningHub';

// Base API endpoints (Automatically switches between local development and cloud production)
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_URL = isLocal 
  ? `http://${window.location.hostname}:5000/api` 
  : `https://verbal-coach.onrender.com/api`;
export const WS_URL = isLocal 
  ? `ws://${window.location.hostname}:5000` 
  : `wss://verbal-coach.onrender.com`;

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  education?: string;
  targetRole?: string;
  experience?: number;
  englishLevel?: string;
  learningGoals?: string;
  targetDate?: string;
  dailyDuration: number;
  commStyle: string;
  streak: number;
}

function App() {
  const [user, setUser] = useState<{ id: number; name: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Onboarding Setup State
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    education: 'Bachelor of Science',
    targetRole: 'Software Developer',
    experience: 2,
    englishLevel: 'Intermediate',
    learningGoals: 'Improve confidence and grammar in HR interviews',
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dailyDuration: 15,
    commStyle: 'Professional'
  });

  // Load user session
  useEffect(() => {
    const savedUser = sessionStorage.getItem('coach_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      fetchProfile(parsed.id);
    }
  }, []);

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const fetchProfile = async (userId: number) => {
    try {
      const res = await fetch(`${API_URL}/profile?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        // If profile details (role/goals) are missing, trigger onboarding
        if (!data.targetRole) {
          setIsOnboarding(true);
        }
      }
    } catch (e) {
      console.error('Failed to fetch profile', e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const body = isRegister ? { email, password, name } : { email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed');
        return;
      }

      const userSession = { id: data.userId, name: data.name };
      sessionStorage.setItem('coach_user', JSON.stringify(userSession));
      setUser(userSession);
      
      if (isRegister) {
        setIsOnboarding(true);
      } else {
        fetchProfile(data.userId);
      }
    } catch (err) {
      setErrorMsg('Cannot reach backend server. Make sure it is running.');
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...onboardForm,
          experience: parseInt(onboardForm.experience as any)
        })
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setIsOnboarding(false);
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('coach_user');
    setUser(null);
    setProfile(null);
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
          <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-title)', marginBottom: '0.5rem', textAlign: 'center' }}>
            AI Communication Coach
          </h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem' }}>
            Elevate your professional English and master your interviews.
          </p>

          <form onSubmit={handleAuth}>
            {isRegister && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="John Doe"
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="john@example.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--accent-err)', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 500 }}>
                {errorMsg}
              </div>
            )}

            <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <span 
              onClick={() => setIsRegister(!isRegister)} 
              style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
            >
              {isRegister ? 'Sign In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (isOnboarding) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Sparkles style={{ color: 'var(--secondary)' }} />
            <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-title)' }}>Onboarding Profile Setup</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Tell us about your career and communication aspirations to tailor your training roadmap.
          </p>

          <form onSubmit={handleOnboardingSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <label className="form-label">Highest Education</label>
              <input 
                type="text" 
                className="form-input" 
                value={onboardForm.education} 
                onChange={e => setOnboardForm({ ...onboardForm, education: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <label className="form-label">Target Role</label>
              <input 
                type="text" 
                className="form-input" 
                value={onboardForm.targetRole} 
                onChange={e => setOnboardForm({ ...onboardForm, targetRole: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <label className="form-label">Years of Experience</label>
              <input 
                type="number" 
                className="form-input" 
                value={onboardForm.experience} 
                onChange={e => setOnboardForm({ ...onboardForm, experience: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <label className="form-label">English Level</label>
              <select 
                className="form-input" 
                value={onboardForm.englishLevel} 
                onChange={e => setOnboardForm({ ...onboardForm, englishLevel: e.target.value })}
                style={{ appearance: 'none', background: 'rgba(0,0,0,0.2)' }}
              >
                <option value="Basic">Basic / Conversational</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced / Fluent</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Target Interview/Learning Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={onboardForm.targetDate} 
                onChange={e => setOnboardForm({ ...onboardForm, targetDate: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Specific Career/Learning Goals</label>
              <textarea 
                className="form-input" 
                rows={2} 
                value={onboardForm.learningGoals} 
                onChange={e => setOnboardForm({ ...onboardForm, learningGoals: e.target.value })}
                placeholder="E.g., Master system design interviews and reduce verbal filler words"
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <label className="form-label">Daily Practice Goal (Minutes)</label>
              <input 
                type="number" 
                className="form-input" 
                value={onboardForm.dailyDuration} 
                onChange={e => setOnboardForm({ ...onboardForm, dailyDuration: parseInt(e.target.value) || 15 })}
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <label className="form-label">Coaching Tone Style</label>
              <select 
                className="form-input" 
                value={onboardForm.commStyle} 
                onChange={e => setOnboardForm({ ...onboardForm, commStyle: e.target.value })}
              >
                <option value="Professional">Professional (Assertive)</option>
                <option value="Calm">Calm & Analytical</option>
                <option value="Supportive">Supportive & Encouraging</option>
              </select>
            </div>

            <button type="submit" className="btn" style={{ gridColumn: 'span 2', marginTop: '1rem', justifyContent: 'center' }}>
              Generate Career Roadmap
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <Sparkles size={24} />
            <span>VerbalCoach</span>
          </div>

          <ul className="nav-links">
            <li 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'voice' ? 'active' : ''}`}
              onClick={() => setActiveTab('voice')}
            >
              <Mic size={20} />
              <span>Voice Coach</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'interview' ? 'active' : ''}`}
              onClick={() => setActiveTab('interview')}
            >
              <Briefcase size={20} />
              <span>Interview Center</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'learning' ? 'active' : ''}`}
              onClick={() => setActiveTab('learning')}
            >
              <BookOpen size={20} />
              <span>Learning Hub</span>
            </li>
          </ul>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Theme & User Profile info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Theme</span>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', minWidth: 'auto', display: 'flex', alignItems: 'center' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifySelf: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: 'var(--primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{profile?.targetRole || 'Onboarding'}</div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="btn btn-secondary" 
              style={{ padding: '0.4rem', border: 'none', color: 'var(--accent-err)' }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Viewport */}
      <main className="main-content">
        {activeTab === 'dashboard' && profile && <Dashboard profile={profile} refreshProfile={() => fetchProfile(user.id)} onStartCoaching={() => setActiveTab('voice')} />}
        {activeTab === 'voice' && profile && <VoiceCoach profile={profile} />}
        {activeTab === 'interview' && profile && <InterviewCenter profile={profile} />}
        {activeTab === 'learning' && profile && <LearningHub profile={profile} />}
      </main>
    </div>
  );
}

export default App;
