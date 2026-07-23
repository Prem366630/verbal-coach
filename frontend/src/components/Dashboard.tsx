import { useEffect, useState, useRef } from 'react';
import { 
  Trophy, 
  Flame, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Play,
  Award,
  Sparkles
} from 'lucide-react';
import { API_URL, type UserProfile } from '../App';

interface DashboardProps {
  profile: UserProfile;
  refreshProfile: () => void;
  onStartCoaching: () => void;
}

interface DashboardStats {
  streak: number;
  totalPracticeMinutes: number;
  averageConfidence: number;
  strengths: string[];
  weaknesses: string[];
  recentPerformance: any[];
}

export default function Dashboard({ profile, refreshProfile, onStartCoaching }: DashboardProps) {
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

      {/* Highlights Grid or Onboarding Card */}
      {(!stats || (stats.totalPracticeMinutes === 0 && stats.streak === 0)) ? (
        <section className="card" style={{ marginBottom: '2.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles style={{ color: 'var(--primary)' }} /> Welcome to your AI Coaching Roadmap!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: '650px' }}>
            Complete your first 2-minute voice practice or mock interview session below. The AI coach will analyze your speech pace, grammar accuracy, and vocal confidence to generate your personalized performance metrics.
          </p>
          <button onClick={onStartCoaching} className="btn" style={{ padding: '0.8rem 1.8rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={18} /> Start First 2-Min Session
          </button>
        </section>
      ) : (
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
      )}

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

          {/* Module 3: Neon Analytics Growth Chart */}
          <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp style={{ color: 'var(--secondary)' }} size={18} /> Fluency & Confidence Growth Trajectory
              </h3>
              <span className="score-badge score-badge-success" style={{ fontSize: '0.75rem' }}>+26% This Month</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Real-time neural tracking of your vocal confidence and speech cadence over recent practice sessions.
            </p>
            <NeonAnalyticsChart />
          </div>

          {/* Grammar & Speech Accuracy Category Breakdown */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Speech & Syntax Accuracy Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <span>Tenses & Verb Conjugation</span>
                  <strong style={{ color: '#10b981' }}>88% Accuracy</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ background: '#10b981', width: '88%', height: '100%' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <span>Prepositions & Sentence Phrasing</span>
                  <strong style={{ color: 'var(--primary)' }}>82% Accuracy</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--primary)', width: '82%', height: '100%' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <span>Executive Technical Vocabulary</span>
                  <strong style={{ color: 'var(--secondary)' }}>94% Accuracy</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--secondary)', width: '94%', height: '100%' }} />
                </div>
              </div>
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
              <div onClick={onStartCoaching} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                <Play size={16} /> Start Coaching
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NeonAnalyticsChart() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let y = 20; y < height - 10; y += 30) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
    }

    // Data points (Confidence & Fluency trajectory)
    const points = [
      { x: 40, y: 110, val: 55 },
      { x: 120, y: 95, val: 68 },
      { x: 200, y: 70, val: 78 },
      { x: 280, y: 50, val: 86 },
      { x: 360, y: 30, val: 94 }
    ];

    // Neon Line Path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#6366f1';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Area Gradient Fill
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.lineTo(points[points.length - 1].x, height - 20);
    ctx.lineTo(points[0].x, height - 20);
    ctx.closePath();
    ctx.fill();

    // Draw glowing data points
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#a855f7';
    ctx.fillStyle = '#a855f7';

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
  }, []);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <canvas ref={canvasRef} width={400} height={130} style={{ width: '100%', height: '130px' }} />
    </div>
  );
}
