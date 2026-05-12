// src/pages/spv/DashboardSPV.jsx
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import PageLayout from "../../components/PageLayout";

export default function DashboardSPV() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <PageLayout navbar={<Navbar />}>
      <style>{css}</style>
      <div className="spv-home">

        {/* Welcome banner */}
        <div className="spv-welcome">
          <div className="spv-avatar">{user.nama?.[0]?.toUpperCase() ?? "S"}</div>
          <div>
            <h1 className="spv-title">Halo, {user.nama ?? "Supervisor"}! 👋</h1>
            <p className="spv-sub">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long", day: "2-digit", month: "long", year: "numeric"
              })}
            </p>
          </div>
        </div>

        {/* Section label */}
        <div className="spv-section-label">Menu Supervisor</div>

        {/* Quick-access grid */}
        <div className="spv-grid">
          <QuickCard
            icon="✅"
            label="What Should I Do Today"
            desc="Kelola & assign tugas ke tim CS"
            href="/dashboard/spv/todo"
            color="#E8F0E8"
            accent="#3A7040"
          />
          <QuickCard
            icon="⏱️"
            label="Respon Time"
            desc="Monitor waktu respons seluruh tim"
            href="/dashboard/spv/respon"
            color="#EFF6FF"
            accent="#1D4ED8"
          />
          <QuickCard
            icon="📅"
            label="Schedule"
            desc="Atur jadwal shift bulanan tim"
            href="/dashboard/spv/schedule"
            color="#FFF7ED"
            accent="#C2410C"
          />
          <QuickCard
            icon="📁"
            label="Master Doc"
            desc="Kelola dokumen & referensi tim"
            href="/dashboard/spv/masterdoc"
            color="#F5F3FF"
            accent="#6D28D9"
          />
          <QuickCard
            icon="❓"
            label="FAQ"
            desc="Kelola pertanyaan yang sering muncul"
            href="/dashboard/spv/faq"
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
      className="spv-card"
      style={{ background: color }}
      onClick={() => navigate(href)}
    >
      <span className="spv-card-icon">{icon}</span>
      <div className="spv-card-body">
        <p className="spv-card-label" style={{ color: accent }}>{label}</p>
        <p className="spv-card-desc">{desc}</p>
      </div>
      <span className="spv-card-arrow" style={{ color: accent }}>›</span>
    </button>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  .spv-home {
    display: flex; flex-direction: column; gap: 20px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  /* Welcome */
  .spv-welcome {
    display: flex; align-items: center; gap: 16px;
    background: #fff; border-radius: 16px; padding: 24px;
    border: 1.5px solid #E8EDE8;
    box-shadow: 0 1px 6px rgba(43,49,64,0.05);
  }
  .spv-avatar {
    width: 52px; height: 52px; border-radius: 50%;
    background: #86A788; color: #fff; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 700;
    border: 3px solid #d4e4d5;
  }
  .spv-title { font-size: 20px; font-weight: 700; color: #2B3140; }
  .spv-sub   { font-size: 13px; color: #8E97A3; margin-top: 4px; }

  /* Section label */
  .spv-section-label {
    font-size: 12px; font-weight: 700; color: #9CA3AF;
    text-transform: uppercase; letter-spacing: 0.8px;
  }

  /* Grid */
  .spv-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  /* Card */
  .spv-card {
    display: flex; align-items: center; gap: 14px;
    border-radius: 14px; padding: 18px;
    border: none; cursor: pointer; text-align: left; width: 100%;
    transition: transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 1px 4px rgba(43,49,64,0.04);
  }
  .spv-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(43,49,64,0.10);
  }
  .spv-card:active { transform: translateY(-1px); }

  .spv-card-icon  { font-size: 26px; flex-shrink: 0; }
  .spv-card-body  { flex: 1; }
  .spv-card-label { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
  .spv-card-desc  { font-size: 12px; color: #6B7280; }
  .spv-card-arrow { font-size: 20px; font-weight: 700; flex-shrink: 0; opacity: 0.5; }

  @media (max-width: 480px) {
    .spv-grid    { grid-template-columns: 1fr; }
    .spv-welcome { flex-direction: column; text-align: center; }
    .spv-avatar  { margin: 0 auto; }
  }
`;
