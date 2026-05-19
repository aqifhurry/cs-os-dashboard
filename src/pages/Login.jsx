import { useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import logo from "../assets/logo.png";

// ─────────────────────────────────────────────────────────────
// format nomor HP ke format 628xxx
// ─────────────────────────────────────────────────────────────
const normalizePhone = (raw = "") => {
  const cleaned = String(raw).trim().replace(/[\s\-]/g, "");
  if (cleaned.startsWith("+62")) return cleaned.slice(1);
  if (cleaned.startsWith("08"))  return "62" + cleaned.slice(1);
  if (cleaned.startsWith("62"))  return cleaned;
  return cleaned;
};

export default function Login() {
  const [noHp, setNoHp]         = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [focused, setFocused]   = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");

    if (!noHp.trim() || !password.trim()) {
      setError("Nomor WA & password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const inputPhone    = normalizePhone(noHp);
      const inputPassword = password.trim();

      console.log("=== LOGIN DEBUG ===");
      console.log("Input HP asli     :", noHp);
      console.log("Input HP normalize:", inputPhone);
      console.log("Input password    :", inputPassword);

      const querySnapshot = await getDocs(collection(db, "users"));

      console.log("Total dokumen di Firestore:", querySnapshot.size);
      querySnapshot.forEach((doc) => {
        console.log("Dokumen:", doc.id, doc.data());
      });

      let foundUser = null;

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        const dbPhoneRaw =
          data.noHp        ??
          data.noHP        ??
          data.nohp        ??
          data.phone       ??
          data.phoneNumber ??
          data.no_hp       ??
          data.nomor       ??
          data.nomorHp     ??
          "";

        const dbPhone    = normalizePhone(dbPhoneRaw);
        const dbPassword = String(data.password ?? "").trim();

        const isAktif =
          data.aktif === undefined
            ? true
            : data.aktif === true || data.aktif === "true" || data.aktif === 1;

        console.log(`--- [${doc.id}] ---`);
        console.log("  DB phone (raw)       :", dbPhoneRaw);
        console.log("  DB phone (normalized):", dbPhone, " | match?", dbPhone === inputPhone);
        console.log("  DB password          :", dbPassword, " | match?", dbPassword === inputPassword);
        console.log("  isAktif              :", isAktif);

        if (
          dbPhone    === inputPhone    &&
          dbPassword === inputPassword &&
          isAktif
        ) {
          foundUser = { id: doc.id, ...data };
        }
      });

      if (!foundUser) {
        console.warn("LOGIN GAGAL — tidak ada dokumen yang cocok.");
        setError("Nomor WA atau password tidak cocok.");
        setLoading(false);
        return;
      }

      console.log("LOGIN SUKSES ✓", foundUser);
      localStorage.setItem("user", JSON.stringify(foundUser));

      if      (foundUser.role === "spv") navigate("/dashboard/spv");
      else if (foundUser.role === "cs")  navigate("/dashboard/cs");
      else    setError(`Role "${foundUser.role}" tidak dikenali.`);

    } catch (err) {
      console.error("ERROR saat login:", err);
      setError("Terjadi kesalahan koneksi. Coba lagi.");
    }

    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <>
      <style>{css}</style>

      <div className="lp-root">
        <div className="blob blob-top"    aria-hidden="true" />
        <div className="blob blob-bottom" aria-hidden="true" />

        <div className="lp-card">

          {/* ── LOGO ── */}
          <div className="lp-badge">
            <img
              src={logo}
              alt="Logo CS Dashboard"
              style={{
                width: 36,
                height: 36,
                objectFit: "contain",
                borderRadius: 8,
              }}
            />
          </div>

          <h1 className="lp-title">CS Dashboard</h1>
          <p  className="lp-sub">Masuk menggunakan nomor WhatsApp</p>

          <div className="lp-fields">

            <label className="lp-label">Nomor WhatsApp</label>
            <div className={`lp-input-wrap ${focused === "hp" ? "focus" : ""}`}>
              <PhoneIcon />
              <input
                type="text"
                inputMode="numeric"
                placeholder="08xxxxxxxxxx"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                onFocus={() => setFocused("hp")}
                onBlur={() => setFocused("")}
                onKeyDown={handleKey}
                className="lp-input"
              />
            </div>

            <label className="lp-label" style={{ marginTop: 16 }}>Password</label>
            <div className={`lp-input-wrap ${focused === "pw" ? "focus" : ""}`}>
              <LockIcon />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("pw")}
                onBlur={() => setFocused("")}
                onKeyDown={handleKey}
                className="lp-input"
              />
            </div>
          </div>

          {error && (
            <div className="lp-error">
              <WarnIcon />
              <span>{error}</span>
            </div>
          )}

          <button
            className={`lp-btn ${loading ? "loading" : ""}`}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? <span className="lp-spinner" /> : "Masuk"}
          </button>

          <p className="lp-hint">Hubungi supervisor jika lupa password.</p>
        </div>
      </div>
    </>
  );
}

