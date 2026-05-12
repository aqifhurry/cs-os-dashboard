// src/pages/cs/DashboardCS.jsx
// ─────────────────────────────────────────────────────────────
// Import Navbar (unified) — BUKAN NavbarCS lagi
// ─────────────────────────────────────────────────────────────
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";       // ← ganti dari NavbarCS
import PageLayout from "../../components/PageLayout";

export default function DashboardCS() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <PageLayout navbar={<Navbar />}>
      <style>{css}</style>
      <div className="csd-home">

        {/* Welcome banner */}
        <div className="csd-welcome">
          <div className="csd-avatar">{user.nama?.[0]?.toUpperCase() ?? "C"}</div>
          <div>
            <h1 className="csd-title">Halo, {user.nama ?? "CS Agent"}! 👋</h1>
            <p className="csd-sub">Selamat bekerja. Pilih menu di atas untuk mulai.</p>
          </div>
        </div>

        {/* Quick-access grid */}
        <div className="csd-grid">
          <QuickCard
            icon="✅"
            label="What Should I Do Today"
            desc="Lihat & update status tugas kamu"
            href="/dashboard/cs/todo"
            color="#E8F0E8"
            accent="#3A7040"
          />
          <QuickCard
            icon="⏱️"
            label="Respon Time"
            desc="Tambah data waktu respons customer"
            href="/dashboard/cs/respon"
            color="#EFF6FF"
            accent="#1D4ED8"
          />
          <QuickCard
            icon="📅"
            label="Schedule"
            desc="Lihat jadwal shift bulanan"
            href="/dashboard/cs/schedule"
            color="#FFF7ED"
            accent="#C2410C"
          />
          <QuickCard
            icon="📁"
            label="Master Doc"
            desc="Dokumen & referensi tim"
            href="/dashboard/cs/masterdoc"
            color="#F5F3FF"
            accent="#6D28D9"
          />
          <QuickCard
            icon="❓"
            label="FAQ"
            desc="Pertanyaan yang sering ditanyakan"
            href="/dashboard/cs/faq"
            color="#FFF1F2"
            accent="#BE123C"
          />
        </div>
      </div>
    </PageLayout>
  );
}

function QuickCard({ icon, label, desc, href, color, accent }) {
  const navigate = useNavigate();
  return (
    <button
      className="csd-card"
      style={{ background: color }}
      onClick={() => navigate(href)}
    >
      <span className="csd-card-icon">{icon}</span>
      <div className="csd-card-body">
        <p className="csd-card-label" style={{ color: accent }}>{label}</p>
        <p className="csd-card-desc">{desc}</p>
      </div>
      <span className="csd-card-arrow" style={{ color: accent }}>›</span>
    </button>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  .csd-home {
    display: flex; flex-direction: column; gap: 24px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  /* Welcome banner */
  .csd-welcome {
    display: flex; align-items: center; gap: 16px;
    background: #fff; border-radius: 16px; padding: 24px;
    border: 1.5px solid #E8EDE8;
    box-shadow: 0 1px 6px rgba(43,49,64,0.05);
  }
  .csd-avatar {
    width: 52px; height: 52px; border-radius: 50%;
    background: #86A788; color: #fff; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 700;
    border: 3px solid #d4e4d5;
  }
  .csd-title { font-size: 20px; font-weight: 700; color: #2B3140; }
  .csd-sub   { font-size: 13px; color: #8E97A3; margin-top: 4px; }

  /* Grid */
  .csd-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  /* Cards */
  .csd-card {
    display: flex; align-items: center; gap: 14px;
    border-radius: 14px; padding: 18px;
    border: none; cursor: pointer; text-align: left;
    transition: transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 1px 4px rgba(43,49,64,0.04);
    width: 100%;
  }
  .csd-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(43,49,64,0.10);
  }
  .csd-card:active { transform: translateY(-1px); }

  .csd-card-icon  { font-size: 26px; flex-shrink: 0; }
  .csd-card-body  { flex: 1; }
  .csd-card-label { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
  .csd-card-desc  { font-size: 12px; color: #6B7280; }
  .csd-card-arrow { font-size: 20px; font-weight: 700; flex-shrink: 0; opacity: 0.6; }

  /* Responsive */
  @media (max-width: 480px) {
    .csd-grid    { grid-template-columns: 1fr; }
    .csd-welcome { flex-direction: column; text-align: center; }
    .csd-avatar  { margin: 0 auto; }
  }
`;
