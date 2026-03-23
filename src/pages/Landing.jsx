import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const PLANS = [
  {
    id: 'trial',
    name: 'Trial',
    price: 'Free',
    period: '7 days',
    description: 'Test the bot with limited replies.',
    color: '#636366',
    features: [
      '10 replies / day',
      '3 replies per run',
      'Manual trigger only',
      '1 Instagram account',
      'Standard character',
    ],
    disabled: ['Auto mode', 'Post-window', 'LLM choice'],
    cta: 'Start free trial',
    plan: 'manual', // trial is a phase of manual
    isTrial: true,
  },
  {
    id: 'manual',
    name: 'Manual',
    price: '€19',
    period: '/ month',
    description: 'You control when the bot runs.',
    color: '#0071e3',
    features: [
      '100 replies / day',
      '20 replies per run',
      'Manual trigger',
      '1 Instagram account',
      'Custom character prompt',
      'LLM choice & 50/50 mix',
      'Reply history',
    ],
    disabled: ['Auto mode', 'Post-window'],
    cta: 'Get Manual',
    plan: 'manual',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€49',
    period: '/ month',
    description: 'Full automation after every post.',
    color: '#bf5af2',
    features: [
      '500 replies / day',
      '50 replies per run',
      'Auto mode (post-window)',
      'Up to 3 hours active',
      '1 Instagram account',
      'Custom character prompt',
      'LLM choice & 50/50 mix',
      'Full reply history',
    ],
    disabled: [],
    cta: 'Get Pro',
    plan: 'pro',
    popular: true,
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)

  const handleSelect = async (plan) => {
    if (plan.isTrial) {
      navigate('/set-password?plan=manual&trial=1')
      return
    }
    setLoading(plan.id)
    try {
      const { data } = await api.post('/stripe/checkout', { plan: plan.plan })
      window.location.href = data.checkout_url
    } catch (e) {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(245,245,247,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #0071e3, #34aadc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Repyla</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/login')}>
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 24px 60px' }}>
        <div className="badge badge-blue animate-fade-up" style={{ marginBottom: 20, display: 'inline-flex' }}>
          AI-powered Instagram replies
        </div>
        <h1 className="animate-fade-up delay-1" style={{ maxWidth: 600, margin: '0 auto 20px', fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}>
          Never miss a comment.<br />Ever.
        </h1>
        <p className="animate-fade-up delay-2" style={{
          color: 'var(--text-secondary)', fontSize: 17,
          maxWidth: 440, margin: '0 auto',
          lineHeight: 1.6,
        }}>
          Your AI persona replies instantly to every Instagram comment —
          genuine, human, always on brand.
        </p>
      </div>

      {/* Pricing */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        maxWidth: 960,
        margin: '0 auto',
        padding: '0 24px 100px',
      }}>
        {PLANS.map((plan, i) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            loading={loading === plan.id}
            onSelect={() => handleSelect(plan)}
            delay={i}
          />
        ))}
      </div>
    </div>
  )
}

function PricingCard({ plan, loading, onSelect, delay }) {
  return (
    <div className={`card animate-fade-up delay-${delay + 3}`} style={{
      padding: 28,
      position: 'relative',
      overflow: 'hidden',
      border: plan.popular ? `1.5px solid ${plan.color}30` : '1px solid var(--border)',
      boxShadow: plan.popular ? `0 8px 32px ${plan.color}18` : 'var(--shadow-sm)',
      transition: 'transform 200ms var(--ease), box-shadow 200ms var(--ease)',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = plan.popular ? `0 12px 40px ${plan.color}22` : 'var(--shadow-md)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = plan.popular ? `0 8px 32px ${plan.color}18` : 'var(--shadow-sm)' }}
    >
      {plan.popular && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: plan.color, color: 'white',
          fontSize: 11, fontWeight: 600, padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
        }}>
          Most popular
        </div>
      )}

      {/* Plan header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, marginBottom: 14,
          background: `${plan.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: plan.color }} />
        </div>
        <h3 style={{ marginBottom: 4 }}>{plan.name}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{plan.description}</p>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', color: plan.color }}>
          {plan.price}
        </span>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginLeft: 4 }}>
          {plan.period}
        </span>
      </div>

      {/* CTA */}
      <button
        className="btn btn-lg"
        onClick={onSelect}
        disabled={loading}
        style={{
          width: '100%', marginBottom: 24,
          background: plan.color, color: 'white',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? <div className="spinner" /> : plan.cta}
      </button>

      {/* Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {plan.features.map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'var(--text-primary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke={plan.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {f}
          </div>
        ))}
        {plan.disabled.map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'var(--text-tertiary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {f}
          </div>
        ))}
      </div>
    </div>
  )
}
