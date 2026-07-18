import { useEffect, useState } from 'react';
import { 
  Trophy, 
  Flame, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Play,
  Award
} from 'lucide-react';
import { API_URL, type UserProfile } from '../App';

interface DashboardProps {
  profile: UserProfile;
  refreshProfile: () => void;
}

interface DashboardStats {
  streak: number;
  totalPracticeMinutes: number;
  averageConfidence: number;
  strengths: string[];
  weaknesses: string[];
  recentPerformance: any[];
}

export default function Dashboard({ profile, refreshProfile }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyPlan, setDailyPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, planRes] = await Promise.all([
        fetch(`${API_URL}/dashboard?userId=${profile.id}`),
        fetch(`${API_URL}/learning-plan?userId=${profile.id}`)
      ]);

      if (statsRes.ok && planRes.ok) {
        const statsData = await statsRes.json();
        const planData = await planRes.json();
        setStats(statsData);
        setDailyPlan(planData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePlan = async () => {
    if (!dailyPlan) return;
    try {
      const res = await fetch(`${API_URL}/learning-plan/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: dailyPlan.id })
      });
      if (res.ok) {
        fetchDashboardData();
        refreshProfile();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard statistics...</div>;
  }

  // Calculate practice completion percentage
  const practicePercent = Math.min(100, Math.round(((stats?.totalPracticeMinutes || 0) / (profile.dailyDuration || 15)) * 100));

  return (
    <div>
      {/* Top Banner */}
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Welcome back, {profile.name}!
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Let's practice English for your target career as a <strong style={{ color: 'var(--primary)' }}>{profile.targetRole}</strong>.
        </p>
      </header>

      {/* Highlights Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: '#ef4444' }}>
            <Flame size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Daily Streak</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats?.streak || 0} Days</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: 'var(--primary)' }}>
            <Clock size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Today's Practice</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats?.totalPracticeMinutes || 0} / {profile.dailyDuration} min</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: '#10b981' }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Avg Confidence</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats?.averageConfidence || 0}%</div>
          </div>
        </div>
      </section>

      {/* Main Layout Grid */}
      <div className="dashboard-grid">
        {/* Left Side: Daily Plan & Performance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Daily learning plan */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy style={{ color: 'var(--accent-warn)' }} /> Today's Learning roadmap
              </h3>
              {dailyPlan?.done ? (
                <span className="score-badge score-badge-success">Completed</span>
              ) : (
                <button onClick={handleCompletePlan} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  Mark Completed
                </button>
              )}
            </div>

            {dailyPlan && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ color: 'var(--primary)', marginTop: '2px' }}><CheckCircle size={18} /></div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>Grammar Target</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{dailyPlan.grammarGoal}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ color: 'var(--secondary)', marginTop: '2px' }}><CheckCircle size={18} /></div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>Vocabulary Practice</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{dailyPlan.vocabGoal}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ color: 'var(--accent)', marginTop: '2px' }}><CheckCircle size={18} /></div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>Pronunciation Focal Point</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{dailyPlan.pronunciationGoal}</span>
                  </div>
                </div>

                <div style={{ background: 'var(--hover-bg)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '3px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--primary)' }}>Speaking Mission</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{dailyPlan.speakMission}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Practice Progress Bar */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Practice Goal Progress</h3>
            <div style={{ background: 'rgba(255,255,255,0.05)', height: '16px', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
              <div 
                style={{ 
                  background: 'linear-gradient(90deg, var(--primary), var(--secondary))', 
                  width: `${practicePercent}%`, 
                  height: '100%', 
                  transition: 'width 0.4s ease' 
                }} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              <span>{stats?.totalPracticeMinutes} minutes completed</span>
              <span>{practicePercent}% of {profile.dailyDuration} min goal</span>
            </div>
          </div>
        </div>

        {/* Right Side: Strengths/Weaknesses & Achievements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Core Skills Profile */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award style={{ color: 'var(--secondary)' }} /> Skill Gap Assessment
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <CheckCircle size={16} /> Key Strengths
              </strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {stats?.strengths && stats.strengths.length > 0 ? stats.strengths.join(', ') : 'Identifying... complete coaching sessions to view.'}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
              <strong style={{ fontSize: '0.85rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <AlertCircle size={16} /> Skill Gaps / Weaknesses
              </strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {stats?.weaknesses && stats.weaknesses.length > 0 ? stats.weaknesses.join(', ') : 'No gaps identified. Keep practicing!'}
              </p>
            </div>
          </div>

          {/* Quick Start Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.3)', textAlign: 'center', padding: '2rem 1.5rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>Ready to practice?</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Start a voice first conversational training session with your AI coach.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                <Play size={16} /> Start Coaching
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
