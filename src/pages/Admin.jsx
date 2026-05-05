import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const TIER_COLORS = {
  trial:    { badge: 'badge-gray',   label: 'Trial'    },
  manual:   { badge: 'badge-blue',   label: 'Manual'   },
  starter:  { badge: 'badge-blue',   label: 'Starter'  },
  pro:      { badge: 'badge-orange', label: 'Pro'       },
  business: { badge: 'badge-purple', label: 'Business' },
}
const STATUS_COLORS = {
  trialing: 'badge-green',
  active:   'badge-green',
  canceled: 'badge-red',
  past_due: 'badge-orange',
  inactive: 'badge-gray',
}

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats]         = useState(null)
  const [users, setUsers]         = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [loading, setLoading]     = useState(true)
  const [editUser, setEditUser]   = useState(null)

  // Global LLM Settings
  const [llmSettings, setLlmSettings]   = useState({ temperature: 1.2, max_tokens: 200 })
  const [llmSaving, setLlmSaving]       = useState(false)
  const [llmMsg, setLlmMsg]             = useState('')

  useEffect(() => {
    if (user && !user.is_admin) navigate('/dashboard')
  }, [user, navigate])

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/stats')
      setStats(data)
    } catch {}
  }, [])

  const loadUsers = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, page_size: 20 })
      if (search)     params.set('search', search)
      if (tierFilter) params.set('tier', tierFilter)
      const { data } = await api.get(`/admin/users?${params}`)
      setUsers(data.items)
      setTotal(data.total)
      setPage(p)
    } catch {}
    setLoading(false)
  }, [search, tierFilter])

  const loadLlmSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/settings/llm')
      setLlmSettings(data)
    } catch {}
  }, [])

  useEffect(() => { loadStats() },       [loadStats])
  useEffect(() => { loadUsers(1) },      [loadUsers])
  useEffect(() => { loadLlmSettings() }, [loadLlmSettings])

  const saveLlmSettings = async () => {
    setLlmSaving(true)
    setLlmMsg('')
    try {
      await api.patch('/admin/settings/llm', llmSettings)
      setLlmMsg('✓ Saved — applied to all users immediately.')
    } catch (e) {
      setLlmMsg(e.response?.data?.detail || 'Save failed.')
    }
    setLlmSaving(false)
    setTimeout(() => setLlmMsg(''), 3000)
  }

  const updateUser = async (id, body) => {
    try {
      await api.patch(`/admin/users/${id}`, body)
      loadUsers(page)
      setEditUser(null)
    } catch (e) {
      alert(e.response?.data?.detail || 'Update failed')
    }
  }

  const deleteUser = async (id, email) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/users/${id}`)
      loadUsers(page)
    } catch (e) {
      alert(e.response?.data?.detail || 'Delete failed')
    }
  }

  if (!user?.is_admin) return null

  return (
    <Layout>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h2>Admin</h2>
            <span className="badge badge-red" style={{ fontSize: 11 }}>Internal</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Overview of all users and platform stats.
          </p>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="animate-fade-up" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12, marginBottom: 28,
          }}>
            <AdminStat label="Total users"    value={stats.total_users}        />
            <AdminStat label="Trial"          value={stats.trial_users}         color="#636366" />
            <AdminStat label="Manual"         value={stats.manual_users}        color="var(--accent)" />
            <AdminStat label="Pro"            value={stats.pro_users}           color="#ff9500" />
            <AdminStat label="Business"       value={stats.business_users}      color="#bf5af2" />
            <AdminStat label="Active bots"    value={stats.active_bots}         color="var(--success)" />
            <AdminStat label="Replies today"  value={stats.replies_today}       />
            <AdminStat label="Replies / week" value={stats.replies_this_week}   />
            <AdminStat label="New this week"  value={stats.new_users_this_week} color="var(--success)" />
          </div>
        )}

        {/* Global LLM Settings */}
        <div className="card animate-fade-up" style={{ padding: '20px 24px', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h4 style={{ marginBottom: 2 }}>Global LLM Settings</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Overrides all user settings — applied to every bot run immediately.
              </p>
            </div>
            {llmMsg && (
              <span style={{ fontSize: 13, color: llmMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>
                {llmMsg}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
            {/* Temperature */}
            <div className="form-group">
              <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Temperature</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{llmSettings.temperature.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0" max="2" step="0.05"
                value={llmSettings.temperature}
                onChange={e => setLlmSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                <span>0.0 — precise</span>
                <span>2.0 — creative</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="form-group">
              <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Max Tokens</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{llmSettings.max_tokens}</span>
              </label>
              <input
                type="range"
                min="50" max="500" step="10"
                value={llmSettings.max_tokens}
                onChange={e => setLlmSettings(s => ({ ...s, max_tokens: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                <span>50 — short</span>
                <span>500 — long</span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={saveLlmSettings}
            disabled={llmSaving}
            style={{ width: 'fit-content' }}
          >
            {llmSaving ? <div className="spinner" /> : 'Save & Apply to all users'}
          </button>
        </div>

        {/* Filters */}
        <div className="animate-fade-up delay-1" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Search by email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadUsers(1)}
            style={{ maxWidth: 280 }}
          />
          <select className="input" value={tierFilter} onChange={e => setTierFilter(e.target.value)} style={{ width: 160 }}>
            <option value="">All plans</option>
            <option value="trial">Trial</option>
            <option value="manual">Manual</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
          <button className="btn btn-secondary" onClick={() => loadUsers(1)}>Search</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setTierFilter('') }}>
            Clear
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-secondary)', lineHeight: '40px' }}>
            {total} users
          </span>
        </div>

        {/* User table */}
        <div className="card animate-fade-up delay-2" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  {['Email', 'Plan', 'Status', 'Instagram', 'Replies', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center' }}>
                    <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
                  </td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    No users found.
                  </td></tr>
                ) : users.map((u, i) => (
                  <tr key={u.id} style={{
                    borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 120ms',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>{u.email}</span>
                        {u.is_admin && <span className="badge badge-red" style={{ fontSize: 10 }}>admin</span>}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className={`badge ${TIER_COLORS[u.subscription_tier]?.badge || 'badge-gray'}`}>
                        {TIER_COLORS[u.subscription_tier]?.label || u.subscription_tier}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className={`badge ${STATUS_COLORS[u.subscription_status] || 'badge-gray'}`}>
                        {u.subscription_status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                      {u.ig_username ? `@${u.ig_username}` : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                      {u.total_replies}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditUser(u)}>
                          Edit
                        </button>
                        <button className="btn btn-sm" style={{ color: 'var(--danger)' }}
                          onClick={() => deleteUser(u.id, u.email)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => loadUsers(page - 1)}>← Prev</button>
              <span style={{ lineHeight: '32px', fontSize: 13, color: 'var(--text-secondary)' }}>
                {page} / {Math.ceil(total / 20)}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => loadUsers(page + 1)}>Next →</button>
            </div>
          )}
        </div>

        {/* Edit modal */}
        {editUser && (
          <EditModal user={editUser} onClose={() => setEditUser(null)} onSave={updateUser} />
        )}
      </div>
    </Layout>
  )
}

function AdminStat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', color: color || 'var(--text-primary)', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  )
}

function EditModal({ user, onClose, onSave }) {
  const [tier, setTier]       = useState(user.subscription_tier)
  const [status, setStatus]   = useState(user.subscription_status)
  const [isAdmin, setIsAdmin] = useState(user.is_admin)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div className="card animate-fade-up" style={{ width: '100%', maxWidth: 400, padding: 28 }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 4 }}>Edit user</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{user.email}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="label">Plan</label>
            <select className="input" value={tier} onChange={e => setTier(e.target.value)}>
              <option value="trial">Trial</option>
              <option value="manual">Manual</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="trialing">trialing</option>
              <option value="active">active</option>
              <option value="past_due">past_due</option>
              <option value="canceled">canceled</option>
              <option value="inactive">inactive</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Admin access</span>
            <label className="toggle">
              <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => onSave(user.id, { subscription_tier: tier, subscription_status: status, is_admin: isAdmin })}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
