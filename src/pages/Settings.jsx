import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function Settings() {
  const { user, updateUser, logout } = useAuth()
  const [saving, setSaving] = useState(null)
  const [msg, setMsg] = useState('')

  const setTheme = async (theme) => {
    setSaving('theme')
    document.documentElement.setAttribute('data-theme', theme)
    try {
      await api.patch('/auth/preferences', { theme })
      updateUser({ theme })
    } catch {}
    setSaving(null)
  }

  const setLanguage = async (language) => {
    setSaving('lang')
    try {
      await api.patch('/auth/preferences', { language })
      updateUser({ language })
    } catch {}
    setSaving(null)
  }

  const openBillingPortal = async () => {
    setSaving('billing')
    try {
      const { data } = await api.post('/stripe/billing-portal')
      window.location.href = data.portal_url
    } catch {
      setMsg('Could not open billing portal. Please try again.')
    }
    setSaving(null)
  }

  const disconnectIG = async () => {
    if (!confirm('Disconnect your Instagram account? The bot will be paused.')) return
    setSaving('ig')
    try {
      await api.delete('/instagram/account')
      setMsg('Instagram disconnected.')
    } catch (e) {
      setMsg(e.response?.data?.detail || 'Failed to disconnect.')
    }
    setSaving(null)
  }

  const tier = user?.subscription_tier
  const status = user?.subscription_status

  return (
    <Layout>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '36px 32px' }}>
        <h2 style={{ marginBottom: 6 }}>Settings</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
          Manage your account, appearance, and subscription.
        </p>

        {msg && (
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 14,
            marginBottom: 20,
          }}>
            {msg}
          </div>
        )}

        {/* Appearance */}
        <Section title="Appearance">
          <div className="form-group">
            <label className="label">Theme</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['light', 'dark'].map(t => (
                <button key={t} className={`btn ${user?.theme === t ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }} onClick={() => setTheme(t)} disabled={saving === 'theme'}>
                  {t === 'light' ? '☀️ Light' : '🌙 Dark'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Language</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ v: 'en', l: '🇬🇧 English' }, { v: 'de', l: '🇩🇪 Deutsch' }].map(({ v, l }) => (
                <button key={v} className={`btn ${user?.language === v ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }} onClick={() => setLanguage(v)} disabled={saving === 'lang'}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Account */}
        <Section title="Account">
          <Row label="Email" value={user?.email} />
          <Row label="Plan"
            value={
              <span className={`badge ${tier === 'pro' ? 'badge-blue' : tier === 'manual' ? 'badge-green' : 'badge-gray'}`}>
                {tier === 'trial' ? 'Trial' : tier === 'pro' ? 'Pro' : 'Manual'}
              </span>
            }
          />
          <Row label="Status"
            value={
              <span className={`badge ${status === 'active' || status === 'trialing' ? 'badge-green' : 'badge-red'}`}>
                {status === 'trialing' ? 'Trial active' : status === 'active' ? 'Active' : status}
              </span>
            }
          />
          {user?.trial_ends_at && status === 'trialing' && (
            <Row label="Trial ends" value={new Date(user.trial_ends_at).toLocaleDateString()} />
          )}
          {user?.current_period_end && status === 'active' && (
            <Row label="Renews" value={new Date(user.current_period_end).toLocaleDateString()} />
          )}
        </Section>

        {/* Subscription */}
        <Section title="Subscription">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-secondary" onClick={openBillingPortal} disabled={saving === 'billing'}
              style={{ justifyContent: 'flex-start' }}>
              {saving === 'billing' ? <div className="spinner spinner-dark" /> : null}
              Manage subscription & billing →
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Opens Stripe's secure customer portal to change plan, update payment method, or cancel.
            </p>
          </div>
        </Section>

        {/* Instagram */}
        <Section title="Instagram">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-secondary" style={{ display: 'inline-flex', width: 'fit-content' }}
              onClick={async () => {
                try {
                  const { data } = await api.get('/instagram/connect')
                  window.location.href = data.oauth_url
                } catch (e) {
                  setMsg(e.response?.data?.detail || 'Could not connect Instagram.')
                }
              }}>
              Reconnect Instagram account
            </button>
            <hr className="divider" />
            <div>
              <button className="btn btn-danger btn-sm" onClick={disconnectIG} disabled={saving === 'ig'}>
                {saving === 'ig' ? <div className="spinner" /> : 'Disconnect account'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
                Disconnecting will pause the bot. You can reconnect at any time (cooldown applies).
              </p>
            </div>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Sign out">
          <button className="btn btn-secondary" onClick={logout}>
            Sign out of ReplyBot
          </button>
        </Section>
      </div>
    </Layout>
  )
}

function Section({ title, children }) {
  return (
    <div className="animate-fade-up" style={{ marginBottom: 24 }}>
      <h4 style={{ marginBottom: 14, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h4>
      <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}
