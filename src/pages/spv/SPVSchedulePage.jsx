import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection, addDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp
} from "firebase/firestore";
import PageLayout from "../../components/PageLayout";
import Navbar from "../../components/Navbar";
import { PIC_LIST } from "../../constants";

const SHIFTS = ["Shift 1 (09.00-16.00)", "Shift 2 (16.00-23.00)", "Off"];

const SHIFT_COLOR = {
  "Shift 1 (09.00-16.00)": { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  "Shift 2 (16.00-23.00)": { bg: "#EDE9FE", text: "#5B21B6", dot: "#7C3AED" },
  "Off":                    { bg: "#F3F4F6", text: "#4B5563", dot: "#9CA3AF" },
};

const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

// ── Helpers ──────────────────────────────────────────────────
const toDateStr = (y, m, d) =>
  `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDay    = (year, month) => new Date(year, month, 1).getDay();

// ─────────────────────────────────────────────────────────────
export default function SPVSchedulePage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const today    = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [schedules, setSchedules] = useState([]);
  const [selected, setSelected]   = useState(null); // tanggal yang diklik
  const [confirm,  setConfirm]    = useState(null);
  const [addForm,  setAddForm]    = useState({ nama:"", shift: SHIFTS[0] });
  const [dayDetail, setDayDetail] = useState(null); // tanggal untuk day-detail modal

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "schedules"), snap =>
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  // Build lookup: { "2025-04-15": [schedule, ...] }
  const byDate = schedules.reduce((acc, s) => {
    if (!acc[s.tanggal]) acc[s.tanggal] = [];
    acc[s.tanggal].push(s);
    return acc;
  }, {});

  // ── Navigation ─────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); }
    else setViewMonth(m => m-1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); }
    else setViewMonth(m => m+1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  // ── Add schedule ───────────────────────────────────────────
  const saveSchedule = async () => {
    if (!addForm.nama) { alert("Nama wajib dipilih."); return; }
    await addDoc(collection(db, "schedules"), {
      nama:      addForm.nama,
      shift:     addForm.shift,
      tanggal:   selected,
      createdAt: serverTimestamp(),
      createdBy: user.nama,
    });
    setAddForm({ nama:"", shift: SHIFTS[0] });
  };

  const deleteSchedule = async (id) => {
    await deleteDoc(doc(db, "schedules", id));
    setConfirm(null);
  };

  // ── Calendar grid ──────────────────────────────────────────
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay    = getFirstDay(viewYear, viewMonth);
  const totalCells  = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const todayStr    = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const selectedEntries  = selected   ? (byDate[selected]  || []) : [];
  const dayDetailEntries = dayDetail  ? (byDate[dayDetail] || []) : [];

  return (
    <PageLayout navbar={<Navbar />}>
      <style>{css}</style>

      {/* Header */}
      <div className="sc-header">
        <div>
          <h1 className="sc-title">Schedule</h1>
          <p className="sc-sub">Klik tanggal untuk assign shift agent</p>
        </div>
        <div className="sc-legend">
          {SHIFTS.map(s => (
            <span key={s} className="legend-pill"
              style={{ background: SHIFT_COLOR[s].bg, color: SHIFT_COLOR[s].text }}>
              <span className="legend-dot" style={{ background: SHIFT_COLOR[s].dot }} />
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Month nav */}
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>&#8249;</button>
        <div className="cal-nav-center">
          <span className="cal-month-label">
            {MONTHS_ID[viewMonth]} {viewYear}
          </span>
          <button className="cal-today-btn" onClick={goToday}>Hari Ini</button>
        </div>
        <button className="cal-nav-btn" onClick={nextMonth}>&#8250;</button>
      </div>

      {/* Calendar grid */}
      <div className="cal-wrap">
        {/* Day headers */}
        <div className="cal-grid">
          {DAYS_ID.map(d => (
            <div key={d} className={`cal-day-header ${d==="Min"?"sunday":""}`}>{d}</div>
          ))}

          {/* Cells */}
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - firstDay + 1;
            if (dayNum < 1 || dayNum > daysInMonth) {
              return <div key={i} className="cal-cell empty" />;
            }

            const dateStr   = toDateStr(viewYear, viewMonth, dayNum);
            const entries   = byDate[dateStr] || [];
            const isToday   = dateStr === todayStr;
            const isSunday  = (firstDay + dayNum - 1) % 7 === 0;
            const isSelected = selected === dateStr;

            const shift1 = entries.filter(e => e.shift === SHIFTS[0]);
            const shift2 = entries.filter(e => e.shift === SHIFTS[1]);
            const off    = entries.filter(e => e.shift === SHIFTS[2]);

            return (
              <div
                key={i}
                className={`cal-cell ${isToday?"today":""} ${isSunday?"sunday":""} ${isSelected?"selected":""} ${entries.length>0?"has-data":""}`}
                onClick={() => setSelected(isSelected ? null : dateStr)}
              >
                <span className="cal-day-num">{dayNum}</span>

                {/* Shift pills inside cell */}
                <div className="cal-cell-entries">
                  {shift1.length > 0 && (
                    <div className="cal-shift-row s1">
                      <span className="cal-shift-dot" style={{background:"#F59E0B"}} />
                      <span className="cal-shift-names">
                        {shift1.map(e => e.nama).join(", ")}
                      </span>
                    </div>
                  )}
                  {shift2.length > 0 && (
                    <div className="cal-shift-row s2">
                      <span className="cal-shift-dot" style={{background:"#7C3AED"}} />
                      <span className="cal-shift-names">
                        {shift2.map(e => e.nama).join(", ")}
                      </span>
                    </div>
                  )}
                  {off.length > 0 && (
                    <div className="cal-shift-row off">
                      <span className="cal-shift-dot" style={{background:"#9CA3AF"}} />
                      <span className="cal-shift-names">
                        {off.map(e => e.nama).join(", ")} (Off)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side panel — muncul saat tanggal dipilih */}
      {selected && (
        <div className="side-panel">
          <div className="side-panel-header">
            <div>
              <p className="side-panel-date">
                {new Date(selected + "T00:00:00").toLocaleDateString("id-ID", {
                  weekday:"long", day:"2-digit", month:"long", year:"numeric"
                })}
              </p>
              <p className="side-panel-count">{selectedEntries.length} assignment</p>
            </div>
            <button className="side-close" onClick={() => setSelected(null)}>✕</button>
          </div>

          {/* Existing assignments */}
          {selectedEntries.length > 0 && (
            <div className="side-list">
              {SHIFTS.map(shift => {
                const items = selectedEntries.filter(e => e.shift === shift);
                if (items.length === 0) return null;
                return (
                  <div key={shift} className="side-shift-group">
                    <p className="side-shift-label"
                      style={{ color: SHIFT_COLOR[shift].text }}>
                      {shift}
                    </p>
                    {items.map(e => (
                      <div key={e.id} className="side-agent-row">
                        <span className="side-agent-pill"
                          style={{ background: SHIFT_COLOR[shift].bg, color: SHIFT_COLOR[shift].text }}>
                          {e.nama}
                        </span>
                        <button className="side-del-btn"
                          onClick={() => setConfirm({ id:e.id, label:`${e.nama} — ${shift}` })}
                          title="Hapus">
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add form */}
          <div className="side-add-form">
            <p className="side-add-title">+ Tambah Agent</p>
            <div className="side-add-row">
              <select className="side-select" value={addForm.nama}
                onChange={e => setAddForm(f => ({ ...f, nama: e.target.value }))}>
                <option value="">-- Pilih --</option>
                {PIC_LIST.map(p => <option key={p}>{p}</option>)}
              </select>
              <select className="side-select" value={addForm.shift}
                onChange={e => setAddForm(f => ({ ...f, shift: e.target.value }))}>
                {SHIFTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <button className="side-add-btn" onClick={saveSchedule}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal-box modal-small" onClick={e => e.stopPropagation()}>
            <div className="confirm-wrap">
              <div className="confirm-icon"><TrashIcon /></div>
              <h3 className="confirm-title">Hapus jadwal?</h3>
              <p className="confirm-sub">"{confirm.label}" akan dihapus permanen.</p>
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setConfirm(null)}>Batal</button>
                <button className="btn-danger" onClick={() => deleteSchedule(confirm.id)}>Ya, Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  );
}

const css = `
  /* ── Header ── */
  .sc-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:16px; font-family:'Plus Jakarta Sans',sans-serif; }
  .sc-title  { font-size:22px; font-weight:700; color:#2B3140; }
  .sc-sub    { font-size:13px; color:#8E97A3; margin-top:2px; }
  .sc-legend { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .legend-pill { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700; border-radius:20px; padding:4px 10px; }
  .legend-dot  { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

  /* ── Month nav ── */
  .cal-nav { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; font-family:'Plus Jakarta Sans',sans-serif; }
  .cal-nav-btn { width:36px; height:36px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#4B5563; transition:background 0.15s; line-height:1; }
  .cal-nav-btn:hover { background:#F0F5F0; }
  .cal-nav-center { display:flex; align-items:center; gap:12px; }
  .cal-month-label { font-size:17px; font-weight:700; color:#2B3140; }
  .cal-today-btn { padding:5px 12px; border-radius:7px; border:1.5px solid #E8EDE8; background:#fff; font-size:12px; font-weight:600; color:#4B5563; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .cal-today-btn:hover { background:#F0F5F0; }

  /* ── Calendar grid ── */
  .cal-wrap { border-radius:16px; border:1.5px solid #E8EDE8; overflow:hidden; margin-bottom:20px; }
  .cal-grid {
    display:grid;
    grid-template-columns: repeat(7, 1fr);
    background:#fff;
  }

  .cal-day-header {
    padding:10px 0; text-align:center;
    font-size:12px; font-weight:700; color:#6B7280;
    background:#F5F7F5; border-bottom:1.5px solid #E8EDE8;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .cal-day-header.sunday { color:#EF4444; }

  .cal-cell {
    min-height:90px; padding:8px;
    border-right:1px solid #F3F4F6;
    border-bottom:1px solid #F3F4F6;
    cursor:pointer; position:relative;
    transition:background 0.12s;
    font-family:'Plus Jakarta Sans',sans-serif;
    vertical-align:top;
  }
  .cal-cell:nth-child(7n) { border-right:none; }
  .cal-cell.empty { background:#FAFBFA; cursor:default; }
  .cal-cell:not(.empty):hover { background:#F0F5F0; }
  .cal-cell.today { background:#E8F0E8; }
  .cal-cell.selected { background:#D4E8D4; border:2px solid #86A788; }
  .cal-cell.sunday .cal-day-num { color:#EF4444; }
  .cal-cell.today .cal-day-num { background:#86A788; color:#fff; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; }

  .cal-day-num {
    font-size:13px; font-weight:600; color:#2B3140;
    display:inline-flex; align-items:center; justify-content:center;
    width:22px; height:22px; margin-bottom:4px;
  }

  .cal-cell-entries { display:flex; flex-direction:column; gap:2px; }
  .cal-shift-row {
    display:flex; align-items:center; gap:3px;
    background:#F9FAFB; border-radius:4px; padding:2px 5px;
    overflow:hidden;
  }
  .cal-shift-row.s1  { background:#FFFBEB; }
  .cal-shift-row.s2  { background:#F5F3FF; }
  .cal-shift-row.off { background:#F9FAFB; }
  .cal-shift-dot   { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
  .cal-shift-names { font-size:10px; font-weight:600; color:#374151; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* ── Side panel ── */
  .side-panel {
    background:#fff; border-radius:16px; border:1.5px solid #E8EDE8;
    padding:20px; margin-bottom:20px;
    box-shadow:0 4px 16px rgba(43,49,64,0.08);
    font-family:'Plus Jakarta Sans',sans-serif;
    animation:slideUp 0.2s cubic-bezier(0.22,1,0.36,1);
  }
  @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

  .side-panel-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
  .side-panel-date   { font-size:15px; font-weight:700; color:#2B3140; }
  .side-panel-count  { font-size:12px; color:#8E97A3; margin-top:2px; }
  .side-close { width:28px; height:28px; border-radius:7px; border:none; background:#F3F4F6; color:#6B7280; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; }
  .side-close:hover { background:#E5E7EB; }

  .side-list { display:flex; flex-direction:column; gap:12px; margin-bottom:16px; }
  .side-shift-group { display:flex; flex-direction:column; gap:6px; }
  .side-shift-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:2px; }
  .side-agent-row   { display:flex; align-items:center; gap:8px; }
  .side-agent-pill  { font-size:12px; font-weight:700; border-radius:20px; padding:4px 12px; }
  .side-del-btn     { width:24px; height:24px; border-radius:6px; border:none; background:#FEE2E2; color:#B91C1C; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .side-del-btn:hover { background:#FECACA; }

  .side-add-form  { border-top:1.5px solid #E8EDE8; padding-top:14px; }
  .side-add-title { font-size:12px; font-weight:700; color:#4B5563; margin-bottom:10px; }
  .side-add-row   { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .side-select    { flex:1; min-width:120px; padding:8px 10px; border-radius:8px; border:1.5px solid #E8EDE8; background:#FAFBFA; color:#2B3140; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; }
  .side-select:focus { border-color:#86A788; background:#fff; }
  .side-add-btn   { padding:8px 16px; border-radius:8px; border:none; background:#86A788; color:#fff; font-size:13px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; white-space:nowrap; }
  .side-add-btn:hover { background:#6d9070; }

  /* ── Buttons ── */
  .btn-ghost  { padding:9px 18px; border-radius:10px; border:1.5px solid #E8EDE8; background:transparent; color:#4B5563; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-danger { padding:9px 18px; border-radius:10px; border:none; background:#EF4444; color:#fff; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-danger:hover { background:#DC2626; }

  /* ── Modal ── */
  .modal-overlay { position:fixed; inset:0; z-index:200; background:rgba(43,49,64,0.45); display:flex; align-items:center; justify-content:center; padding:16px; }
  .modal-box     { background:#fff; border-radius:20px; padding:28px; width:100%; max-width:480px; position:relative; }
  .modal-small   { max-width:360px; }
  .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:20px; }
  .confirm-wrap  { display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding-top:8px; font-family:'Plus Jakarta Sans',sans-serif; }
  .confirm-icon  { width:52px; height:52px; border-radius:50%; background:#FEE2E2; color:#EF4444; display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
  .confirm-title { font-size:16px; font-weight:700; color:#2B3140; }
  .confirm-sub   { font-size:13px; color:#6B7280; max-width:260px; line-height:1.5; }

  /* ── Responsive ── */
  @media (max-width:640px) {
    .cal-cell { min-height:60px; padding:4px; }
    .cal-day-num { font-size:11px; }
    .cal-shift-names { font-size:9px; }
    .sc-legend { display:none; }
    .side-add-row { flex-direction:column; }
    .side-select, .side-add-btn { width:100%; }
  }
`;
