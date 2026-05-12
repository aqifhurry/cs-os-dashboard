// src/pages/cs/CSSchedulePage.jsx
// ─────────────────────────────────────────────────────────────
// CS Schedule — view only, tabel identik dengan SPV
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import Navbar     from "../../components/Navbar";
import PageLayout from "../../components/PageLayout";

const SHIFTS = [
  "Shift 1 (09.00-16.00)",
  "Shift 2 (16.00-23.00)",
  "Off",
];

const SHIFT_COLORS = {
  "Shift 1 (09.00-16.00)": { bg: "#FEF3C7", text: "#92400E" },
  "Shift 2 (16.00-23.00)": { bg: "#EDE9FE", text: "#5B21B6" },
  "Off":                    { bg: "#F3F4F6", text: "#4B5563" },
};

export default function CSSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "schedules"), snap =>
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  const filtered = schedules
    .filter(s => s.tanggal?.startsWith(month))
    .sort((a, b) => (a.tanggal || "").localeCompare(b.tanggal || ""));

  const monthLabel = () => {
    const [y, m] = month.split("-");
    return new Date(y, m - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  return (
    <PageLayout navbar={<Navbar />}>
      <style>{css}</style>

      {/* ── Header — sama dengan SPV, minus tombol tambah ── */}
      <div className="sc-header">
        <div>
          <h1 className="sc-title">Schedule</h1>
          <p className="sc-sub">Shift 1: 09.00–16.00 • Shift 2: 16.00–23.00</p>
        </div>
        <div className="sc-view-badge">View Only</div>
      </div>

      {/* ── Filter bulan — identik dengan SPV ── */}
      <div className="sc-filter">
        <input type="month" className="f-sel" value={month}
          onChange={e => setMonth(e.target.value)} />
        <span className="sc-count">
          {filtered.length} jadwal • {monthLabel()}
        </span>
      </div>

      {/* ── Legend shift — identik dengan SPV ── */}
      <div className="sc-legend">
        {SHIFTS.map(s => (
          <span key={s} className="sc-legend-item"
            style={{ background: SHIFT_COLORS[s].bg, color: SHIFT_COLORS[s].text }}>
            {s}
          </span>
        ))}
      </div>

      {/* ── Tabel grouped per tanggal — identik dengan SPV, tanpa kolom aksi ── */}
      <div className="table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Shift 1 (09.00–16.00)</th>
              <th>Shift 2 (16.00–23.00)</th>
              <th>Off</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="table-empty">
                  Belum ada jadwal untuk {monthLabel()}.
                </td>
              </tr>
            )}
            {(() => {
              // Group by tanggal — sama persis dengan SPV
              const byDate = {};
              filtered.forEach(s => {
                if (!byDate[s.tanggal]) byDate[s.tanggal] = [];
                byDate[s.tanggal].push(s);
              });
              return Object.entries(byDate).map(([tgl, items]) => {
                const shift1 = items.filter(s => s.shift === "Shift 1 (09.00-16.00)");
                const shift2 = items.filter(s => s.shift === "Shift 2 (16.00-23.00)");
                const off    = items.filter(s => s.shift === "Off");
                const fmtTgl = new Date(tgl + "T00:00:00").toLocaleDateString("id-ID", {
                  weekday: "short", day: "2-digit", month: "short"
                });
                return (
                  <tr key={tgl}>
                    <td className="td-date">{fmtTgl}</td>

                    {/* Shift 1 */}
                    <td>
                      {shift1.length > 0
                        ? shift1.map(s => (
                            <div key={s.id} className="td-person-row">
                              <span className="shift-badge"
                                style={{ background:"#FEF3C7", color:"#92400E" }}>
                                {s.nama}
                              </span>
                            </div>
                          ))
                        : <span className="td-empty-slot">–</span>
                      }
                    </td>

                    {/* Shift 2 */}
                    <td>
                      {shift2.length > 0
                        ? shift2.map(s => (
                            <div key={s.id} className="td-person-row">
                              <span className="shift-badge"
                                style={{ background:"#EDE9FE", color:"#5B21B6" }}>
                                {s.nama}
                              </span>
                            </div>
                          ))
                        : <span className="td-empty-slot">–</span>
                      }
                    </td>

                    {/* Off */}
                    <td>
                      {off.length > 0
                        ? off.map(s => (
                            <div key={s.id} className="td-person-row">
                              <span className="shift-badge"
                                style={{ background:"#F3F4F6", color:"#4B5563" }}>
                                {s.nama}
                              </span>
                            </div>
                          ))
                        : <span className="td-empty-slot">–</span>
                      }
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}

// ── CSS — identik dengan SPVSchedulePage ────────────────────
const css = `
  .sc-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:20px; font-family:'Plus Jakarta Sans',sans-serif; }
  .sc-title  { font-size:22px; font-weight:700; color:#2B3140; }
  .sc-sub    { font-size:13px; color:#8E97A3; margin-top:2px; }

  /* Badge view-only — sama tinggi dengan btn-primary SPV */
  .sc-view-badge {
    display:flex; align-items:center;
    padding:9px 16px; border-radius:10px;
    background:#F3F4F6; color:#6B7280;
    font-size:13px; font-weight:600;
    font-family:'Plus Jakarta Sans',sans-serif;
    border:1.5px solid #E8EDE8;
  }

  .sc-filter { display:flex; align-items:center; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
  .f-sel     { padding:8px 10px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; color:#2B3140; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; }
  .f-sel:focus { border-color:#86A788; }
  .sc-count  { font-size:13px; color:#6B7280; font-family:'Plus Jakarta Sans',sans-serif; }

  .sc-legend { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
  .sc-legend-item { font-size:11px; font-weight:700; border-radius:20px; padding:3px 10px; }

  .table-wrap { overflow-x:auto; border-radius:12px; border:1.5px solid #E8EDE8; }
  .sc-table   { width:100%; border-collapse:collapse; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; }
  .sc-table th {
    background:#F5F7F5; padding:10px 14px;
    text-align:left; font-weight:600; color:#4B5563;
    border-bottom:1.5px solid #E8EDE8; white-space:nowrap;
  }
  .sc-table td { padding:10px 14px; border-bottom:1px solid #F3F4F6; color:#374151; }
  .sc-table tr:last-child td { border-bottom:none; }
  .sc-table tr:hover td { background:#FAFBFA; }

  .td-date       { font-weight:600; color:#2B3140; white-space:nowrap; font-size:13px; }
  .td-empty-slot { color:#D1D5DB; font-size:13px; }
  .td-person-row { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
  .td-person-row:last-child { margin-bottom:0; }
  .shift-badge   { font-size:11px; font-weight:700; border-radius:20px; padding:3px 10px; display:inline-block; }

  .table-empty { text-align:center; color:#9CA3AF; padding:40px !important; }

  @media (max-width:640px) {
    .sc-table { font-size:12px; }
    .sc-table th, .sc-table td { padding:8px 10px; }
  }
`;
