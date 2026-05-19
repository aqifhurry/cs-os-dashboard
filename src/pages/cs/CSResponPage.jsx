import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp
} from "firebase/firestore";
import NavbarCS from "../../components/Navbar";
import PageLayout from "../../components/PageLayout";
import { PIC_LIST } from "../../constants";
import {
  calcActualRT, calcSLART, getSLAStatus, getSLAStart,
  SLA_BADGE, SLA_MINUTES, fmtMinutes, getShift
} from "../../utils/slaUtils";

const todayStr = () => new Date().toISOString().split("T")[0];

export default function CSResponPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [rows, setRows]         = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter]     = useState({ pic:"", dari:"", sampai:"" });

  const emptyForm = {
    customer:"", inquiryDate: todayStr(), inquiryTime:"",
    resp1Date: todayStr(), resp1Time:"", resp2Time:"",
    pic: user.nama ?? "", note:""
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
      ...form, resp1NextDay, createdAt: serverTimestamp(), createdBy: user.nama,
    });
    setShowForm(false);
    setForm(emptyForm);
  };

  const pics = [...new Set(rows.map(r => r.pic).filter(Boolean))];
  const filtered = rows.filter(r => {
    if (filter.pic && r.pic !== filter.pic) return false;
    if (filter.dari && (r.inquiryDate||r.date) < filter.dari) return false;
    if (filter.sampai && (r.inquiryDate||r.date) > filter.sampai) return false;
    return true;
  });

  return (
    <PageLayout navbar={<NavbarCS />}>
      <style>{css}</style>

      <div className="rt-header">
        <div>
          <h1 className="rt-title">Respon Time</h1>
          <p className="rt-sub">
            SLA: <b>{SLA_MINUTES} mnt</b> &bull; Shift 1: 09.00–16.00 &bull; Shift 2: 16.00–23.00
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Tambah Data</button>
      </div>

      <div className="rt-info-bar">
        Kamu bisa <b>tambah data</b> — untuk hapus data, hubungi Supervisor.
      </div>

      <div className="sla-info-box">
        <span>ℹ️</span>
        <span>
          Pesan masuk <b>di luar jam shift</b> (23:00–08:59):
          SLA dihitung mulai <b>09:00 hari berikutnya</b>.
        </span>
      </div>

      <div className="rt-filter">
        <select className="f-sel" value={filter.pic} onChange={e=>setFilter(f=>({...f,pic:e.target.value}))}>
          <option value="">Semua PIC</option>
          {pics.map(p=><option key={p}>{p}</option>)}
        </select>
        <div className="f-date-range">
          <input type="date" className="f-sel" value={filter.dari}
            onChange={e=>setFilter(f=>({...f,dari:e.target.value}))} />
          <span className="f-sep">–</span>
          <input type="date" className="f-sel" value={filter.sampai}
            onChange={e=>setFilter(f=>({...f,sampai:e.target.value}))} />
        </div>
        {(filter.pic||filter.dari||filter.sampai) && (
          <button className="f-clear" onClick={()=>setFilter({pic:"",dari:"",sampai:""})}>Reset</button>
        )}
      </div>

      <div className="table-wrap">
        <table className="rt-table">
          <thead>
            <tr>
              <th>Customer</th><th>Tgl</th><th>Inquiry</th><th>Shift</th>
              <th>SLA Mulai</th><th>Resp 1</th><th>Resp 2</th><th>PIC</th>
              <th>Actual RT</th><th>SLA RT</th><th>Status</th><th>Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={12} className="table-empty">Belum ada data</td></tr>
            )}
            {filtered.map(r => {
              const shift     = getShift(r.inquiryTime);
              const slaStart  = getSLAStart(r.inquiryTime);
              const actualRT  = calcActualRT(r.inquiryTime, r.resp1Time, r.resp1NextDay);
              const slaRT     = calcSLART(r.inquiryTime, r.resp1Time);
              const slaStatus = getSLAStatus(r.inquiryTime, r.resp1Time);
              const badge     = slaStatus ? SLA_BADGE[slaStatus] : null;
              const isOOH     = shift === "off";
              const isFail    = ["FAIL","FAIL_OH"].includes(slaStatus);
              return (
                <tr key={r.id} className={isFail?"row-fail":isOOH?"row-ooh":""}>
                  <td className="td-bold">{r.customer}</td>
                  <td>{r.inquiryDate||r.date}</td>
                  <td>{r.inquiryTime}</td>
                  <td>
                    {isOOH
                      ? <span className="shift-pill ooh">Di luar shift</span>
                      : shift==="shift1"
                      ? <span className="shift-pill s1">Shift 1</span>
                      : <span className="shift-pill s2">Shift 2</span>}
                  </td>
                  <td>{slaStart.isNextDay
                    ? <span className="next-day-badge">Esok 09:00</span>
                    : <span>{slaStart.slaStartTime}</span>}
                  </td>
                  <td>{r.resp1Time}{r.resp1NextDay && <span className="next-day-tag">+1</span>}</td>
                  <td>{r.resp2Time||"-"}</td>
                  <td>{r.pic}</td>
                  <td className="td-rt">{actualRT!==null?fmtMinutes(actualRT):"-"}</td>
                  <td className={`td-rt ${isFail?"td-rt-fail":""}`}>
                    {slaRT!==null?fmtMinutes(slaRT):"-"}
                  </td>
                  <td>{badge
                    ? <span className="sla-badge" style={{background:badge.bg,color:badge.text}}>{badge.label}</span>
                    : "-"}
                  </td>
                  <td className="note-cell">{r.note||"-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal onClose={()=>{setShowForm(false);setForm(emptyForm);}}>
          <h3 className="modal-title">Tambah Data Respon Time</h3>
          <div className="form-grid">
            <div className="form-row">
              <Field label="Nama Customer *">
                <input className="form-input" value={form.customer}
                  onChange={e=>setForm(f=>({...f,customer:e.target.value}))} />
              </Field>
              <Field label="PIC">
                <select className="form-input" value={form.pic}
                  onChange={e=>setForm(f=>({...f,pic:e.target.value}))}>
                  {PIC_LIST.map(p=><option key={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <div className="form-section-label">Waktu Inquiry</div>
            <div className="form-row">
              <Field label="Tanggal *">
                <input type="date" className="form-input" value={form.inquiryDate}
                  onChange={e=>setForm(f=>({...f,inquiryDate:e.target.value}))} />
              </Field>
              <Field label="Jam *">
                <input type="time" className="form-input" value={form.inquiryTime}
                  onChange={e=>setForm(f=>({...f,inquiryTime:e.target.value}))} />
              </Field>
            </div>
            {form.inquiryTime && (
              <SLAPreview inquiryTime={form.inquiryTime} />
            )}
            <div className="form-section-label">Respon 1</div>
            <div className="form-row">
              <Field label="Tanggal *">
                <input type="date" className="form-input" value={form.resp1Date}
                  onChange={e=>setForm(f=>({...f,resp1Date:e.target.value}))} />
              </Field>
              <Field label="Jam *">
                <input type="time" className="form-input" value={form.resp1Time}
                  onChange={e=>setForm(f=>({...f,resp1Time:e.target.value}))} />
              </Field>
            </div>
            {form.inquiryTime && form.resp1Time && (
              <RTPreview
                inquiryTime={form.inquiryTime} inquiryDate={form.inquiryDate}
                resp1Time={form.resp1Time}      resp1Date={form.resp1Date}
              />
            )}
            <div className="form-row">
              <Field label="Respon 2 (opsional)">
                <input type="time" className="form-input" value={form.resp2Time}
                  onChange={e=>setForm(f=>({...f,resp2Time:e.target.value}))} />
              </Field>
              <Field label="Note">
                <input className="form-input" value={form.note}
                  onChange={e=>setForm(f=>({...f,note:e.target.value}))} />
              </Field>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={()=>{setShowForm(false);setForm(emptyForm);}}>Batal</button>
            <button className="btn-primary" onClick={save}>Simpan</button>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

function SLAPreview({ inquiryTime }) {
  const shift  = getShift(inquiryTime);
  const isOOH  = shift === "off";
  const slaS   = getSLAStart(inquiryTime);
  return (
    <div className={`sla-preview ${isOOH?"ooh":""}`}>
      <span>{isOOH?"🌙":"✅"}</span>
      <span>
        {isOOH
          ? <>Inquiry di luar jam shift. SLA mulai <b>09:00 hari berikutnya</b>.</>
          : <>Inquiry masuk <b>{slaS.shiftLabel}</b>. SLA mulai jam inquiry.</>}
      </span>
    </div>
  );
}

function RTPreview({ inquiryTime, inquiryDate, resp1Time, resp1Date }) {
  const resp1NextDay = resp1Date > inquiryDate;
  const actualRT  = calcActualRT(inquiryTime, resp1Time, resp1NextDay);
  const slaRT     = calcSLART(inquiryTime, resp1Time);
  const slaStatus = getSLAStatus(inquiryTime, resp1Time);
  const badge     = slaStatus ? SLA_BADGE[slaStatus] : null;
  const isFail    = ["FAIL","FAIL_OH"].includes(slaStatus);
  return (
    <div className={`rt-preview ${isFail?"fail":""}`}>
      <div className="rt-prev-row"><span className="rt-prev-label">Actual RT:</span><span className="rt-prev-val">{fmtMinutes(actualRT)}</span></div>
      <div className="rt-prev-row"><span className="rt-prev-label">SLA RT:</span><span className="rt-prev-val">{fmtMinutes(slaRT)}</span></div>
      {badge && <span className="sla-badge" style={{background:badge.bg,color:badge.text}}>{badge.label}</span>}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return <div className="form-field"><label className="form-label">{label}</label>{children}</div>;
}

const css = `
  .rt-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:16px; font-family:'Plus Jakarta Sans',sans-serif; }
  .rt-title { font-size:22px; font-weight:700; color:#2B3140; }
  .rt-sub   { font-size:13px; color:#8E97A3; margin-top:2px; }
  .rt-info-bar { background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; padding:10px 14px; font-size:13px; color:#1D4ED8; margin-bottom:10px; font-family:'Plus Jakarta Sans',sans-serif; }
  .sla-info-box { display:flex; align-items:flex-start; gap:8px; background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:10px 14px; font-size:12.5px; color:#92400E; margin-bottom:14px; font-family:'Plus Jakarta Sans',sans-serif; line-height:1.6; }
  .rt-filter { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
  .f-sel { padding:8px 10px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; color:#2B3140; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; min-width:130px; outline:none; }
  .f-sel:focus { border-color:#86A788; }
  .f-date-range { display:flex; align-items:center; gap:6px; }
  .f-sep  { color:#9CA3AF; font-size:13px; }
  .f-clear { padding:8px 12px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; color:#EF4444; font-size:13px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .table-wrap { overflow-x:auto; border-radius:12px; border:1.5px solid #E8EDE8; }
  .rt-table { width:100%; border-collapse:collapse; font-size:12.5px; font-family:'Plus Jakarta Sans',sans-serif; }
  .rt-table th { background:#F5F7F5; padding:9px 12px; text-align:left; font-weight:600; color:#4B5563; border-bottom:1.5px solid #E8EDE8; white-space:nowrap; }
  .rt-table td { padding:9px 12px; border-bottom:1px solid #F3F4F6; color:#374151; vertical-align:middle; }
  .rt-table tr:last-child td { border-bottom:none; }
  .row-fail td { background:#FEF2F2 !important; }
  .row-ooh  td { background:#FFFBEB !important; }
  .td-bold { font-weight:600; color:#2B3140; }
  .td-rt { font-weight:600; white-space:nowrap; }
  .td-rt-fail { color:#B91C1C; }
  .note-cell { max-width:120px; color:#6B7280; font-size:12px; }
  .table-empty { text-align:center; color:#9CA3AF; padding:32px !important; }
  .shift-pill { font-size:11px; font-weight:700; border-radius:20px; padding:3px 8px; }
  .shift-pill.s1  { background:#FEF3C7; color:#92400E; }
  .shift-pill.s2  { background:#EDE9FE; color:#5B21B6; }
  .shift-pill.ooh { background:#FEF3C7; color:#92400E; border:1px dashed #F59E0B; }
  .next-day-badge { font-size:11px; font-weight:700; background:#FEF3C7; color:#92400E; border-radius:6px; padding:2px 7px; }
  .next-day-tag   { font-size:10px; font-weight:700; background:#EDE9FE; color:#5B21B6; border-radius:4px; padding:1px 5px; margin-left:4px; }
  .sla-badge { font-size:11px; font-weight:700; border-radius:20px; padding:3px 9px; display:inline-block; }
  .form-section-label { font-size:11px; font-weight:700; color:#86A788; text-transform:uppercase; letter-spacing:0.5px; padding:4px 0 2px; border-top:1px solid #F3F4F6; font-family:'Plus Jakarta Sans',sans-serif; }
  .sla-preview { display:flex; align-items:flex-start; gap:8px; border-radius:10px; padding:10px 12px; font-size:12.5px; line-height:1.6; background:#DCFCE7; color:#166534; border:1px solid #BBF7D0; font-family:'Plus Jakarta Sans',sans-serif; }
  .sla-preview.ooh { background:#FEF3C7; color:#92400E; border-color:#FDE68A; }
  .rt-preview { display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:#F0FFF4; border:1.5px solid #BBF7D0; border-radius:10px; padding:10px 14px; font-family:'Plus Jakarta Sans',sans-serif; }
  .rt-preview.fail { background:#FEF2F2; border-color:#FECACA; }
  .rt-prev-row  { display:flex; align-items:center; gap:6px; }
  .rt-prev-label { font-size:12px; font-weight:600; color:#4B5563; }
  .rt-prev-val   { font-size:14px; font-weight:700; color:#2B3140; }
  .btn-primary { padding:9px 18px; border-radius:10px; border:none; background:#86A788; color:#fff; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-primary:hover { background:#6d9070; }
  .btn-ghost   { padding:9px 18px; border-radius:10px; border:1.5px solid #E8EDE8; background:transparent; color:#4B5563; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .modal-overlay { position:fixed; inset:0; z-index:200; background:rgba(43,49,64,0.45); display:flex; align-items:center; justify-content:center; padding:16px; font-family:'Plus Jakarta Sans',sans-serif; }
  .modal-box   { background:#fff; border-radius:20px; padding:28px; width:100%; max-width:540px; max-height:90vh; overflow-y:auto; position:relative; animation:slideUp 0.2s cubic-bezier(0.22,1,0.36,1); }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .modal-close { position:absolute; top:16px; right:16px; width:28px; height:28px; border-radius:7px; border:none; background:#F3F4F6; color:#6B7280; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; }
  .modal-title   { font-size:17px; font-weight:700; color:#2B3140; margin-bottom:20px; }
  .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:20px; }
  .form-grid { display:flex; flex-direction:column; gap:12px; }
  .form-row  { display:flex; gap:12px; flex-wrap:wrap; }
  .form-row > * { flex:1; min-width:140px; }
  .form-field { display:flex; flex-direction:column; gap:5px; }
  .form-label { font-size:12px; font-weight:600; color:#4B5563; }
  .form-input { padding:9px 12px; border-radius:9px; border:1.5px solid #E8EDE8; background:#FAFBFA; color:#2B3140; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; width:100%; }
  .form-input:focus { border-color:#86A788; background:#fff; }
`;
