// src/pages/spv/SPVResponPage.jsx
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore";
import PageLayout from "../../components/PageLayout";
import Navbar from "../../components/Navbar";
import { PIC_LIST } from "../../constants";
import {
  calcActualRT, calcSLART, getSLAStatus, getSLAStart,
  SLA_BADGE, SLA_MINUTES, fmtMinutes, getShift
} from "../../utils/slaUtils";

const todayStr = () => new Date().toISOString().split("T")[0];

export default function SPVResponPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [rows, setRows]         = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [confirm, setConfirm]   = useState(null);
  const [filter, setFilter]     = useState({ pic:"", dari:"", sampai:"", status:"" });

  const emptyForm = {
    customer:"", date: todayStr(),
    inquiryDate: todayStr(),   // tanggal inquiry
    inquiryTime:"",
    resp1Date: todayStr(),     // tanggal respon 1 (bisa beda hari)
    resp1Time:"",
    resp2Time:"",
    pic:"", note:""
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const q = query(collection(db, "responTime"), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap =>
      setRows(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    return unsub;
  }, []);

  const save = async () => {
    if (!form.customer.trim()) { alert("Nama customer wajib."); return; }
    if (!form.inquiryTime)     { alert("Waktu inquiry wajib.");  return; }
    if (!form.resp1Time)       { alert("Respon 1 wajib.");       return; }

    const resp1NextDay = form.resp1Date > form.inquiryDate;

    await addDoc(collection(db, "responTime"), {
      ...form, resp1NextDay,
      createdAt: serverTimestamp(),
      createdBy: user.nama,
    });
    setShowForm(false);
    setForm(emptyForm);
  };

  // Stats
  const pics = [...new Set(rows.map(r => r.pic).filter(Boolean))];

  const filtered = rows.filter(r => {
    if (filter.pic && r.pic !== filter.pic) return false;
    if (filter.dari && r.inquiryDate < filter.dari) return false;
    if (filter.sampai && r.inquiryDate > filter.sampai) return false;
    if (filter.status) {
      const s = getSLAStatus(r.inquiryTime, r.resp1Time);
      if (filter.status === "PASS"    && !["PASS","PASS_OH"].includes(s)) return false;
      if (filter.status === "FAIL"    && !["FAIL","FAIL_OH"].includes(s)) return false;
      if (filter.status === "OFF_HOURS" && !["PASS_OH","FAIL_OH"].includes(s)) return false;
    }
    return true;
  });

  const totalPass = filtered.filter(r => ["PASS","PASS_OH"].includes(getSLAStatus(r.inquiryTime, r.resp1Time))).length;
  const totalFail = filtered.filter(r => ["FAIL","FAIL_OH"].includes(getSLAStatus(r.inquiryTime, r.resp1Time))).length;
  const pct = filtered.length > 0 ? Math.round(totalPass / filtered.length * 100) : 0;

  return (
    <PageLayout navbar={<Navbar />}>
      <style>{css}</style>

      <div className="rt-header">
        <div>
          <h1 className="rt-title">Respon Time</h1>
          <p className="rt-sub">
            SLA target: <b>{SLA_MINUTES} menit</b> &bull;
            Shift 1: 09.00–16.00 &bull; Shift 2: 16.00–23.00
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Tambah Data</button>
      </div>

      {/* Summary */}
      <div className="rt-summary">
        <div className="rt-stat">
          <span className="rt-stat-num">{filtered.length}</span>
          <span className="rt-stat-label">Total</span>
        </div>
        <div className="rt-stat-div" />
        <div className="rt-stat">
          <span className="rt-stat-num" style={{color:"#16A34A"}}>{totalPass}</span>
          <span className="rt-stat-label">PASS</span>
        </div>
        <div className="rt-stat-div" />
        <div className="rt-stat">
          <span className="rt-stat-num" style={{color:"#DC2626"}}>{totalFail}</span>
          <span className="rt-stat-label">FAIL</span>
        </div>
        <div className="rt-stat-div" />
        <div className="rt-stat">
          <span className="rt-stat-num" style={{color: pct>=80?"#16A34A":pct>=60?"#D97706":"#DC2626"}}>
            {pct}%
          </span>
          <span className="rt-stat-label">SLA Rate</span>
        </div>
      </div>

      {/* SLA rule info */}
      <div className="sla-info-box">
        <span className="sla-info-icon">ℹ️</span>
        <span>
          Pesan masuk <b>di luar jam shift</b> (23:00–08:59): SLA dihitung mulai <b>09:00 hari berikutnya</b>.
          Kolom <b>Actual RT</b> = waktu nyata sejak pesan masuk.
          Kolom <b>SLA RT</b> = waktu sejak shift berikutnya mulai.
        </span>
      </div>

      {/* Filter */}
      <div className="rt-filter">
        <select className="f-sel" value={filter.pic} onChange={e=>setFilter(f=>({...f,pic:e.target.value}))}>
          <option value="">Semua PIC</option>
          {pics.map(p=><option key={p}>{p}</option>)}
        </select>
        <select className="f-sel" value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
          <option value="">Semua Status</option>
          <option value="PASS">PASS</option>
          <option value="FAIL">FAIL</option>
          <option value="OFF_HOURS">Out of Hours</option>
        </select>
        <div className="f-date-range">
          <input type="date" className="f-sel" value={filter.dari}
            onChange={e=>setFilter(f=>({...f,dari:e.target.value}))} />
          <span className="f-sep">–</span>
          <input type="date" className="f-sel" value={filter.sampai}
            onChange={e=>setFilter(f=>({...f,sampai:e.target.value}))} />
        </div>
        {(filter.pic||filter.dari||filter.sampai||filter.status) && (
          <button className="f-clear" onClick={()=>setFilter({pic:"",dari:"",sampai:"",status:""})}>Reset</button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="rt-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Tgl Inquiry</th>
              <th>Jam Inquiry</th>
              <th>Shift</th>
              <th>SLA Mulai</th>
              <th>Respon 1</th>
              <th>Respon 2</th>
              <th>PIC</th>
              <th>Actual RT</th>
              <th>SLA RT</th>
              <th>Status SLA</th>
              <th>Note</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={13} className="table-empty">Belum ada data</td></tr>
            )}
            {filtered.map(r => {
              const shift      = getShift(r.inquiryTime);
              const slaStart   = getSLAStart(r.inquiryTime);
              const actualRT   = calcActualRT(r.inquiryTime, r.resp1Time, r.resp1NextDay);
              const slaRT      = calcSLART(r.inquiryTime, r.resp1Time);
              const slaStatus  = getSLAStatus(r.inquiryTime, r.resp1Time);
              const badge      = slaStatus ? SLA_BADGE[slaStatus] : null;
              const isOOH      = shift === "off";
              const isFail     = ["FAIL","FAIL_OH"].includes(slaStatus);

              return (
                <tr key={r.id} className={isFail?"row-fail":isOOH?"row-ooh":""}>
                  <td className="td-bold">{r.customer}</td>
                  <td>{r.inquiryDate || r.date}</td>
                  <td>{r.inquiryTime}</td>
                  <td>
                    {isOOH
                      ? <span className="shift-pill ooh">Di luar shift</span>
                      : shift === "shift1"
                      ? <span className="shift-pill s1">Shift 1</span>
                      : <span className="shift-pill s2">Shift 2</span>
                    }
                  </td>
                  <td className="td-sla-start">
                    {slaStart.isNextDay
                      ? <span className="next-day-badge">Esok 09:00</span>
                      : <span className="same-day">{slaStart.slaStartTime}</span>
                    }
                  </td>
                  <td>
                    {r.resp1Time}
                    {r.resp1NextDay && <span className="next-day-tag">+1</span>}
                  </td>
                  <td>{r.resp2Time || "-"}</td>
                  <td>{r.pic}</td>
                  <td className="td-rt">
                    {actualRT !== null ? fmtMinutes(actualRT) : "-"}
                  </td>
                  <td className={`td-rt ${isFail?"td-rt-fail":""}`}>
                    {slaRT !== null
                      ? <span>{fmtMinutes(slaRT)} {isFail && "⚠️"}</span>
                      : "-"}
                  </td>
                  <td>
                    {badge
                      ? <span className="sla-badge" style={{background:badge.bg,color:badge.text}}>
                          {badge.label}
                        </span>
                      : "-"}
                  </td>
                  <td className="note-cell">{r.note||"-"}</td>
                  <td>
                    <button className="icon-btn danger"
                      onClick={()=>setConfirm({id:r.id,label:r.customer})}>
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <Modal onClose={()=>{setShowForm(false);setForm(emptyForm);}}>
          <h3 className="modal-title">Tambah Data Respon Time</h3>
          <div className="form-grid">

            <div className="form-row">
              <Field label="Nama Customer *">
                <input className="form-input" value={form.customer}
                  onChange={e=>setForm(f=>({...f,customer:e.target.value}))} placeholder="Nama customer" />
              </Field>
              <Field label="PIC">
                <select className="form-input" value={form.pic}
                  onChange={e=>setForm(f=>({...f,pic:e.target.value}))}>
                  <option value="">-- Pilih --</option>
                  {PIC_LIST.map(p=><option key={p}>{p}</option>)}
                </select>
              </Field>
            </div>

            {/* Inquiry */}
            <div className="form-section-label">Waktu Inquiry (Customer Kirim Pesan)</div>
            <div className="form-row">
              <Field label="Tanggal Inquiry *">
                <input type="date" className="form-input" value={form.inquiryDate}
                  onChange={e=>setForm(f=>({...f,inquiryDate:e.target.value}))} />
              </Field>
              <Field label="Jam Inquiry *">
                <input type="time" className="form-input" value={form.inquiryTime}
                  onChange={e=>setForm(f=>({...f,inquiryTime:e.target.value}))} />
              </Field>
            </div>

            {/* SLA preview */}
            {form.inquiryTime && (
              <SLAPreview inquiryTime={form.inquiryTime} />
            )}

            {/* Respon 1 */}
            <div className="form-section-label">Respon 1 (CS Pertama Balas)</div>
            <div className="form-row">
              <Field label="Tanggal Respon 1 *">
                <input type="date" className="form-input" value={form.resp1Date}
                  onChange={e=>setForm(f=>({...f,resp1Date:e.target.value}))} />
              </Field>
              <Field label="Jam Respon 1 *">
                <input type="time" className="form-input" value={form.resp1Time}
                  onChange={e=>setForm(f=>({...f,resp1Time:e.target.value}))} />
              </Field>
            </div>

            {/* RT preview */}
            {form.inquiryTime && form.resp1Time && (
              <RTPreview
                inquiryTime={form.inquiryTime}
                inquiryDate={form.inquiryDate}
                resp1Time={form.resp1Time}
                resp1Date={form.resp1Date}
              />
            )}

            {/* Respon 2 */}
            <div className="form-row">
              <Field label="Jam Respon 2 (opsional)">
                <input type="time" className="form-input" value={form.resp2Time}
                  onChange={e=>setForm(f=>({...f,resp2Time:e.target.value}))} />
              </Field>
              <Field label="Note">
                <input className="form-input" value={form.note}
                  onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Opsional..." />
              </Field>
            </div>

          </div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={()=>{setShowForm(false);setForm(emptyForm);}}>Batal</button>
            <button className="btn-primary" onClick={save}>Simpan</button>
          </div>
        </Modal>
      )}

      {/* Confirm delete */}
      {confirm && (
        <Modal onClose={()=>setConfirm(null)} small>
          <div className="confirm-wrap">
            <div className="confirm-icon"><TrashIcon /></div>
            <h3 className="confirm-title">Hapus data?</h3>
            <p className="confirm-sub">"{confirm.label}" akan dihapus permanen.</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={()=>setConfirm(null)}>Batal</button>
              <button className="btn-danger" onClick={async()=>{
                await deleteDoc(doc(db,"responTime",confirm.id));
                setConfirm(null);
              }}>Ya, Hapus</button>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

// ── SLA Preview (dalam form) ──────────────────────────────────
function SLAPreview({ inquiryTime }) {
  const shift    = getShift(inquiryTime);
  const slaStart = getSLAStart(inquiryTime);
  const isOOH    = shift === "off";

  return (
    <div className={`sla-preview ${isOOH?"ooh":""}`}>
      {isOOH ? (
        <>
          <span className="sla-prev-icon">🌙</span>
          <span>
            Inquiry masuk <b>di luar jam shift</b> ({inquiryTime}).
            SLA mulai dihitung dari <b>09:00 hari berikutnya</b>.
          </span>
        </>
      ) : (
        <>
          <span className="sla-prev-icon">✅</span>
          <span>
            Inquiry masuk di <b>{slaStart.shiftLabel}</b>.
            SLA mulai dari jam inquiry ({inquiryTime}).
          </span>
        </>
      )}
    </div>
  );
}

// ── RT Preview (dalam form) ───────────────────────────────────
function RTPreview({ inquiryTime, inquiryDate, resp1Time, resp1Date }) {
  const resp1NextDay = resp1Date > inquiryDate;
  const actualRT     = calcActualRT(inquiryTime, resp1Time, resp1NextDay);
  const slaRT        = calcSLART(inquiryTime, resp1Time);
  const slaStatus    = getSLAStatus(inquiryTime, resp1Time);
  const badge        = slaStatus ? SLA_BADGE[slaStatus] : null;
  const isFail       = ["FAIL","FAIL_OH"].includes(slaStatus);

  return (
    <div className={`rt-preview ${isFail?"fail":""}`}>
      <div className="rt-prev-row">
        <span className="rt-prev-label">Actual RT:</span>
        <span className="rt-prev-val">{fmtMinutes(actualRT)}</span>
      </div>
      <div className="rt-prev-row">
        <span className="rt-prev-label">SLA RT:</span>
        <span className="rt-prev-val">{fmtMinutes(slaRT)}</span>
      </div>
      {badge && (
        <span className="sla-badge" style={{background:badge.bg,color:badge.text}}>
          {badge.label}
        </span>
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
function Field({ label, children }) {
  return <div className="form-field"><label className="form-label">{label}</label>{children}</div>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
}

const css = `
  .rt-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:16px; font-family:'Plus Jakarta Sans',sans-serif; }
  .rt-title  { font-size:22px; font-weight:700; color:#2B3140; }
  .rt-sub    { font-size:13px; color:#8E97A3; margin-top:2px; }

  .rt-summary { display:flex; align-items:center; background:#fff; border-radius:14px; padding:16px 24px; border:1.5px solid #E8EDE8; margin-bottom:14px; box-shadow:0 1px 4px rgba(43,49,64,0.04); flex-wrap:wrap; gap:8px; }
  .rt-stat { display:flex; flex-direction:column; align-items:center; gap:2px; flex:1; min-width:60px; }
  .rt-stat-num   { font-size:24px; font-weight:700; color:#2B3140; font-family:'Plus Jakarta Sans',sans-serif; }
  .rt-stat-label { font-size:12px; color:#8E97A3; font-weight:500; font-family:'Plus Jakarta Sans',sans-serif; }
  .rt-stat-div   { width:1px; height:40px; background:#E8EDE8; margin:0 8px; flex-shrink:0; }

  .sla-info-box {
    display:flex; align-items:flex-start; gap:8px;
    background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px;
    padding:10px 14px; font-size:12.5px; color:#1D4ED8;
    margin-bottom:14px; font-family:'Plus Jakarta Sans',sans-serif; line-height:1.6;
  }
  .sla-info-icon { font-size:14px; flex-shrink:0; margin-top:1px; }

  .rt-filter { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
  .f-sel { padding:8px 10px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; color:#2B3140; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; min-width:130px; outline:none; }
  .f-sel:focus { border-color:#86A788; }
  .f-date-range { display:flex; align-items:center; gap:6px; }
  .f-sep  { color:#9CA3AF; font-size:13px; }
  .f-clear { padding:8px 12px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; color:#EF4444; font-size:13px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }

  .table-wrap { overflow-x:auto; border-radius:12px; border:1.5px solid #E8EDE8; }
  .rt-table   { width:100%; border-collapse:collapse; font-size:12.5px; font-family:'Plus Jakarta Sans',sans-serif; }
  .rt-table th { background:#F5F7F5; padding:9px 12px; text-align:left; font-weight:600; color:#4B5563; border-bottom:1.5px solid #E8EDE8; white-space:nowrap; }
  .rt-table td { padding:9px 12px; border-bottom:1px solid #F3F4F6; color:#374151; vertical-align:middle; }
  .rt-table tr:last-child td { border-bottom:none; }
  .rt-table tr:hover td { background:#FAFBFA; }
  .row-fail td { background:#FEF2F2 !important; }
  .row-ooh  td { background:#FFFBEB !important; }

  .td-bold { font-weight:600; color:#2B3140; }
  .td-sla-start { white-space:nowrap; }
  .td-rt { font-weight:600; white-space:nowrap; }
  .td-rt-fail { color:#B91C1C; }
  .note-cell { max-width:120px; color:#6B7280; font-size:12px; }
  .table-empty { text-align:center; color:#9CA3AF; padding:32px !important; }

  .shift-pill { font-size:11px; font-weight:700; border-radius:20px; padding:3px 8px; }
  .shift-pill.s1  { background:#FEF3C7; color:#92400E; }
  .shift-pill.s2  { background:#EDE9FE; color:#5B21B6; }
  .shift-pill.ooh { background:#FEF3C7; color:#92400E; border:1px dashed #F59E0B; }

  .next-day-badge { font-size:11px; font-weight:700; background:#FEF3C7; color:#92400E; border-radius:6px; padding:2px 7px; }
  .same-day { font-size:12px; color:#4B5563; }
  .next-day-tag { font-size:10px; font-weight:700; background:#EDE9FE; color:#5B21B6; border-radius:4px; padding:1px 5px; margin-left:4px; }

  .sla-badge { font-size:11px; font-weight:700; border-radius:20px; padding:3px 9px; display:inline-block; }

  /* Form */
  .form-section-label { font-size:11px; font-weight:700; color:#86A788; text-transform:uppercase; letter-spacing:0.5px; padding:4px 0 2px; border-top:1px solid #F3F4F6; margin-top:4px; font-family:'Plus Jakarta Sans',sans-serif; }

  .sla-preview {
    display:flex; align-items:flex-start; gap:8px;
    border-radius:10px; padding:10px 12px; font-size:12.5px; line-height:1.6;
    background:#DCFCE7; color:#166534; border:1px solid #BBF7D0;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .sla-preview.ooh { background:#FEF3C7; color:#92400E; border-color:#FDE68A; }
  .sla-prev-icon { font-size:14px; flex-shrink:0; }

  .rt-preview {
    display:flex; align-items:center; gap:12px; flex-wrap:wrap;
    background:#F0FFF4; border:1.5px solid #BBF7D0; border-radius:10px;
    padding:10px 14px; font-family:'Plus Jakarta Sans',sans-serif;
  }
  .rt-preview.fail { background:#FEF2F2; border-color:#FECACA; }
  .rt-prev-row  { display:flex; align-items:center; gap:6px; }
  .rt-prev-label { font-size:12px; font-weight:600; color:#4B5563; }
  .rt-prev-val   { font-size:14px; font-weight:700; color:#2B3140; }

  .btn-primary { padding:9px 18px; border-radius:10px; border:none; background:#86A788; color:#fff; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; box-shadow:0 2px 8px rgba(134,167,136,0.3); }
  .btn-primary:hover { background:#6d9070; }
  .btn-ghost   { padding:9px 18px; border-radius:10px; border:1.5px solid #E8EDE8; background:transparent; color:#4B5563; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-danger  { padding:9px 18px; border-radius:10px; border:none; background:#EF4444; color:#fff; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-danger:hover { background:#DC2626; }

  .icon-btn { width:28px; height:28px; border-radius:7px; border:none; background:#F3F4F6; color:#6B7280; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .icon-btn.danger { background:#FEE2E2; color:#B91C1C; }
  .icon-btn.danger:hover { background:#FECACA; }

  .modal-overlay { position:fixed; inset:0; z-index:200; background:rgba(43,49,64,0.45); display:flex; align-items:center; justify-content:center; padding:16px; font-family:'Plus Jakarta Sans',sans-serif; animation:fadeIn 0.15s ease; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .modal-box   { background:#fff; border-radius:20px; padding:28px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; position:relative; animation:slideUp 0.2s cubic-bezier(0.22,1,0.36,1); }
  .modal-small { max-width:380px; }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .modal-close { position:absolute; top:16px; right:16px; width:28px; height:28px; border-radius:7px; border:none; background:#F3F4F6; color:#6B7280; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; }
  .modal-title   { font-size:17px; font-weight:700; color:#2B3140; margin-bottom:20px; }
  .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:20px; }

  .form-grid { display:flex; flex-direction:column; gap:12px; }
  .form-row  { display:flex; gap:12px; flex-wrap:wrap; }
  .form-row > * { flex:1; min-width:140px; }
  .form-field { display:flex; flex-direction:column; gap:5px; }
  .form-label { font-size:12px; font-weight:600; color:#4B5563; }
  .form-input { padding:9px 12px; border-radius:9px; border:1.5px solid #E8EDE8; background:#FAFBFA; color:#2B3140; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; width:100%; transition:border-color 0.15s; }
  .form-input:focus { border-color:#86A788; background:#fff; }

  .confirm-wrap  { display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding-top:8px; }
  .confirm-icon  { width:52px; height:52px; border-radius:50%; background:#FEE2E2; color:#EF4444; display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
  .confirm-title { font-size:16px; font-weight:700; color:#2B3140; }
  .confirm-sub   { font-size:13px; color:#6B7280; max-width:280px; }

  @media (max-width:640px) {
    .rt-summary { padding:12px 16px; }
    .rt-stat-num { font-size:20px; }
    .rt-filter { flex-direction:column; }
    .f-sel { width:100%; }
  }
`;
