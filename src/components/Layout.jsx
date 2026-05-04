import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
  { to: '/settings',  label: 'Settings',  icon: IconGear  },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const nav = [
    ...NAV,
    ...(user?.is_admin ? [{ to: '/admin', label: 'Admin', icon: IconShield }] : []),
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <Sidebar
        user={user}
        logout={logout}
        nav={nav}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Mobile top bar */}
      <div style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 98,
        height: 56, background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }} className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #0071e3, #34aadc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em' }}>Repyla</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 8, borderRadius: 8,
            color: 'var(--text-secondary)',
          }}
        >
          <IconMenu size={22} />
        </button>
      </div>

      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        minHeight: '100vh',
      }} className="main-content">
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .mobile-topbar { display: flex !important; }
          .main-content { margin-left: 0 !important; padding-top: 56px; }
          .desktop-sidebar { transform: translateX(-100%) !important; }
          .desktop-sidebar.open { transform: translateX(0) !important; }
        }
      `}</style>
    </div>
  )
}

function Sidebar({ user, logout, nav, mobileOpen, onClose }) {
  return (
    <aside
      className={`desktop-sidebar ${mobileOpen ? 'open' : ''}`}
      style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 'var(--sidebar-width)',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '24px 16px',
        zIndex: 100,
        transition: 'transform 250ms cubic-bezier(.25,.46,.45,.94)',
      }}>
      {/* Logo + Mobile close */}
      <div style={{ padding: '0 8px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #0071e3, #34aadc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,113,227,0.3)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em' }}>Repyla</span>
        </div>
        {/* Close button — only visible on mobile */}
        <button
          onClick={onClose}
          className="mobile-close-btn"
          style={{
            display: 'none',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, borderRadius: 6, color: 'var(--text-secondary)',
          }}
        >
          <IconX size={18} />
        </button>
        <style>{`
          @media (max-width: 768px) {
            .mobile-close-btn { display: block !important; }
          }
        `}</style>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 'var(--radius-md)',
            fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em',
            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
            background: isActive ? 'var(--accent-light)' : 'transparent',
            transition: 'all var(--duration) var(--ease)',
          })}>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ padding: '0 4px 12px' }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user?.email}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            <span className={`badge badge-${user?.subscription_status === 'active' || user?.subscription_status === 'trialing' ? 'green' : 'red'}`}
              style={{ fontSize: 11, padding: '2px 8px' }}>
              {user?.subscription_tier === 'trial' ? 'Trial' : user?.subscription_tier === 'pro' ? 'Pro' : 'Manual'}
            </span>
          </div>
        </div>
        <button
          className="btn btn-secondary"
          style={{ width: '100%', fontSize: 13, height: 36 }}
          onClick={logout}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
function IconShield({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconGrid({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconGear({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconMenu({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function IconX({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