// ─── Icons ───────────────────────────────────────────────────

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="#86A788" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07
               A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18
               2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81
               a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27
               a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="#86A788" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
         style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8"  x2="12"    y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

// ─── CSS ─────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  .lp-root {
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh;
    background: #F5F7F5;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }

  .blob {
    position: fixed;
    border-radius: 50%;
    filter: blur(72px);
    pointer-events: none;
    z-index: 0;
  }
  .blob-top    { width:420px; height:420px; background:#86A78830; top:-140px; right:-120px; }
  .blob-bottom { width:380px; height:380px; background:#FFE2E255; bottom:-130px; left:-100px; }

  .lp-card {
    position: relative;
    z-index: 1;
    background: #ffffff;
    border-radius: 24px;
    padding: 40px 36px 36px;
    width: 100%;
    max-width: 400px;
    box-shadow:
      0 0 0 1px rgba(134,167,136,0.10),
      0 8px 16px rgba(43,49,64,0.06),
      0 24px 48px rgba(43,49,64,0.08);
    animation: lp-rise 0.45s cubic-bezier(0.22,1,0.36,1) both;
  }
  @keyframes lp-rise {
    from { opacity:0; transform:translateY(18px) scale(0.98); }
    to   { opacity:1; transform:translateY(0)    scale(1); }
  }

  .lp-badge {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: #1a56db;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    overflow: hidden;
    border: 1px solid rgba(134,167,136,0.15);
  }

  .lp-title {
    font-size:22px; font-weight:700; color:#2B3140;
    margin:0 0 4px; letter-spacing:-0.3px;
  }
  .lp-sub {
    font-size:13.5px; color:#8E97A3;
    margin:0 0 28px; font-weight:400;
  }

  .lp-fields {
    display: flex;
    flex-direction: column;
    margin-bottom: 8px;
  }

  .lp-label {
    font-size:12.5px; font-weight:600; color:#4A5568;
    margin-bottom:6px; letter-spacing:0.1px;
  }

  .lp-input-wrap {
    display:flex; align-items:center; gap:10px;
    border:1.5px solid #E8EDE8;
    border-radius:12px; padding:0 14px;
    background:#FAFBFA;
    transition:border-color 0.18s, box-shadow 0.18s, background 0.18s;
  }
  .lp-input-wrap.focus {
    border-color:#86A788;
    background:#ffffff;
    box-shadow:0 0 0 3px rgba(134,167,136,0.15);
  }

  .lp-input {
    flex:1; border:none; outline:none;
    background:transparent;
    padding:13px 0;
    font-size:14px; color:#2B3140;
    font-family:inherit;
  }
  .lp-input::placeholder { color:#B8C0CC; font-weight:400; }

  .lp-error {
    display:flex; align-items:flex-start; gap:7px;
    font-size:12.5px; color:#C0392B;
    background:#FEF2F2; border:1px solid #FECACA;
    border-radius:10px; padding:10px 12px;
    margin:12px 0 4px;
    line-height:1.5;
    animation:lp-shake 0.3s ease;
  }
  @keyframes lp-shake {
    0%,100% { transform:translateX(0); }
    25%     { transform:translateX(-5px); }
    75%     { transform:translateX(5px); }
  }

  .lp-btn {
    width:100%; margin-top:22px; padding:14px;
    border:none; border-radius:12px;
    background:linear-gradient(135deg, #86A788 0%, #6d9070 100%);
    color:#ffffff; font-size:15px; font-weight:700;
    font-family:inherit; letter-spacing:0.2px;
    cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:transform 0.15s, box-shadow 0.15s, opacity 0.15s;
    box-shadow:0 4px 14px rgba(134,167,136,0.35);
  }
  .lp-btn:hover:not(:disabled) {
    transform:translateY(-1px);
    box-shadow:0 6px 20px rgba(134,167,136,0.45);
  }
  .lp-btn:active:not(:disabled) {
    transform:translateY(0);
    box-shadow:0 2px 8px rgba(134,167,136,0.3);
  }
  .lp-btn.loading, .lp-btn:disabled { opacity:0.75; cursor:not-allowed; }

  .lp-spinner {
    width:18px; height:18px;
    border:2.5px solid rgba(255,255,255,0.35);
    border-top-color:#ffffff;
    border-radius:50%;
    animation:lp-spin 0.7s linear infinite;
  }
  @keyframes lp-spin { to { transform:rotate(360deg); } }

  .lp-hint {
    text-align:center; font-size:12px;
    color:#B0BAC7; margin-top:18px; margin-bottom:0;
  }

  @media (max-width:440px) {
    .lp-card { padding:32px 22px 28px; border-radius:20px; }
  }
`;
