import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy,
  serverTimestamp
} from "firebase/firestore";
import PageLayout from "../components/PageLayout";
import Navbar from "../components/Navbar";
import { PIC_LIST, PRIORITY_LIST, PRIORITY_STYLE, STATUS_STYLE } from "../constants";
import { sendTaskNotification, sendDeadlineReminders } from "../utils/sendWA";

// ── Helpers ──────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().split("T")[0];
const fmtDate   = (str) => {
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

const SOFT_DELETE_MS = 30 * 24 * 60 * 60 * 1000;

const RECUR_FREQ = [
  { value: "daily",   label: "Setiap Hari"   },
  { value: "weekly",  label: "Setiap Minggu" },
  { value: "monthly", label: "Setiap Bulan"  },
];

// ─────────────────────────────────────────────────────────────
export default function WhatShouldIDoToday() {
  const user       = JSON.parse(localStorage.getItem("user") || "{}");
  const isSPV      = user.role === "spv";
  const [tab, setTab] = useState("To Do");

  const [tasks, setTasks]             = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [showRecurForm, setShowRecurForm] = useState(false);
  const [editTask, setEditTask]       = useState(null);
  const [confirm, setConfirm]         = useState(null);
  const [filter, setFilter]           = useState({ pic:"", category:"", priority:"", dari:"", sampai:"" });
  const reminderSentRef               = useRef(false);

  const emptyForm = {
    tanggalMasuk: todayStr(), pic:"", judul:"", status:"Not Started",
    deskripsi:"", priority:"Medium", deadline:"", category:"", link:"",
    progressPct:0, blockerReason:"", note:"", isRecurring: false,
  };
  const emptyRecurForm = {
    pic:"", judul:"", deskripsi:"", priority:"Medium",
    category:"", link:"", note:"", recurFreq:"daily",
  };

  const [form, setForm]           = useState(emptyForm);
  const [recurForm, setRecurForm] = useState(emptyRecurForm);

  // ── Real-time listener ────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const visible = all.filter(t => {
        if (!t.deletedAt) return true;
        const ms = t.deletedAt.toDate
          ? t.deletedAt.toDate().getTime()
          : new Date(t.deletedAt).getTime();
        return Date.now() - ms < SOFT_DELETE_MS;
      });
      setTasks(visible);

      // FIX 1 — kirim reminder H-1 sekali per session saat tasks sudah loaded
      if (!reminderSentRef.current && visible.length > 0) {
        reminderSentRef.current = true;
        sendDeadlineReminders(visible);
      }
    });
    return unsub;
  }, []);

  // ── Derived data ──────────────────────────────────────────
  const regularTasks   = tasks.filter(t => !t.isRecurring && !t.deletedAt);
  const recurringTasks = tasks.filter(t =>  t.isRecurring && !t.deletedAt);

  const applyFilter = (list) => list.filter(t => {
    if (filter.pic && t.pic !== filter.pic) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.category && !t.category?.toLowerCase().includes(filter.category.toLowerCase())) return false;
    if (filter.dari && t.tanggalMasuk < filter.dari) return false;
    if (filter.sampai && t.tanggalMasuk > filter.sampai) return false;
    return true;
  });

  const TAB_STATUSES = {
    "To Do":    ["Not Started"],
    "Progress": ["In Progress", "Blocker"],
    "Done":     ["Done"],
  };

  const getFiltered = () => {
    if (tab === "Recurring") return applyFilter(recurringTasks);
    return applyFilter(regularTasks.filter(t => TAB_STATUSES[tab]?.includes(t.status)));
  };

  const filtered = getFiltered();

  const counts = {
    "To Do":     regularTasks.filter(t => t.status === "Not Started").length,
    "Progress":  regularTasks.filter(t => ["In Progress","Blocker"].includes(t.status)).length,
    "Done":      regularTasks.filter(t => t.status === "Done").length,
    "Recurring": recurringTasks.length,
  };

  // ── CRUD ─────────────────────────────────────────────────
  const saveTask = async () => {
    if (!form.judul.trim()) { alert("Judul tugas wajib diisi."); return; }
    if (!form.pic)          { alert("PIC wajib dipilih."); return; }

    const payload = { ...form, tanggalMasuk: todayStr(), updatedAt: serverTimestamp(), isRecurring: false };

    if (editTask) {
      await updateDoc(doc(db, "tasks", editTask.id), payload);
    } else {
      await addDoc(collection(db, "tasks"), {
        ...payload, createdAt: serverTimestamp(), createdBy: user.nama, deletedAt: null,
      });
      await sendTaskNotification({
        pic: form.pic, judul: form.judul, deadline: form.deadline, assignedBy: user.nama,
      });
    }
    closeForm();
  };

  const saveRecurring = async () => {
    if (!recurForm.judul.trim()) { alert("Judul wajib diisi."); return; }
    if (!recurForm.pic)          { alert("PIC wajib dipilih."); return; }

    await addDoc(collection(db, "tasks"), {
      ...recurForm,
      isRecurring:  true,
      status:       "Not Started",
      tanggalMasuk: todayStr(),
      progressPct:  0,
      blockerReason:"",
      deadline:     "",
      createdAt:    serverTimestamp(),
      createdBy:    user.nama,
      deletedAt:    null,
    });
    await sendTaskNotification({
      pic: recurForm.pic, judul: recurForm.judul, deadline: null, assignedBy: user.nama,
    });
    setShowRecurForm(false);
    setRecurForm(emptyRecurForm);
  };

  const updateStatus = async (taskId, newStatus, extra = {}) => {
    await updateDoc(doc(db, "tasks", taskId), {
      status: newStatus, ...extra, updatedAt: serverTimestamp(),
    });
  };

  const softDelete = async (taskId) => {
    await updateDoc(doc(db, "tasks", taskId), { deletedAt: serverTimestamp() });
    setConfirm(null);
  };

  const softDeleteAllDone = async () => {
    const done = regularTasks.filter(t => t.status === "Done");
    await Promise.all(done.map(t =>
      updateDoc(doc(db, "tasks", t.id), { deletedAt: serverTimestamp() })
    ));
    setConfirm(null);
  };

  const hardDeleteRecurring = async (taskId) => {
    await deleteDoc(doc(db, "tasks", taskId));
    setConfirm(null);
  };

  const recover = async (taskId) => {
    await updateDoc(doc(db, "tasks", taskId), {
      status: "Not Started", deletedAt: null, updatedAt: serverTimestamp(),
    });
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({
      tanggalMasuk: task.tanggalMasuk, pic: task.pic, judul: task.judul,
      status: task.status, deskripsi: task.deskripsi, priority: task.priority,
      deadline: task.deadline, category: task.category, link: task.link,
      progressPct: task.progressPct ?? 0, blockerReason: task.blockerReason ?? "",
      note: task.note ?? "", isRecurring: false,
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditTask(null); setForm(emptyForm); };

  return (
    <PageLayout navbar={<Navbar />}>
      <style>{css}</style>

      {/* Header */}
      <div className="ws-header">
        <div>
          <h1 className="ws-title">What Should I Do Today</h1>
          <p className="ws-sub">
            {new Date().toLocaleDateString("id-ID", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}
          </p>
        </div>
        {isSPV && (
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="btn-primary" onClick={() => { setShowForm(true); setEditTask(null); setForm(emptyForm); }}>
              + Tambah Tugas
            </button>
            <button className="btn-recurring" onClick={() => setShowRecurForm(true)}>
              + Recurring
            </button>
          </div>
        )}
      </div>

      {/* Tabs — FIX 2: tambah tab Recurring */}
      <div className="ws-tabs">
        {["To Do","Progress","Done","Recurring"].map(t => (
          <button key={t}
            className={`ws-tab ${tab===t?"active":""} ${t==="Recurring"?"tab-recur":""}`}
            onClick={() => setTab(t)}>
            {t === "Recurring" ? "Recurring" : t}
            <span className="ws-tab-count">{counts[t]}</span>
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="ws-filter">
        <select className="f-sel" value={filter.pic} onChange={e=>setFilter(f=>({...f,pic:e.target.value}))}>
          <option value="">Semua PIC</option>
          {PIC_LIST.map(p=><option key={p}>{p}</option>)}
        </select>
        <select className="f-sel" value={filter.priority} onChange={e=>setFilter(f=>({...f,priority:e.target.value}))}>
          <option value="">Semua Priority</option>
          {PRIORITY_LIST.map(p=><option key={p}>{p}</option>)}
        </select>
        <input className="f-sel" placeholder="Cari kategori..."
          value={filter.category} onChange={e=>setFilter(f=>({...f,category:e.target.value}))} />
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
          <button className="f-clear" onClick={()=>setFilter({pic:"",category:"",priority:"",dari:"",sampai:""})}>
            Reset
          </button>
        )}
      </div>

      {/* Recurring info banner */}
      {tab === "Recurring" && (
        <div className="recur-info">
          Tugas berulang tidak punya deadline — selalu muncul sampai dihapus SPV.
        </div>
      )}

      {/* Task list */}
      <div className="ws-list">
        {filtered.length === 0 && (
          <div className="ws-empty">
            <EmptyIcon />
            <p>{tab === "Recurring" ? "Belum ada tugas berulang." : "Tidak ada tugas di tab ini."}</p>
          </div>
        )}
        {filtered.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            tab={tab}
            user={user}
            isSPV={isSPV}
            onEdit={() => openEdit(task)}
            onDelete={() => setConfirm({
              type: task.isRecurring ? "recurring" : "single",
              id: task.id, label: task.judul,
            })}
            onRecover={() => recover(task.id)}
            onUpdateStatus={updateStatus}
          />
        ))}
      </div>

      {/* Done: hapus semua */}
      {tab === "Done" && counts["Done"] > 0 && isSPV && (
        <div style={{marginTop:8}}>
          <button className="btn-danger-outline"
            onClick={() => setConfirm({ type:"all", label:"semua tugas selesai" })}>
            Hapus Semua (Soft Delete 30 hari)
          </button>
        </div>
      )}

      {/* ── Form Modal: Tugas Biasa ── */}
      {showForm && (
        <Modal onClose={closeForm}>
          <h3 className="modal-title">{editTask ? "Edit Tugas" : "Tambah Tugas Baru"}</h3>
          <div className="form-grid">
            <div className="form-row">
              <FormField label="Tanggal Masuk">
                <input className="form-input readonly" value={fmtDate(form.tanggalMasuk)} readOnly />
              </FormField>
              <FormField label="PIC *">
                <select className="form-input" value={form.pic}
                  onChange={e=>setForm(f=>({...f,pic:e.target.value}))}>
                  <option value="">-- Pilih PIC --</option>
                  {PIC_LIST.map(p=><option key={p}>{p}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Judul Tugas *">
              <input className="form-input" value={form.judul}
                onChange={e=>setForm(f=>({...f,judul:e.target.value}))} placeholder="Nama tugas" />
            </FormField>
            <FormField label="Status">
              <div className="status-options">
                {["Not Started","In Progress","Blocker","Done"].map(s => (
                  <button key={s} type="button"
                    className={`status-chip ${form.status===s?"selected":""}`}
                    style={form.status===s?{background:STATUS_STYLE[s].bg,color:STATUS_STYLE[s].text,borderColor:STATUS_STYLE[s].text}:{}}
                    onClick={()=>setForm(f=>({...f,status:s}))}>
                    {s}
                  </button>
                ))}
              </div>
            </FormField>
            {form.status==="In Progress" && (
              <FormField label={`Progress: ${form.progressPct}%`}>
                <input type="range" min="0" max="100" step="5" className="form-range"
                  value={form.progressPct} onChange={e=>setForm(f=>({...f,progressPct:Number(e.target.value)}))} />
              </FormField>
            )}
            {form.status==="Blocker" && (
              <FormField label="Alasan Blocker *">
                <textarea className="form-input form-textarea" rows={3} value={form.blockerReason}
                  onChange={e=>setForm(f=>({...f,blockerReason:e.target.value}))}
                  placeholder="Jelaskan hambatan..." />
              </FormField>
            )}
            <FormField label="Deskripsi">
              <textarea className="form-input form-textarea" rows={3} value={form.deskripsi}
                onChange={e=>setForm(f=>({...f,deskripsi:e.target.value}))} placeholder="Detail tugas..." />
            </FormField>
            <div className="form-row">
              <FormField label="Priority">
                <select className="form-input" value={form.priority}
                  onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                  {PRIORITY_LIST.map(p=><option key={p}>{p}</option>)}
                </select>
              </FormField>
              <FormField label="Deadline">
                <input type="date" className="form-input" value={form.deadline}
                  onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} min={todayStr()} />
              </FormField>
            </div>
            <div className="form-row">
              <FormField label="Category">
                <input className="form-input" value={form.category}
                  onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="OKR / Project..." />
              </FormField>
              <FormField label="Link Tugas">
                <input className="form-input" value={form.link}
                  onChange={e=>setForm(f=>({...f,link:e.target.value}))} placeholder="https://..." />
              </FormField>
            </div>
            <FormField label="Note">
              <input className="form-input" value={form.note}
                onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Catatan tambahan..." />
            </FormField>
          </div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={closeForm}>Batal</button>
            <button className="btn-primary" onClick={saveTask}>
              {editTask ? "Simpan Perubahan" : "Buat Tugas"}
            </button>
          </div>
          {!editTask && <p className="wa-note">Notifikasi WA otomatis dikirim ke PIC setelah disimpan.</p>}
        </Modal>
      )}

      {/* ── Form Modal: Recurring Task ── */}
      {showRecurForm && (
        <Modal onClose={() => { setShowRecurForm(false); setRecurForm(emptyRecurForm); }}>
          <h3 className="modal-title">Tambah Recurring Task</h3>
          <p className="modal-sub">Tugas ini tidak punya deadline dan akan selalu muncul di tab Recurring.</p>
          <div className="form-grid">
            <div className="form-row">
              <FormField label="PIC *">
                <select className="form-input" value={recurForm.pic}
                  onChange={e=>setRecurForm(f=>({...f,pic:e.target.value}))}>
                  <option value="">-- Pilih PIC --</option>
                  {PIC_LIST.map(p=><option key={p}>{p}</option>)}
                </select>
              </FormField>
              <FormField label="Frekuensi">
                <select className="form-input" value={recurForm.recurFreq}
                  onChange={e=>setRecurForm(f=>({...f,recurFreq:e.target.value}))}>
                  {RECUR_FREQ.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Judul Tugas *">
              <input className="form-input" value={recurForm.judul}
                onChange={e=>setRecurForm(f=>({...f,judul:e.target.value}))} placeholder="Nama tugas berulang" />
            </FormField>
            <FormField label="Deskripsi">
              <textarea className="form-input form-textarea" rows={3} value={recurForm.deskripsi}
                onChange={e=>setRecurForm(f=>({...f,deskripsi:e.target.value}))} placeholder="Detail tugas..." />
            </FormField>
            <div className="form-row">
              <FormField label="Priority">
                <select className="form-input" value={recurForm.priority}
                  onChange={e=>setRecurForm(f=>({...f,priority:e.target.value}))}>
                  {PRIORITY_LIST.map(p=><option key={p}>{p}</option>)}
                </select>
              </FormField>
              <FormField label="Category">
                <input className="form-input" value={recurForm.category}
                  onChange={e=>setRecurForm(f=>({...f,category:e.target.value}))} placeholder="Rutin / OKR..." />
              </FormField>
            </div>
            <FormField label="Link">
              <input className="form-input" value={recurForm.link}
                onChange={e=>setRecurForm(f=>({...f,link:e.target.value}))} placeholder="https://..." />
            </FormField>
            <FormField label="Note">
              <input className="form-input" value={recurForm.note}
                onChange={e=>setRecurForm(f=>({...f,note:e.target.value}))} placeholder="Catatan..." />
            </FormField>
          </div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => { setShowRecurForm(false); setRecurForm(emptyRecurForm); }}>Batal</button>
            <button className="btn-primary" onClick={saveRecurring}>Simpan</button>
          </div>
          <p className="wa-note">Notifikasi WA otomatis dikirim ke PIC setelah disimpan.</p>
        </Modal>
      )}

      {/* ── Confirm Delete ── */}
      {confirm && (
        <Modal onClose={() => setConfirm(null)} small>
          <div className="confirm-wrap">
            <div className="confirm-icon"><TrashIcon /></div>
            <h3 className="confirm-title">Hapus tugas?</h3>
            <p className="confirm-sub">
              {confirm.type === "recurring"
                ? `"${confirm.label}" akan dihapus permanen.`
                : confirm.type === "all"
                ? "Semua tugas selesai akan masuk Recycle Bin (30 hari)."
                : `"${confirm.label}" akan masuk Recycle Bin dan dihapus otomatis setelah 30 hari.`}
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirm(null)}>Batal</button>
              <button className="btn-danger" onClick={() => {
                if (confirm.type === "all")       softDeleteAllDone();
                else if (confirm.type === "recurring") hardDeleteRecurring(confirm.id);
                else softDelete(confirm.id);
              }}>Ya, Hapus</button>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// TASK CARD
// ─────────────────────────────────────────────────────────────
function TaskCard({ task, tab, user, isSPV, onEdit, onDelete, onRecover, onUpdateStatus }) {
  const [showUpdate, setShowUpdate]     = useState(false);
  const [localStatus, setLocalStatus]   = useState(task.status);
  const [localPct, setLocalPct]         = useState(task.progressPct ?? 0);
  const [localBlocker, setLocalBlocker] = useState(task.blockerReason ?? "");

  const pc          = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.Medium;
  const ss          = STATUS_STYLE[task.status]     || STATUS_STYLE["Not Started"];
  const overdue     = isOverdue(task.deadline, task.status);
  const dueTmr      = isDueTomorrow(task.deadline);
  const isMyTask    = user.nama === task.pic;
  // FIX 3: semua role bisa update status (SPV maupun CS)
  const canUpdate   = tab !== "Done";

  const applyUpdate = async () => {
    if (localStatus === "Blocker" && !localBlocker.trim()) {
      alert("Alasan blocker wajib diisi."); return;
    }
    await onUpdateStatus(task.id, localStatus, {
      progressPct:   localStatus === "In Progress" ? localPct : task.progressPct,
      blockerReason: localStatus === "Blocker"     ? localBlocker : task.blockerReason,
    });
    setShowUpdate(false);
  };

  return (
    <div className={`tc-card ${overdue?"overdue":""} ${dueTmr?"due-tomorrow":""} ${isMyTask?"my-task":""}`}>
      {isMyTask && <div className="my-task-ribbon">Tugas Kamu</div>}
      {dueTmr && !overdue && <div className="due-tmr-ribbon">Deadline Besok!</div>}

      <div className="tc-top">
        <div className="tc-badges">
          <span className="tc-priority" style={{ background:pc.bg, color:pc.text }}>
            <span className="tc-dot" style={{ background:pc.dot }} />{task.priority}
          </span>
          <span className="tc-status" style={{ background:ss.bg, color:ss.text }}>
            {task.status}
          </span>
          {task.category && <span className="tc-cat">{task.category}</span>}
          {task.isRecurring && task.recurFreq && (
            <span className="tc-recur-badge">
              {task.recurFreq === "daily" ? "Harian"
               : task.recurFreq === "weekly" ? "Mingguan" : "Bulanan"}
            </span>
          )}
        </div>
        {isSPV && (
          <div className="tc-actions">
            {!task.isRecurring && (
              <button className="icon-btn" onClick={onEdit} title="Edit"><EditIcon /></button>
            )}
            <button className="icon-btn danger" onClick={onDelete} title="Hapus"><TrashIcon /></button>
          </div>
        )}
      </div>

      <h4 className="tc-title">{task.judul}</h4>
      {task.deskripsi && <p className="tc-desc">{task.deskripsi}</p>}
      {task.link && (
        <a href={task.link} target="_blank" rel="noreferrer" className="tc-link">Buka Link →</a>
      )}

      <div className="tc-meta">
        {task.pic && <span className="tc-meta-item"><b>PIC:</b> {task.pic}</span>}
        {task.tanggalMasuk && <span className="tc-meta-item"><b>Masuk:</b> {fmtDate(task.tanggalMasuk)}</span>}
        {task.deadline && (
          <span className={`tc-meta-item ${overdue?"tc-overdue-text":""} ${dueTmr&&!overdue?"tc-due-tmr-text":""}`}>
            <b>Deadline:</b> {fmtDate(task.deadline)}
            {overdue && " ⚠️ Terlambat"}
            {dueTmr && !overdue && " ⏰ Besok!"}
          </span>
        )}
      </div>

      {task.status === "In Progress" && (
        <div className="tc-progress">
          <div className="tc-bar-wrap">
            <div className="tc-bar-fill" style={{ width:`${task.progressPct??0}%` }} />
          </div>
          <span className="tc-bar-label">{task.progressPct??0}%</span>
        </div>
      )}

      {task.status === "Blocker" && task.blockerReason && (
        <div className="tc-blocker"><b>Blocker:</b> {task.blockerReason}</div>
      )}
      {task.note && <p className="tc-note"><b>Note:</b> {task.note}</p>}

      <div className="tc-footer">
        {tab === "Done" && (
          <button className="btn-sm-outline" onClick={onRecover}>↩ Kembalikan ke To Do</button>
        )}
        {/* FIX 3: tombol update muncul untuk SEMUA user, bukan hanya isMyTask */}
        {canUpdate && (
          <button className="btn-sm-sage" onClick={() => setShowUpdate(s => !s)}>
            {showUpdate ? "Tutup" : isMyTask ? "Update Status Saya" : "Update Status"}
          </button>
        )}
      </div>

      {showUpdate && (
        <div className="tc-update-panel">
          <p className="tc-update-label">
            {isMyTask ? "Update status tugas kamu:" : `Update status — PIC: ${task.pic}`}
          </p>
          <div className="status-options">
            {["Not Started","In Progress","Blocker","Done"].map(s => (
              <button key={s} type="button"
                className={`status-chip ${localStatus===s?"selected":""}`}
                style={localStatus===s?{background:STATUS_STYLE[s].bg,color:STATUS_STYLE[s].text,borderColor:STATUS_STYLE[s].text}:{}}
                onClick={()=>setLocalStatus(s)}>
                {s}
              </button>
            ))}
          </div>
          {localStatus==="In Progress" && (
            <div style={{marginTop:10}}>
              <label className="form-label">Progress: {localPct}%</label>
              <input type="range" min="0" max="100" step="5" className="form-range"
                value={localPct} onChange={e=>setLocalPct(Number(e.target.value))} />
              <div className="progress-preview">
                <div className="progress-preview-bar" style={{width:`${localPct}%`}} />
                <span>{localPct}%</span>
              </div>
            </div>
          )}
          {localStatus==="Blocker" && (
            <div style={{marginTop:10}}>
              <label className="form-label">Alasan Blocker:</label>
              <textarea className="form-input form-textarea" rows={2}
                value={localBlocker} onChange={e=>setLocalBlocker(e.target.value)}
                placeholder="Jelaskan hambatan..." />
            </div>
          )}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button className="btn-ghost" onClick={()=>setShowUpdate(false)}>Batal</button>
            <button className="btn-primary" onClick={applyUpdate}>Simpan Status</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────
function Modal({ children, onClose, small }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={`modal-box ${small?"modal-small":""}`}>
        <button className="modal-close" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}
function FormField({ label, children }) {
  return <div className="form-field"><label className="form-label">{label}</label>{children}</div>;
}

function EditIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>; }
function EmptyIcon() { return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h4"/></svg>; }

const css = `
  .ws-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:24px; font-family:'Plus Jakarta Sans',sans-serif; }
  .ws-title  { font-size:22px; font-weight:700; color:#2B3140; }
  .ws-sub    { font-size:13px; color:#86A788; font-weight:500; margin-top:2px; }

  .ws-tabs { display:flex; gap:4px; background:#E8EDE8; border-radius:12px; padding:4px; width:fit-content; margin-bottom:16px; flex-wrap:wrap; }
  .ws-tab {
    display:flex; align-items:center; gap:7px;
    padding:8px 16px; border-radius:9px; border:none;
    background:transparent; color:#6B7280;
    font-size:13px; font-weight:600;
    font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:all 0.15s;
  }
  .ws-tab.active { background:#fff; color:#2B3140; box-shadow:0 1px 4px rgba(0,0,0,0.08); }
  .ws-tab.tab-recur { color:#7C3AED; }
  .ws-tab.tab-recur.active { color:#5B21B6; }
  .ws-tab-count { background:#86A788; color:#fff; font-size:11px; font-weight:700; border-radius:20px; padding:1px 7px; }
  .ws-tab.active .ws-tab-count { background:#3A7040; }
  .ws-tab.tab-recur .ws-tab-count { background:#7C3AED; }
  .ws-tab.tab-recur.active .ws-tab-count { background:#5B21B6; }

  .ws-filter { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; align-items:center; }
  .f-sel { padding:8px 10px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; color:#2B3140; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; min-width:130px; outline:none; }
  .f-sel:focus { border-color:#86A788; }
  .f-date-range { display:flex; align-items:center; gap:6px; }
  .f-sep { color:#9CA3AF; font-size:13px; }
  .f-clear { padding:8px 12px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; color:#EF4444; font-size:13px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }

  .recur-info { background:#F5F3FF; border:1px solid #DDD6FE; border-radius:10px; padding:10px 14px; font-size:13px; color:#5B21B6; margin-bottom:16px; font-family:'Plus Jakarta Sans',sans-serif; }

  .ws-list  { display:flex; flex-direction:column; gap:12px; }
  .ws-empty { display:flex; flex-direction:column; align-items:center; gap:10px; padding:48px 24px; color:#9CA3AF; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; }

  .tc-card {
    background:#fff; border-radius:16px; padding:18px;
    border:1.5px solid #E8EDE8;
    box-shadow:0 1px 4px rgba(43,49,64,0.04);
    transition:box-shadow 0.15s;
    font-family:'Plus Jakarta Sans',sans-serif;
    position:relative; overflow:hidden;
  }
  .tc-card:hover { box-shadow:0 4px 16px rgba(43,49,64,0.09); }
  .tc-card.overdue     { border-color:#FECACA; background:#FFFAFA; }
  .tc-card.due-tomorrow { border-color:#FDE68A; background:#FFFBEB; }
  .tc-card.my-task     { border-color:#86A788; border-width:2px; }

  .my-task-ribbon  { position:absolute; top:0; right:0; background:#86A788; color:#fff; font-size:10px; font-weight:700; padding:3px 10px; border-radius:0 14px 0 8px; }
  .due-tmr-ribbon  { position:absolute; top:0; right:0; background:#F59E0B; color:#fff; font-size:10px; font-weight:700; padding:3px 10px; border-radius:0 14px 0 8px; }

  .tc-top    { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:8px; }
  .tc-badges { display:flex; flex-wrap:wrap; gap:6px; }
  .tc-priority { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700; border-radius:20px; padding:3px 9px; }
  .tc-dot    { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .tc-status { font-size:11px; font-weight:700; border-radius:20px; padding:3px 9px; }
  .tc-cat    { font-size:11px; font-weight:600; color:#4B5563; background:#F3F4F6; border-radius:20px; padding:3px 9px; }
  .tc-recur-badge { font-size:11px; font-weight:700; color:#5B21B6; background:#EDE9FE; border-radius:20px; padding:3px 9px; }
  .tc-actions { display:flex; gap:6px; flex-shrink:0; }

  .tc-title { font-size:15px; font-weight:700; color:#2B3140; margin-bottom:5px; }
  .tc-desc  { font-size:13px; color:#6B7280; line-height:1.55; margin-bottom:8px; }
  .tc-link  { font-size:12px; color:#86A788; font-weight:600; text-decoration:none; display:inline-block; margin-bottom:8px; }
  .tc-link:hover { text-decoration:underline; }

  .tc-meta { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:10px; }
  .tc-meta-item { font-size:12px; color:#6B7280; }
  .tc-meta-item b { color:#4B5563; }
  .tc-overdue-text  { color:#EF4444 !important; }
  .tc-due-tmr-text  { color:#D97706 !important; }

  .tc-progress  { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .tc-bar-wrap  { flex:1; height:7px; background:#E5E7EB; border-radius:10px; overflow:hidden; }
  .tc-bar-fill  { height:100%; background:linear-gradient(90deg,#86A788,#5a8c5c); border-radius:10px; transition:width 0.4s; }
  .tc-bar-label { font-size:12px; font-weight:700; color:#3A7040; min-width:36px; text-align:right; }

  .tc-blocker { font-size:12px; color:#B91C1C; background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:8px 12px; margin-bottom:8px; }
  .tc-note    { font-size:12px; color:#6B7280; margin-bottom:8px; }
  .tc-footer  { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }

  .tc-update-panel { margin-top:14px; padding:14px; border-radius:12px; background:#F5F7F5; border:1.5px solid #E8EDE8; }
  .tc-update-label { font-size:12px; font-weight:600; color:#4B5563; margin-bottom:8px; }

  .progress-preview { display:flex; align-items:center; gap:10px; margin-top:8px; }
  .progress-preview-bar { flex:1; height:5px; background:#86A788; border-radius:10px; transition:width 0.3s; max-width:calc(100% - 40px); }
  .progress-preview span { font-size:12px; font-weight:700; color:#3A7040; min-width:32px; }

  .status-options { display:flex; flex-wrap:wrap; gap:6px; }
  .status-chip { padding:5px 12px; border-radius:20px; border:1.5px solid #E8EDE8; background:#F9FAFB; color:#6B7280; font-size:12px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:all 0.15s; }
  .status-chip:hover { border-color:#86A788; color:#3A7040; }
  .status-chip.selected { font-weight:700; }

  .btn-primary { padding:9px 18px; border-radius:10px; border:none; background:#86A788; color:#fff; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:background 0.15s; box-shadow:0 2px 8px rgba(134,167,136,0.3); }
  .btn-primary:hover { background:#6d9070; }
  .btn-recurring { padding:9px 18px; border-radius:10px; border:1.5px solid #DDD6FE; background:#F5F3FF; color:#5B21B6; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:background 0.15s; }
  .btn-recurring:hover { background:#EDE9FE; }
  .btn-ghost  { padding:9px 18px; border-radius:10px; border:1.5px solid #E8EDE8; background:transparent; color:#4B5563; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-danger { padding:9px 18px; border-radius:10px; border:none; background:#EF4444; color:#fff; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-danger:hover { background:#DC2626; }
  .btn-danger-outline { padding:8px 16px; border-radius:9px; border:1.5px solid #FECACA; background:#FEF2F2; color:#B91C1C; font-size:13px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-sm-outline { padding:6px 13px; border-radius:8px; border:1.5px solid #D1D5DB; background:transparent; color:#4B5563; font-size:12px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-sm-sage { padding:6px 13px; border-radius:8px; border:none; background:#E8F0E8; color:#3A7040; font-size:12px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-sm-sage:hover { background:#d4e8d4; }

  .icon-btn { width:28px; height:28px; border-radius:7px; border:none; background:#F3F4F6; color:#6B7280; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.15s; }
  .icon-btn:hover { background:#E5E7EB; }
  .icon-btn.danger { background:#FEE2E2; color:#B91C1C; }
  .icon-btn.danger:hover { background:#FECACA; }

  .modal-overlay { position:fixed; inset:0; z-index:200; background:rgba(43,49,64,0.45); display:flex; align-items:center; justify-content:center; padding:16px; animation:fadeIn 0.15s ease; font-family:'Plus Jakarta Sans',sans-serif; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .modal-box { background:#fff; border-radius:20px; padding:28px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; position:relative; animation:slideUp 0.2s cubic-bezier(0.22,1,0.36,1); }
  .modal-small { max-width:380px; }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .modal-close { position:absolute; top:16px; right:16px; width:28px; height:28px; border-radius:7px; border:none; background:#F3F4F6; color:#6B7280; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; }
  .modal-title { font-size:17px; font-weight:700; color:#2B3140; margin-bottom:6px; }
  .modal-sub   { font-size:13px; color:#8E97A3; margin-bottom:20px; }
  .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:20px; }
  .wa-note { font-size:11.5px; color:#86A788; margin-top:10px; text-align:right; }

  .form-grid { display:flex; flex-direction:column; gap:14px; }
  .form-row  { display:flex; gap:12px; flex-wrap:wrap; }
  .form-row > * { flex:1; min-width:140px; }
  .form-field { display:flex; flex-direction:column; gap:5px; }
  .form-label { font-size:12px; font-weight:600; color:#4B5563; }
  .form-input { padding:9px 12px; border-radius:9px; border:1.5px solid #E8EDE8; background:#FAFBFA; color:#2B3140; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; transition:border-color 0.15s; width:100%; }
  .form-input:focus { border-color:#86A788; background:#fff; }
  .form-input.readonly { background:#F3F4F6; color:#6B7280; cursor:default; }
  .form-textarea { resize:vertical; min-height:80px; }
  .form-range { width:100%; accent-color:#86A788; margin-top:6px; }

  .confirm-wrap  { display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding-top:8px; }
  .confirm-icon  { width:52px; height:52px; border-radius:50%; background:#FEE2E2; color:#EF4444; display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
  .confirm-title { font-size:16px; font-weight:700; color:#2B3140; }
  .confirm-sub   { font-size:13px; color:#6B7280; max-width:280px; line-height:1.5; }

  @media (max-width:640px) {
    .ws-tabs { width:100%; }
    .ws-tab  { flex:1; justify-content:center; padding:8px 6px; font-size:11px; }
    .ws-filter { flex-direction:column; }
    .f-sel { width:100%; }
    .f-date-range { width:100%; }
    .f-date-range .f-sel { flex:1; }
  }
`;
