// src/pages/cs/CSTodoPage.jsx
// ─────────────────────────────────────────────────────────────
// CS Todo — view + update status + progress + H-1 reminder
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { db } from "../../firebase";
import {
  collection, onSnapshot, query,
  orderBy, doc, updateDoc, serverTimestamp
} from "firebase/firestore";
import Navbar     from "../../components/Navbar";
import PageLayout from "../../components/PageLayout";
import { PIC_LIST, PRIORITY_LIST, PRIORITY_STYLE, STATUS_STYLE } from "../../constants";
import { sendDeadlineReminders } from "../../utils/sendWA";

const fmtDate = (str) => {
  if (!str) return "-";
  return new Date(str + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric"
  });
};

const isOverdue = (deadline, status) =>
  deadline && status !== "Done" && new Date(deadline + "T00:00:00") < new Date();

const isDueTomorrow = (deadline) => {
  if (!deadline) return false;
  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 1);
  return deadline === tmr.toISOString().split("T")[0];
};

const TABS = ["To Do", "Progress", "Done", "Recurring"];
const TAB_STATUSES = {
  "To Do":    ["Not Started"],
  "Progress": ["In Progress", "Blocker"],
  "Done":     ["Done"],
};

export default function CSTodoPage() {
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const [tab, setTab]       = useState("To Do");
  const [tasks, setTasks]   = useState([]);
  const [filter, setFilter] = useState({ pic:"", priority:"", category:"", dari:"", sampai:"" });
  const reminderSentRef     = useRef(false);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      const all     = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const visible = all.filter(t => !t.deletedAt);
      setTasks(visible);

      // ── Kirim reminder H-1 sekali per session ──
      if (!reminderSentRef.current && visible.length > 0) {
        reminderSentRef.current = true;
        sendDeadlineReminders(visible);
      }
    });
    return unsub;
  }, []);

  // Pisahkan regular dan recurring
  const regularTasks   = tasks.filter(t => !t.isRecurring);
  const recurringTasks = tasks.filter(t =>  t.isRecurring);

  const counts = {
    "To Do":     regularTasks.filter(t => t.status === "Not Started").length,
    "Progress":  regularTasks.filter(t => ["In Progress","Blocker"].includes(t.status)).length,
    "Done":      regularTasks.filter(t => t.status === "Done").length,
    "Recurring": recurringTasks.length,
  };

  const applyFilter = (list) => list.filter(t => {
    if (filter.pic      && t.pic !== filter.pic) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.category && !t.category?.toLowerCase().includes(filter.category.toLowerCase())) return false;
    if (filter.dari     && t.tanggalMasuk < filter.dari) return false;
    if (filter.sampai   && t.tanggalMasuk > filter.sampai) return false;
    return true;
  });

  const getFiltered = () => {
    if (tab === "Recurring") return applyFilter(recurringTasks);
    return applyFilter(regularTasks.filter(t => TAB_STATUSES[tab]?.includes(t.status)));
  };

  const filtered = getFiltered();

  const updateStatus = async (taskId, newStatus, extra = {}) => {
    await updateDoc(doc(db, "tasks", taskId), {
      status: newStatus, ...extra, updatedAt: serverTimestamp(),
    });
  };

  return (
    <PageLayout navbar={<Navbar />}>
      <style>{css}</style>

      {/* ── Header ── */}
      <div className="cs-header">
        <div>
          <h1 className="cs-title">What Should I Do Today</h1>
          <p className="cs-sub">
            {new Date().toLocaleDateString("id-ID", {
              weekday:"long", day:"2-digit", month:"long", year:"numeric"
            })}
          </p>
        </div>
        <div className="cs-view-badge">CS Agent</div>
      </div>

      {/* ── Tabs ── */}
      <div className="cs-tabs">
        {TABS.map(t => (
          <button key={t}
            className={`cs-tab ${tab===t?"active":""} ${t==="Recurring"?"tab-recur":""}`}
            onClick={() => setTab(t)}>
            {t}
            <span className="cs-tab-count">{counts[t]}</span>
          </button>
        ))}
      </div>

      {/* ── Filter ── */}
      <div className="cs-filter">
        <select className="f-sel" value={filter.pic}
          onChange={e=>setFilter(f=>({...f,pic:e.target.value}))}>
          <option value="">Semua PIC</option>
          {PIC_LIST.map(p=><option key={p}>{p}</option>)}
        </select>
        <select className="f-sel" value={filter.priority}
          onChange={e=>setFilter(f=>({...f,priority:e.target.value}))}>
          <option value="">Semua Priority</option>
          {PRIORITY_LIST.map(p=><option key={p}>{p}</option>)}
        </select>
        <input className="f-sel" placeholder="Cari kategori..."
          value={filter.category}
          onChange={e=>setFilter(f=>({...f,category:e.target.value}))} />
        {tab !== "Recurring" && (
          <div className="f-date-range">
            <input type="date" className="f-sel" value={filter.dari}
              onChange={e=>setFilter(f=>({...f,dari:e.target.value}))} />
            <span className="f-sep">–</span>
            <input type="date" className="f-sel" value={filter.sampai}
              onChange={e=>setFilter(f=>({...f,sampai:e.target.value}))} />
          </div>
        )}
        {(filter.pic||filter.priority||filter.category||filter.dari||filter.sampai) && (
          <button className="f-clear"
            onClick={()=>setFilter({pic:"",priority:"",category:"",dari:"",sampai:""})}>
            Reset
          </button>
        )}
      </div>

      {/* ── Recurring banner ── */}
      {tab === "Recurring" && (
        <div className="recur-info">
          🔁 Tugas berulang tidak punya deadline — selalu muncul sampai dihapus SPV.
        </div>
      )}

      {/* ── Task list ── */}
      <div className="cs-list">
        {filtered.length === 0 && (
          <div className="cs-empty">
            <EmptyIcon />
            <p>{tab === "Recurring" ? "Belum ada tugas berulang." : "Tidak ada tugas di tab ini."}</p>
          </div>
        )}
        {filtered.map(task => (
          <CSTaskCard
            key={task.id}
            task={task}
            tab={tab}
            user={user}
            onUpdateStatus={updateStatus}
          />
        ))}
      </div>
    </PageLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// CS TASK CARD
// ─────────────────────────────────────────────────────────────
function CSTaskCard({ task, tab, user, onUpdateStatus }) {
  const [showUpdate, setShowUpdate]     = useState(false);
  const [localStatus, setLocalStatus]   = useState(task.status);
  const [localPct, setLocalPct]         = useState(task.progressPct ?? 0);
  const [localBlocker, setLocalBlocker] = useState(task.blockerReason ?? "");
  const [saving, setSaving]             = useState(false);

  const pc       = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.Medium;
  const ss       = STATUS_STYLE[task.status]     || STATUS_STYLE["Not Started"];
  const overdue  = isOverdue(task.deadline, task.status);
  const dueTmr   = isDueTomorrow(task.deadline);
  const isMyTask = user.nama === task.pic;
  const canUpdate = tab !== "Done";

  // Reset local state kalau task berubah dari luar
  useEffect(() => {
    setLocalStatus(task.status);
    setLocalPct(task.progressPct ?? 0);
    setLocalBlocker(task.blockerReason ?? "");
  }, [task.status, task.progressPct, task.blockerReason]);

  const applyUpdate = async () => {
    if (localStatus === "Blocker" && !localBlocker.trim()) {
      alert("Alasan blocker wajib diisi."); return;
    }
    setSaving(true);
    await onUpdateStatus(task.id, localStatus, {
      progressPct:   localStatus === "In Progress" ? localPct : task.progressPct,
      blockerReason: localStatus === "Blocker"     ? localBlocker : task.blockerReason,
    });
    setSaving(false);
    setShowUpdate(false);
  };

  return (
    <div className={`tc ${overdue?"overdue":""} ${dueTmr&&!overdue?"due-tomorrow":""} ${isMyTask?"my-task":""}`}>

      {/* Ribbon — hanya satu yang muncul */}
      {dueTmr && !overdue && <div className="due-tmr-ribbon">⏰ Deadline Besok!</div>}
      {isMyTask && !dueTmr && <div className="my-task-ribbon">Tugas Kamu</div>}

      {/* Top: badges */}
      <div className="tc-top">
        <div className="tc-badges">
          <span className="tc-priority" style={{ background:pc.bg, color:pc.text }}>
            <span className="tc-dot" style={{ background:pc.dot }} />
            {task.priority}
          </span>
          <span className="tc-status" style={{ background:ss.bg, color:ss.text }}>
            {task.status}
          </span>
          {task.category && <span className="tc-cat">{task.category}</span>}
          {task.isRecurring && task.recurFreq && (
            <span className="tc-recur-badge">
              {task.recurFreq === "daily"   ? "🔁 Harian"
               : task.recurFreq === "weekly" ? "🔁 Mingguan"
               : "🔁 Bulanan"}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="tc-title">{task.judul}</h4>
      {task.deskripsi && <p className="tc-desc">{task.deskripsi}</p>}
      {task.link && (
        <a href={task.link} target="_blank" rel="noreferrer" className="tc-link">
          Buka Link →
        </a>
      )}

      {/* Meta */}
      <div className="tc-meta">
        {task.pic && (
          <span className="tc-meta-item">
            <b>PIC:</b> {task.pic}
            {isMyTask && <span className="tc-me-tag"> (Kamu)</span>}
          </span>
        )}
        {task.tanggalMasuk && (
          <span className="tc-meta-item"><b>Masuk:</b> {fmtDate(task.tanggalMasuk)}</span>
        )}
        {task.deadline && (
          <span className={`tc-meta-item ${overdue?"tc-red":""} ${dueTmr&&!overdue?"tc-orange":""}`}>
            <b>Deadline:</b> {fmtDate(task.deadline)}
            {overdue        && " ⚠️ Terlambat"}
            {dueTmr && !overdue && " ⏰ Besok!"}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {task.status === "In Progress" && (
        <div className="tc-progress">
          <div className="tc-bar-wrap">
            <div className="tc-bar-fill" style={{ width:`${task.progressPct??0}%` }} />
          </div>
          <span className="tc-bar-label">{task.progressPct??0}%</span>
        </div>
      )}

      {/* Blocker */}
      {task.status === "Blocker" && task.blockerReason && (
        <div className="tc-blocker">🚧 <b>Blocker:</b> {task.blockerReason}</div>
      )}

      {/* Note */}
      {task.note && <p className="tc-note"><b>Note:</b> {task.note}</p>}

      {/* Footer: tombol update */}
      {canUpdate && (
        <div className="tc-footer">
          <button
            className={`btn-sm-sage ${isMyTask?"btn-sm-sage--mine":""}`}
            onClick={() => setShowUpdate(s => !s)}>
            {showUpdate ? "✕ Tutup"
             : isMyTask  ? "✏️ Update Status Saya"
             : "✏️ Update Status"}
          </button>
        </div>
      )}

      {/* Update panel */}
      {showUpdate && (
        <div className="tc-update-panel">
          <p className="tc-update-label">
            {isMyTask
              ? "Update status tugas kamu:"
              : `Update status — PIC: ${task.pic}`}
          </p>

          {/* Status chips */}
          <div className="status-options">
            {["Not Started","In Progress","Blocker","Done"].map(s => (
              <button key={s} type="button"
                className={`status-chip ${localStatus===s?"selected":""}`}
                style={localStatus===s
                  ? { background:STATUS_STYLE[s].bg, color:STATUS_STYLE[s].text, borderColor:STATUS_STYLE[s].text }
                  : {}}
                onClick={() => setLocalStatus(s)}>
                {s}
              </button>
            ))}
          </div>

          {/* Progress slider */}
          {localStatus === "In Progress" && (
            <div className="update-field">
              <label className="form-label">Progress: {localPct}%</label>
              <input type="range" min="0" max="100" step="5" className="form-range"
                value={localPct} onChange={e => setLocalPct(Number(e.target.value))} />
              <div className="progress-preview">
                <div className="progress-preview-bar" style={{ width:`${localPct}%` }} />
                <span className="progress-preview-val">{localPct}%</span>
              </div>
            </div>
          )}

          {/* Blocker reason */}
          {localStatus === "Blocker" && (
            <div className="update-field">
              <label className="form-label">Alasan Blocker *</label>
              <textarea className="form-input form-textarea" rows={2}
                value={localBlocker}
                onChange={e => setLocalBlocker(e.target.value)}
                placeholder="Jelaskan hambatan..." />
            </div>
          )}

          {/* Actions */}
          <div className="update-actions">
            <button className="btn-ghost" onClick={() => setShowUpdate(false)}>
              Batal
            </button>
            <button className="btn-primary" onClick={applyUpdate} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Status"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────
function EmptyIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
      stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M9 9h6M9 13h4"/>
    </svg>
  );
}

// ── CSS ──────────────────────────────────────────────────────
const css = `
  /* Header */
  .cs-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:24px; font-family:'Plus Jakarta Sans',sans-serif; }
  .cs-title  { font-size:22px; font-weight:700; color:#2B3140; }
  .cs-sub    { font-size:13px; color:#86A788; font-weight:500; margin-top:2px; }
  .cs-view-badge { padding:7px 14px; border-radius:10px; background:#E8F0E8; color:#3A7040; font-size:12px; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; align-self:flex-start; border:1px solid #C6D9C7; }

  /* Tabs */
  .cs-tabs { display:flex; gap:4px; background:#E8EDE8; border-radius:12px; padding:4px; width:fit-content; margin-bottom:16px; flex-wrap:wrap; }
  .cs-tab {
    display:flex; align-items:center; gap:7px;
    padding:8px 14px; border-radius:9px; border:none;
    background:transparent; color:#6B7280;
    font-size:13px; font-weight:600;
    font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:all 0.15s;
  }
  .cs-tab.active { background:#fff; color:#2B3140; box-shadow:0 1px 4px rgba(0,0,0,0.08); }
  .cs-tab.tab-recur { color:#7C3AED; }
  .cs-tab.tab-recur.active { color:#5B21B6; }
  .cs-tab-count { background:#86A788; color:#fff; font-size:11px; font-weight:700; border-radius:20px; padding:1px 7px; }
  .cs-tab.active .cs-tab-count { background:#3A7040; }
  .cs-tab.tab-recur .cs-tab-count { background:#7C3AED; }
  .cs-tab.tab-recur.active .cs-tab-count { background:#5B21B6; }

  /* Filter */
  .cs-filter { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; align-items:center; }
  .f-sel { padding:8px 10px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; color:#2B3140; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; min-width:130px; outline:none; }
  .f-sel:focus { border-color:#86A788; }
  .f-date-range { display:flex; align-items:center; gap:6px; }
  .f-sep   { color:#9CA3AF; font-size:13px; }
  .f-clear { padding:8px 12px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; color:#EF4444; font-size:13px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }

  /* Recurring banner */
  .recur-info { background:#F5F3FF; border:1px solid #DDD6FE; border-radius:10px; padding:10px 14px; font-size:13px; color:#5B21B6; margin-bottom:16px; font-family:'Plus Jakarta Sans',sans-serif; }

  /* List */
  .cs-list  { display:flex; flex-direction:column; gap:12px; }
  .cs-empty { display:flex; flex-direction:column; align-items:center; gap:10px; padding:48px 24px; color:#9CA3AF; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; text-align:center; }

  /* Task Card */
  .tc {
    background:#fff; border-radius:16px; padding:18px;
    border:1.5px solid #E8EDE8;
    box-shadow:0 1px 4px rgba(43,49,64,0.04);
    transition:box-shadow 0.15s;
    font-family:'Plus Jakarta Sans',sans-serif;
    position:relative; overflow:hidden;
  }
  .tc:hover         { box-shadow:0 4px 16px rgba(43,49,64,0.09); }
  .tc.overdue       { border-color:#FECACA; background:#FFFAFA; }
  .tc.due-tomorrow  { border-color:#FDE68A; background:#FFFBEB; }
  .tc.my-task       { border-color:#86A788; border-width:2px; }

  .my-task-ribbon  { position:absolute; top:0; right:0; background:#86A788; color:#fff; font-size:10px; font-weight:700; padding:3px 12px; border-radius:0 14px 0 8px; }
  .due-tmr-ribbon  { position:absolute; top:0; right:0; background:#F59E0B; color:#fff; font-size:10px; font-weight:700; padding:3px 12px; border-radius:0 14px 0 8px; }

  /* Card content */
  .tc-top    { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:8px; }
  .tc-badges { display:flex; flex-wrap:wrap; gap:6px; }
  .tc-priority    { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700; border-radius:20px; padding:3px 9px; }
  .tc-dot         { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .tc-status      { font-size:11px; font-weight:700; border-radius:20px; padding:3px 9px; }
  .tc-cat         { font-size:11px; font-weight:600; color:#4B5563; background:#F3F4F6; border-radius:20px; padding:3px 9px; }
  .tc-recur-badge { font-size:11px; font-weight:700; color:#5B21B6; background:#EDE9FE; border-radius:20px; padding:3px 9px; }

  .tc-title  { font-size:15px; font-weight:700; color:#2B3140; margin-bottom:5px; }
  .tc-desc   { font-size:13px; color:#6B7280; line-height:1.55; margin-bottom:8px; }
  .tc-link   { font-size:12px; color:#86A788; font-weight:600; text-decoration:none; display:inline-block; margin-bottom:8px; }
  .tc-link:hover { text-decoration:underline; }

  .tc-meta      { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:10px; }
  .tc-meta-item { font-size:12px; color:#6B7280; }
  .tc-meta-item b { color:#4B5563; }
  .tc-me-tag    { font-size:10px; font-weight:700; color:#86A788; margin-left:4px; }
  .tc-red    { color:#EF4444 !important; }
  .tc-orange { color:#D97706 !important; }

  .tc-progress  { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .tc-bar-wrap  { flex:1; height:7px; background:#E5E7EB; border-radius:10px; overflow:hidden; }
  .tc-bar-fill  { height:100%; background:linear-gradient(90deg,#86A788,#5a8c5c); border-radius:10px; transition:width 0.4s; }
  .tc-bar-label { font-size:12px; font-weight:700; color:#3A7040; min-width:36px; text-align:right; }

  .tc-blocker { font-size:12px; color:#B91C1C; background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:8px 12px; margin-bottom:8px; }
  .tc-note    { font-size:12px; color:#6B7280; margin-bottom:8px; }
  .tc-footer  { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }

  /* Update panel */
  .tc-update-panel { margin-top:14px; padding:16px; border-radius:12px; background:#F5F7F5; border:1.5px solid #E8EDE8; }
  .tc-update-label { font-size:12px; font-weight:600; color:#4B5563; margin-bottom:10px; }

  .status-options { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:4px; }
  .status-chip { padding:6px 14px; border-radius:20px; border:1.5px solid #E8EDE8; background:#F9FAFB; color:#6B7280; font-size:12px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:all 0.15s; }
  .status-chip:hover { border-color:#86A788; color:#3A7040; }
  .status-chip.selected { font-weight:700; }

  .update-field { margin-top:12px; display:flex; flex-direction:column; gap:5px; }
  .update-actions { display:flex; gap:8px; margin-top:14px; justify-content:flex-end; }

  .progress-preview { display:flex; align-items:center; gap:10px; margin-top:8px; }
  .progress-preview-bar { flex:1; height:5px; background:#86A788; border-radius:10px; transition:width 0.3s; }
  .progress-preview-val { font-size:12px; font-weight:700; color:#3A7040; min-width:32px; text-align:right; }

  /* Buttons */
  .btn-primary { padding:9px 18px; border-radius:10px; border:none; background:#86A788; color:#fff; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:background 0.15s; box-shadow:0 2px 8px rgba(134,167,136,0.3); }
  .btn-primary:hover { background:#6d9070; }
  .btn-primary:disabled { opacity:0.65; cursor:not-allowed; }
  .btn-ghost   { padding:9px 18px; border-radius:10px; border:1.5px solid #E8EDE8; background:transparent; color:#4B5563; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-sm-sage { padding:7px 14px; border-radius:8px; border:none; background:#E8F0E8; color:#3A7040; font-size:12px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:background 0.15s; }
  .btn-sm-sage:hover { background:#d4e8d4; }
  .btn-sm-sage--mine { background:#86A788; color:#fff; }
  .btn-sm-sage--mine:hover { background:#6d9070; }

  .form-label { font-size:12px; font-weight:600; color:#4B5563; }
  .form-range { width:100%; accent-color:#86A788; margin-top:6px; }
  .form-input { padding:9px 12px; border-radius:9px; border:1.5px solid #E8EDE8; background:#FAFBFA; color:#2B3140; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; width:100%; }
  .form-input:focus { border-color:#86A788; background:#fff; }
  .form-textarea { resize:vertical; min-height:70px; }

  /* Responsive */
  @media (max-width:640px) {
    .cs-tabs { width:100%; }
    .cs-tab  { flex:1; justify-content:center; font-size:11px; padding:8px 4px; }
    .cs-filter { flex-direction:column; }
    .f-sel { width:100%; }
    .f-date-range { width:100%; }
    .f-date-range .f-sel { flex:1; }
  }
`;
