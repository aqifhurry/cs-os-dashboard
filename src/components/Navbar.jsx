// src/components/Navbar.jsx
// ─────────────────────────────────────────────────────────────
// UNIFIED NAVBAR — satu file untuk SPV & CS.
// Tidak ada duplikasi class name → tidak ada CSS conflict.
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";

// ── Menu definitions ──────────────────────────────────────────
const SPV_MENUS = [
  { id: "todo",      label: "What Should I Do Today", path: "/dashboard/spv/todo"      },
  { id: "respon",    label: "Respon Time",            path: "/dashboard/spv/respon"    },
  { id: "schedule",  label: "Schedule",               path: "/dashboard/spv/schedule"  },
  { id: "masterdoc", label: "Master Doc",             path: "/dashboard/spv/masterdoc" },
  { id: "faq",       label: "FAQ",                    path: "/dashboard/spv/faq"       },
];

const CS_MENUS = [
  { id: "todo",      label: "What Should I Do Today", path: "/dashboard/cs/todo"      },
  { id: "respon",    label: "Respon Time",            path: "/dashboard/cs/respon"    },
  { id: "schedule",  label: "Schedule",               path: "/dashboard/cs/schedule"  },
  { id: "masterdoc", label: "Master Doc",             path: "/dashboard/cs/masterdoc" },
  { id: "faq",       label: "FAQ",                    path: "/dashboard/cs/faq"       },
];

