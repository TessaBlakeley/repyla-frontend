import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

// gpt-3.5-turbo entfernt — gpt-4o ist der Standard
const LLM_OPTIONS = [
  { value: 'gpt-4o',                      label: 'GPT-4o',        provider: 'OpenAI'    },
  { value: 'claude-3-5-sonnet-20241022',  label: 'Claude Sonnet', provider: 'Anthropic' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const isWelcome = params.get('welcome') === '1'

  const [config, setConfig]       = useState(null)
  const [stats, setStats]         = useState(null)
  const [replies, setReplies]     = useState([])
  const [replyTotal, setReplyTotal] = useState(0)
  const [replyPage, setReplyPage] = useState(1)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState('')
  const [welcome, setWelcome]     = useState(isWelcome)
  const [keywords, setKeywords]   = useState([])
  const [logs, setLogs]           = useState([])
  const pollRef = useRef(null)

  const [character, setCharacter]       = useState('')
  const [blacklist, setBlacklist]       = useState('')
  const [vipAccounts, setVipAccounts]   = useState([])
  const [llmPrimary, setLlmPrimary]     = useState('gpt-4o')
  const [llmSecondary, setLlmSecondary] = useState('')
  const [mixRatio, setMixRatio]         = useState(100)
  const [maxReplies, setMaxReplies]     = useState(5)

  const load = useCallback(async () => {
    try {
      const [cfgRes, statsRes] = await Promise.all([
        api.get('/bot/config'),
        api.get('/bot/stats'),
      ])
      const cfg = cfgRes.data
      setConfig(cfg)
      setStats(statsRes.data)
      setCharacter(cfg.character_prompt || '')
      setBlacklist((cfg.blacklist_accounts || []).join('\n'))
      setVipAccounts(cfg.special_accounts || [])
      // Fallback: ältere Configs mit gpt-3.5-turbo → auf gpt-4o upgraden
      const primary = cfg.llm_primary === 'gpt-3.5-turbo' ? 'gpt-4o' : (cfg.llm_primary || 'gpt-4o')
      setLlmPrimary(primary)
      setLlmSecondary(cfg.llm_secondary || '')
      setMixRatio(cfg.llm_mix_ratio ?? 100)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadReplies = useCallback(async (page = 1) => {
    try {
      const { data } = await api.get(`/bot/replies?page=${page}&page_size=5`)
      setReplies(data.items)
      setReplyTotal(data.total)
      setReplyPage(page)
    } catch {}
  }, [])

  const loadKeywords = useCallback(async () => {
    try {
      const { data } = await api.get('/keywords')
      setKeywords(data)
    } catch {}
  }, [])

  // ── Live Activity Polling ─────────────────────────────────────────────────
  const loadLogs = useCallback(async () => {
    try {
      const { data } = await api.get('/bot/logs?limit=5')
      setLogs(data)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    loadReplies()
    loadKeywords()
    loadLogs()

    // Poll alle 15 Sekunden
    pollRef.current = setInterval(() => {
      loadLogs()
      load() // stats auch aktualisieren
    }, 15000)

    return () => clearInterval(pollRef.current)
  }, [load, loadReplies, loadKeywords, loadLogs])

  // max_replies initial auf User-Limit setzen sobald user geladen
  useEffect(() => {
    if (user?.max_replies_per_run) {
      setMaxReplies(Math.min(5, user.max_replies_per_run))
    }
  }, [user])

  const toggleActive = async () => {
    const newVal = !config.is_active
    setConfig(c => ({ ...c, is_active: newVal }))
    try { await api.patch('/bot/config', { is_active: newVal }) }
    catch { setConfig(c => ({ ...c, is_active: !newVal })) }
  }

  const saveConfig = async (overrides = {}) => {
    setSaving(true)
    try {
      const body = {
        character_prompt: character,
        blacklist_accounts: blacklist.split('\n').map(s => s.trim()).filter(Boolean),
        special_accounts: vipAccounts,
        llm_primary: llmPrimary,
        llm_secondary: llmSecondary || null,
        llm_mix_ratio: mixRatio,
        ...overrides,
      }
      const { data } = await api.patch('/bot/config', body)
      setConfig(data)
    } catch (e) {
      alert(e.response?.data?.detail || e.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const triggerBot = async () => {
    setTriggering(true)
    setTriggerMsg('')
    try {
      const { data } = await api.post('/bot/trigger', { max_replies: maxReplies })
      setTriggerMsg(data.message)
      // Nach 3 Sek alles neu laden
      setTimeout(() => { load(); loadReplies(); loadLogs() }, 3000)
    } catch (e) {
      setTriggerMsg(e.response?.data?.detail || 'Trigger failed.')
    } finally {
      setTriggering(false)
    }
  }

  const deleteReply = async (id) => {
    if (!confirm('Delete this reply from Instagram and database?')) return
    try {
      await api.delete(`/bot/replies/${id}`)
      loadReplies(replyPage)
    } catch {}
  }

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="spinner spinner-dark" style={{ width: 24, height: 24 }} />
      </div>
    </Layout>
  )

  const isPro = user?.subscription_tier === 'pro'
  const isAdmin = user?.is_admin
  const dailyPct = stats ? Math.round((stats.daily_used / stats.daily_limit) * 100) : 0
  // max_replies_per_run kommt jetzt korrekt aus UserOut
  const maxRepliesLimit = user?.max_replies_per_run ?? 5

  return (
    <Layout>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 32px' }}>

        {welcome && (
          <div className="animate-fade-up" style={{
            background: 'linear-gradient(135deg, #0071e3, #34aadc)',
            borderRadius: 'var(--radius-lg)', padding: '20px 24px',
            color: 'white', marginBottom: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Welcome to Repyla! 🎉</div>
              <div style={{ opacity: 0.85, fontSize: 14 }}>Connect your Instagram account below to get started.</div>
            </div>
            <button onClick={() => setWelcome(false)} style={{ color: 'white', opacity: 0.7, fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Dashboard</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {config?.ig_username ? `@${config.ig_username}` : 'No Instagram connected'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {config?.is_active ? 'Bot active' : 'Bot paused'}
            </span>
            <label className="toggle">
              <input type="checkbox" checked={config?.is_active || false} onChange={toggleActive} />
              <span className="toggle-track" />
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          <StatCard label="Replies today" value={stats?.replies_today ?? 0} sub={`of ${stats?.daily_limit ?? 0} limit`} />
          <StatCard label="This week" value={stats?.replies_this_week ?? 0} />
          <StatCard label="All time" value={stats?.replies_total ?? 0} />
        </div>

        {/* Daily limit bar */}
        {stats && (
          <div className="card animate-fade-up delay-1" style={{ padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Daily limit</span>
              <span style={{ fontWeight: 500 }}>{stats.daily_used} / {stats.daily_limit}</span>
            </div>
            <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: dailyPct > 80 ? 'var(--warning)' : 'var(--accent)',
                width: `${Math.min(dailyPct, 100)}%`,
                transition: 'width 600ms var(--ease)',
              }} />
            </div>
          </div>
        )}

        {/* Instagram connect */}
        {!config?.ig_username && (
          <div className="card animate-fade-up delay-2" style={{ padding: 20, marginBottom: 20, borderColor: 'var(--accent)', borderWidth: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ marginBottom: 4 }}>Connect Instagram</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Link your account to start replying.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                try {
                  const { data } = await api.get('/instagram/connect')
                  window.location.href = data.oauth_url
                } catch (e) {
                  alert(e.response?.data?.detail || 'Could not connect Instagram.')
                }
              }}>Connect →</button>
            </div>
          </div>
        )}

        {config?.ig_username && (
          <div className="card animate-fade-up delay-2" style={{ padding: '14px 20px', marginBottom: 20, background: 'var(--success-light)', border: '1px solid rgba(52,199,89,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ color: 'var(--success)', fontWeight: 500 }}>@{config.ig_username} connected</span>
            </div>
          </div>
        )}

        {/* ── LIVE ACTIVITY FEED ──────────────────────────────────────────── */}
        <LiveActivity logs={logs} />

        <BotInfoBox />

        {/* Config */}
        <div className="card animate-fade-up delay-3" style={{ padding: 28, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 20 }}>Bot configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div className="form-group">
              <label className="label">Character prompt</label>
              <textarea className="input" rows={4}
                placeholder="Describe how your bot should respond..."
                value={character} onChange={e => setCharacter(e.target.value)}
                style={{ minHeight: 110, borderColor: character.length > 1000 ? 'var(--danger)' : undefined }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Describe your persona, tone, and style.</p>
                <span style={{ fontSize: 12, fontWeight: 500, color: character.length > 1000 ? 'var(--danger)' : character.length > 900 ? 'var(--warning)' : 'var(--text-tertiary)' }}>
                  {character.length}/1000
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Blacklist accounts (one per line)</label>
              <textarea className="input" rows={3} placeholder={"username1\nusername2"}
                value={blacklist} onChange={e => setBlacklist(e.target.value)}
                style={{ minHeight: 80 }}
              />
            </div>

            <VipManager vipAccounts={vipAccounts} setVipAccounts={setVipAccounts} />

            <div>
              <label className="label">AI model</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="label" style={{ fontSize: 12 }}>Primary</label>
                  <select className="input" value={llmPrimary} onChange={e => setLlmPrimary(e.target.value)}>
                    {LLM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} ({o.provider})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label" style={{ fontSize: 12 }}>Secondary (for mix)</label>
                  <select className="input" value={llmSecondary} onChange={e => setLlmSecondary(e.target.value)}
                    disabled={user?.subscription_tier === 'trial'}>
                    <option value="">None — use primary only</option>
                    {LLM_OPTIONS.filter(o => o.value !== llmPrimary).map(o => (
                      <option key={o.value} value={o.value}>{o.label} ({o.provider})</option>
                    ))}
                  </select>
                </div>
              </div>
              {llmSecondary && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Mix ratio</span>
                    <span style={{ fontWeight: 500 }}>
                      {mixRatio}% {LLM_OPTIONS.find(o => o.value === llmPrimary)?.label} / {100 - mixRatio}% {LLM_OPTIONS.find(o => o.value === llmSecondary)?.label}
                    </span>
                  </div>
                  <input type="range" min="0" max="100" value={mixRatio}
                    onChange={e => setMixRatio(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={() => saveConfig()}
              disabled={saving || character.length > 1000}
              style={{ alignSelf: 'flex-start', minWidth: 120 }}>
              {saving ? <div className="spinner" /> : character.length > 1000 ? `Too long (${character.length}/1000)` : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Manual trigger — nur Trial, Manual, Admin */}
        {(!isPro || isAdmin) && (
          <div className="card animate-fade-up delay-4" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h4 style={{ marginBottom: 4 }}>Manual trigger</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Run the bot once right now.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: 13 }}>Max replies</label>
                  <input className="input" type="number" min="1" max={maxRepliesLimit}
                    value={maxReplies} onChange={e => setMaxReplies(Number(e.target.value))}
                    style={{ width: 80 }} />
                </div>
                <button className="btn btn-primary" onClick={triggerBot}
                  disabled={triggering || (!config?.ig_username && !isAdmin)}>
                  {triggering ? <div className="spinner" /> : '▶ Run now'}
                </button>
              </div>
            </div>
            {triggerMsg && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 13 }}>
                {triggerMsg}
              </div>
            )}
          </div>
        )}

        <KeywordManager
          keywords={keywords}
          onRefresh={loadKeywords}
          tier={user?.subscription_tier}
        />

        {/* Reply history — 5 pro Seite */}
        <div className="card animate-fade-up delay-5" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>Reply history</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Kommentar + Antwort. Delete entfernt beides von Instagram und der Datenbank.
              </p>
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{replyTotal} total</span>
          </div>

          {replies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
              No replies yet. Run the bot to get started.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {replies.map((r, i) => (
                  <ReplyRow key={r.id} reply={r} onDelete={() => deleteReply(r.id)} odd={i % 2 === 0} />
                ))}
              </div>

              {replyTotal > 5 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <button className="btn btn-secondary btn-sm" disabled={replyPage === 1}
                    onClick={() => loadReplies(replyPage - 1)}>← Prev</button>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {replyPage} / {Math.ceil(replyTotal / 5)}
                  </span>
                  <button className="btn btn-secondary btn-sm" disabled={replyPage >= Math.ceil(replyTotal / 5)}
                    onClick={() => loadReplies(replyPage + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </Layout>
  )
}

// ── Live Activity Feed ────────────────────────────────────────────────────────
function LiveActivity({ logs }) {
  if (!logs || logs.length === 0) return null

  const latest = logs[0]
  const isRunning = latest && (Date.now() - new Date(latest.ran_at).getTime()) < 60000

  return (
    <div className="card animate-fade-up" style={{
      padding: '16px 20px', marginBottom: 20,
      border: isRunning ? '1px solid rgba(52,199,89,0.3)' : '1px solid var(--border)',
      background: isRunning ? 'var(--success-light)' : 'var(--surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isRunning ? (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 0 3px rgba(52,199,89,0.2)' }} />
          ) : (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-tertiary)', display: 'inline-block' }} />
          )}
          <span style={{ fontSize: 14, fontWeight: 500 }}>Live activity</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>updates every 15s</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {logs.map((log, i) => (
          <LogRow key={log.id} log={log} isLatest={i === 0} />
        ))}
      </div>
    </div>
  )
}

function LogRow({ log, isLatest }) {
  const timeAgo = formatTimeAgo(log.ran_at)
  const hasErrors = log.errors && log.errors.length > 0
  const success = log.replies_sent > 0
  const dmsSent = log.trigger === 'webhook_pro' || log.trigger === 'webhook'

  let icon = '⚙️'
  let color = 'var(--text-secondary)'
  if (success) { icon = '✅'; color = 'var(--success)' }
  if (hasErrors && !success) { icon = '⚠️'; color = 'var(--warning)' }
  if (dmsSent) { icon = '✉️'; color = 'var(--accent)' }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 0',
      borderBottom: '1px solid var(--border)',
      opacity: isLatest ? 1 : 0.6,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, color }}>
          {log.replies_sent > 0 && `${log.replies_sent} repl${log.replies_sent === 1 ? 'y' : 'ies'} sent`}
          {log.replies_sent === 0 && log.comments_found > 0 && `${log.comments_found} comments checked — 0 new`}
          {log.replies_sent === 0 && log.comments_found === 0 && (hasErrors ? log.errors[0] : 'No comments found')}
        </span>
        {' '}
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          via {log.trigger} · {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : ''}
        </span>
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>{timeAgo}</span>
    </div>
  )
}

function formatTimeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── ReplyRow ──────────────────────────────────────────────────────────────────
function ReplyRow({ reply, onDelete, odd }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 'var(--radius-md)',
      background: odd ? 'var(--surface-2)' : 'transparent',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>@{reply.commenter_username}</span>
          <span className="badge badge-gray" style={{ fontSize: 11 }}>{reply.llm_used}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {new Date(reply.replied_at).toLocaleDateString('de-DE', {
              day: '2-digit', month: '2-digit', year: '2-digit',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
          <button className="btn btn-sm"
            style={{ color: 'var(--danger)', padding: '2px 8px', fontSize: 12 }}
            onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.04)', fontSize: 13, color: 'var(--text-secondary)', borderLeft: '3px solid var(--border)' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 3, letterSpacing: '0.05em' }}>KOMMENTAR</span>
        {reply.comment_text}
      </div>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--accent-light)', fontSize: 13, color: 'var(--accent)', borderLeft: '3px solid var(--accent)' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', opacity: 0.7, display: 'block', marginBottom: 3, letterSpacing: '0.05em' }}>UNSERE ANTWORT</span>
        {reply.reply_text}
      </div>
    </div>
  )
}

// ── Keyword Manager ───────────────────────────────────────────────────────────
function KeywordManager({ keywords, onRefresh, tier }) {
  const isTrial = tier === 'trial'
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const openAdd = () => { setEditItem(null); setKeyword(''); setMessage(''); setError(''); setShowForm(true) }
  const openEdit = (kw) => { setEditItem(kw); setKeyword(kw.keyword); setMessage(kw.dm_message); setError(''); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditItem(null) }

  const save = async () => {
    if (!keyword.trim() || !message.trim()) { setError('Keyword and message are required.'); return }
    setSaving(true); setError('')
    try {
      if (editItem) {
        await api.patch(`/keywords/${editItem.id}`, { keyword: keyword.trim(), dm_message: message.trim() })
      } else {
        await api.post('/keywords', { keyword: keyword.trim(), dm_message: message.trim() })
      }
      await onRefresh(); closeForm()
    } catch (e) { setError(e.response?.data?.detail || 'Save failed.') }
    setSaving(false)
  }

  const toggle = async (kw) => {
    try { await api.patch(`/keywords/${kw.id}`, { is_active: !kw.is_active }); await onRefresh() } catch {}
  }

  const del = async (id) => {
    if (!confirm('Delete this keyword trigger?')) return
    try { await api.delete(`/keywords/${id}`); await onRefresh() } catch {}
  }

  return (
    <div className="card animate-fade-up" style={{ padding: 28, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>Keyword → DM Triggers</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Auto-send a DM when someone comments a keyword.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add keyword</button>
      </div>

      {isTrial && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 12, marginBottom: 16, marginTop: 8 }}>
          Trial: up to 2 keyword triggers, max 5 DMs/day via webhook.{' '}
          <a href="/pricing" style={{ fontWeight: 500 }}>Upgrade for more →</a>
        </div>
      )}

      {keywords.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
          No keyword triggers yet. Add one to start sending automatic DMs.
        </div>
      )}

      {keywords.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: showForm ? 16 : 0 }}>
          {keywords.map(kw => (
            <div key={kw.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)', gap: 12, opacity: kw.is_active ? 1 : 0.5,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>
                    {kw.keyword}
                  </span>
                  <span className="badge badge-gray" style={{ fontSize: 11 }}>{kw.sent_count} sent</span>
                  {!kw.is_active && <span className="badge badge-gray" style={{ fontSize: 11 }}>paused</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {kw.dm_message}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <label className="toggle" style={{ transform: 'scale(0.85)' }}>
                  <input type="checkbox" checked={kw.is_active} onChange={() => toggle(kw)} />
                  <span className="toggle-track" />
                </label>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(kw)}>Edit</button>
                <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(kw.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ marginTop: 16, padding: 20, borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h4>{editItem ? 'Edit trigger' : 'New keyword trigger'}</h4>
          <div className="form-group">
            <label className="label">Keyword</label>
            <input className="input" placeholder="e.g. LINK, INFO, PRICE" value={keyword} onChange={e => setKeyword(e.target.value)} />
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Case-insensitive. Can appear anywhere in the comment.</p>
          </div>
          <div className="form-group">
            <label className="label">DM message</label>
            <textarea className="input" rows={3} placeholder="Hey! Here's the link you asked for: ..."
              value={message} onChange={e => setMessage(e.target.value)} style={{ minHeight: 80 }} />
          </div>
          {error && <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={closeForm}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <div className="spinner" /> : editItem ? 'Save changes' : 'Add trigger'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── VIP Manager ───────────────────────────────────────────────────────────────
function VipManager({ vipAccounts, setVipAccounts }) {
  const [showForm, setShowForm] = useState(false)
  const [editIdx, setEditIdx] = useState(null)
  const [username, setUsername] = useState('')
  const [prompt, setPrompt] = useState('')

  const openAdd = () => { setEditIdx(null); setUsername(''); setPrompt(''); setShowForm(true) }
  const openEdit = (i) => { setEditIdx(i); setUsername(vipAccounts[i].username); setPrompt(vipAccounts[i].extra_prompt); setShowForm(true) }
  const close = () => { setShowForm(false); setEditIdx(null) }

  const save = () => {
    if (!username.trim() || !prompt.trim()) return
    const entry = { username: username.trim().replace('@', ''), extra_prompt: prompt.trim() }
    if (editIdx !== null) {
      const updated = [...vipAccounts]; updated[editIdx] = entry; setVipAccounts(updated)
    } else {
      setVipAccounts([...vipAccounts, entry])
    }
    close()
  }

  return (
    <div className="form-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label className="label" style={{ margin: 0 }}>VIP accounts <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>— special replies (max 5)</span></label>
        {vipAccounts.length < 5 && !showForm && <button className="btn btn-ghost btn-sm" onClick={openAdd}>+ Add</button>}
      </div>

      {vipAccounts.length === 0 && !showForm && (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No VIP accounts yet.</p>
      )}

      {vipAccounts.map((vip, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>@{vip.username}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vip.extra_prompt}</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(i)}>Edit</button>
          <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setVipAccounts(vipAccounts.filter((_, idx) => idx !== i))}>✕</button>
        </div>
      ))}

      {showForm && (
        <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <div className="form-group">
            <label className="label">Instagram username</label>
            <input className="input" placeholder="corastevensphoto" value={username} onChange={e => setUsername(e.target.value.replace('@', ''))} style={{ height: 40 }} />
          </div>
          <div className="form-group">
            <label className="label">Special instruction</label>
            <textarea className="input" rows={2} placeholder="She is your girlfriend — be loving and playful."
              value={prompt} onChange={e => setPrompt(e.target.value)} style={{ minHeight: 70 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={close}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!username.trim() || !prompt.trim()}>
              {editIdx !== null ? 'Update' : 'Add VIP'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bot Info Box ──────────────────────────────────────────────────────────────
function BotInfoBox() {
  const [open, setOpen] = useState(false)
  return (
    <div className="card animate-fade-up" style={{ padding: '14px 20px', marginBottom: 20, background: 'var(--accent-light)', border: '1px solid rgba(0,113,227,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>ℹ️</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--accent)' }}>How the bot works</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--accent)', opacity: 0.7 }}>{open ? 'Hide ▲' : 'Show ▼'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '✅', text: 'Replies to comments on your latest post(s)' },
            { icon: '✅', text: 'Every comment gets a unique, human-sounding reply' },
            { icon: '✅', text: 'Keyword triggers send an automatic DM (all plans)' },
            { icon: '⚡', text: 'Pro: instant webhook reactions — no polling delay' },
            { icon: '⏭️', text: 'Emoji-only comments are skipped' },
            { icon: '⏭️', text: 'Blacklisted accounts are ignored' },
            { icon: '⏭️', text: 'Already-replied comments are never answered twice' },
            { icon: '📊', text: 'All replies logged — delete anytime from Instagram + database' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