// ── Component ─────────────────────────────────────────────────
export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = JSON.parse(localStorage.getItem("user") || "{}");
  const isSpv     = user.role === "spv";
  const menus     = isSpv ? SPV_MENUS : CS_MENUS;

  const [menuOpen, setMenuOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const initial = user.nama?.[0]?.toUpperCase() ?? (isSpv ? "S" : "C");

  return (
    <>
      <style>{navCss}</style>

      {/* ── Desktop / Tablet bar ─────────────────────────── */}
      <nav className="nav-bar">

        {/* Left: logo + brand */}
        <div className="nav-left">
          <img src={logo} alt="logo" className="nav-logo" />
          <div className="nav-brand-wrap">
            <span className="nav-brand">CS Dashboard</span>
            {/* Role badge — only visible on wider screens */}
            <span className={`nav-role-badge ${isSpv ? "badge-spv" : "badge-cs"}`}>
              {isSpv ? "Supervisor" : "Agent"}
            </span>
          </div>
        </div>

        {/* Center: menu links */}
        <div className="nav-menu">
          {menus.map(m => (
            <button
              key={m.id}
              className={`nav-item ${isActive(m.path) ? "nav-item--active" : ""}`}
              onClick={() => navigate(m.path)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Right: user info + logout */}
        <div className="nav-right">
          <div className="nav-user">
            <div className="nav-avatar" aria-hidden="true">{initial}</div>
            <div className="nav-user-info">
              <span className="nav-user-name">{user.nama ?? (isSpv ? "SPV" : "CS Agent")}</span>
              <span className="nav-user-role">{isSpv ? "Supervisor" : "CS Agent"}</span>
            </div>
          </div>
          <button className="nav-logout-btn" onClick={logout} title="Keluar" aria-label="Keluar">
            <LogoutIcon />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Buka menu"
        >
          {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
        </button>
      </nav>

      {/* ── Mobile dropdown ──────────────────────────────── */}
      {menuOpen && (
        <div className="nav-mobile-panel">
          {/* User row */}
          <div className="nav-mobile-user-row">
            <div className="nav-avatar nav-avatar--lg">{initial}</div>
            <div>
              <div className="nav-user-name">{user.nama ?? (isSpv ? "SPV" : "CS Agent")}</div>
              <div className="nav-user-role">{isSpv ? "Supervisor" : "CS Agent"}</div>
            </div>
          </div>

          <div className="nav-mobile-divider" />

          {menus.map(m => (
            <button
              key={m.id}
              className={`nav-mobile-item ${isActive(m.path) ? "nav-mobile-item--active" : ""}`}
              onClick={() => { navigate(m.path); setMenuOpen(false); }}
            >
              {m.label}
            </button>
          ))}

          <div className="nav-mobile-divider" />

          <button className="nav-mobile-item nav-mobile-item--logout" onClick={logout}>
            <LogoutIcon />
            Keluar
          </button>
        </div>
      )}
    </>
  );
}

// ── Icons ─────────────────────────────────────────────────────
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6"  x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6"  x2="6"  y2="18"/>
      <line x1="6"  y1="6"  x2="18" y2="18"/>
    </svg>
  );
}

// ── CSS — UNIQUE class names, no conflict possible ────────────
const navCss = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  /* ── Bar ─────────────────────────────────────────────── */
  .nav-bar {
    position: sticky; top: 0; z-index: 100;
    background: #ffffff;
    border-bottom: 1px solid rgba(134,167,136,0.18);
    padding: 0 24px; height: 60px;
    display: flex; align-items: center; gap: 16px;
    box-shadow: 0 1px 8px rgba(43,49,64,0.06);
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  /* ── Left ────────────────────────────────────────────── */
  .nav-left {
    display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  }
  .nav-logo {
    width: 32px; height: 32px; border-radius: 8px;
    object-fit: contain;
  }
  .nav-brand-wrap { display: flex; flex-direction: column; line-height: 1; }
  .nav-brand { font-weight: 700; font-size: 15px; color: #2B3140; white-space: nowrap; }
  .nav-role-badge {
    font-size: 9px; font-weight: 700; border-radius: 4px;
    padding: 2px 6px; letter-spacing: 0.6px;
    text-transform: uppercase; margin-top: 3px; width: fit-content;
  }
  .badge-spv { background: #E8F0E8; color: #3A7040; }
  .badge-cs  { background: #FFE2E2; color: #BE123C; }

  /* ── Center menu ─────────────────────────────────────── */
  .nav-menu {
    display: flex; align-items: center; gap: 2px;
    flex: 1; overflow-x: auto;
  }
  .nav-menu::-webkit-scrollbar { display: none; }

  .nav-item {
    padding: 6px 12px; border-radius: 8px; border: none;
    background: transparent; color: #6B7280;
    font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 500; cursor: pointer; white-space: nowrap;
    transition: background 0.15s, color 0.15s;
  }
  .nav-item:hover { background: #F0F5F0; color: #2B3140; }
  .nav-item--active {
    background: #E8F0E8; color: #3A7040; font-weight: 700;
  }

  /* ── Right ───────────────────────────────────────────── */
  .nav-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .nav-user  { display: flex; align-items: center; gap: 8px; }

  .nav-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: #86A788; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px; flex-shrink: 0;
    border: 2px solid #d4e4d5;
  }
  .nav-avatar--lg { width: 40px; height: 40px; font-size: 16px; }

  .nav-user-info { display: flex; flex-direction: column; }
  .nav-user-name { font-size: 13px; font-weight: 600; color: #2B3140; line-height: 1.2; }
  .nav-user-role { font-size: 11px; color: #86A788; font-weight: 500; }

  .nav-logout-btn {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: 8px; border: none;
    background: #FEE2E2; color: #B91C1C; cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }
  .nav-logout-btn:hover { background: #FECACA; transform: scale(1.05); }

  /* ── Hamburger ───────────────────────────────────────── */
  .nav-hamburger {
    display: none; align-items: center; justify-content: center;
    width: 36px; height: 36px; border-radius: 8px; border: none;
    background: #F0F5F0; color: #2B3140; cursor: pointer; margin-left: auto;
    transition: background 0.15s;
  }
  .nav-hamburger:hover { background: #E8EDE8; }

  /* ── Mobile panel ────────────────────────────────────── */
  .nav-mobile-panel {
    position: sticky; top: 60px; z-index: 99;
    background: #fff; border-bottom: 1px solid #E8EDE8;
    padding: 12px 16px 14px;
    display: flex; flex-direction: column; gap: 2px;
    box-shadow: 0 4px 16px rgba(43,49,64,0.10);
    font-family: 'Plus Jakarta Sans', sans-serif;
    animation: nav-slide-down 0.2s ease both;
  }
  @keyframes nav-slide-down {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .nav-mobile-user-row {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 12px 10px;
  }

  .nav-mobile-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 8px; border: none;
    background: transparent; color: #4B5563;
    font-size: 13.5px; font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 500; cursor: pointer; text-align: left;
    transition: background 0.15s, color 0.15s;
  }
  .nav-mobile-item:hover { background: #F0F5F0; color: #2B3140; }
  .nav-mobile-item--active { background: #E8F0E8; color: #3A7040; font-weight: 700; }
  .nav-mobile-item--logout { color: #B91C1C; }
  .nav-mobile-item--logout:hover { background: #FEE2E2; }

  .nav-mobile-divider { height: 1px; background: #E8EDE8; margin: 6px 0; }

  /* ── Responsive ──────────────────────────────────────── */
  @media (max-width: 768px) {
    .nav-menu      { display: none; }
    .nav-right     { display: none; }
    .nav-hamburger { display: flex; }
  }
`;
