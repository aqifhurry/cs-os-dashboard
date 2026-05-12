// src/pages/spv/SPVFaqPage.jsx
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, onSnapshot, serverTimestamp
} from "firebase/firestore";
import PageLayout from "../../components/PageLayout";
import Navbar from "../../components/Navbar";

const KATEGORI_LIST = ["Fitur", "Pembayaran", "Pengiriman", "Akun", "Refund", "Teknis", "Lainnya"];

const fmtDate = (ts) => {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" });
};

export default function SPVFaqPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [faqs, setFaqs]         = useState([]);
  const [open, setOpen]         = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [search, setSearch]     = useState("");
  const [katFilter, setKatFilter] = useState("");
  const [copied, setCopied]     = useState(null);

  const emptyForm = { kategori:"Fitur", subKategori:"", pertanyaan:"", jawaban:"", scriptWA:"", keyword:"" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "faqs"), snap =>
      setFaqs(snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => (a.kategori||"").localeCompare(b.kategori||"")))
    );
    return unsub;
  }, []);

  const save = async () => {
    if (!form.pertanyaan.trim()) { alert("Pertanyaan wajib diisi."); return; }
    if (!form.jawaban.trim())    { alert("Jawaban wajib diisi.");     return; }
    const payload = {
      ...form,
      keyword: form.keyword.split(",").map(k=>k.trim()).filter(Boolean),
      updatedAt: serverTimestamp(),
      updatedBy: user.nama,
    };
    if (editItem) {
      await updateDoc(doc(db, "faqs", editItem.id), payload);
    } else {
      await addDoc(collection(db, "faqs"), { ...payload, createdAt: serverTimestamp(), createdBy: user.nama });
    }
    closeForm();
  };

  const openEdit = (faq) => {
    setEditItem(faq);
    setForm({
      kategori:    faq.kategori    ?? "Fitur",
      subKategori: faq.subKategori ?? "",
      pertanyaan:  faq.pertanyaan  ?? "",
      jawaban:     faq.jawaban     ?? "",
      scriptWA:    faq.scriptWA    ?? "",
      keyword:     Array.isArray(faq.keyword) ? faq.keyword.join(", ") : (faq.keyword ?? ""),
    });
    setShowForm(true); setOpen(null);
  };

  const closeForm = () => { setShowForm(false); setEditItem(null); setForm(emptyForm); };

  const copyScript = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const filtered = faqs.filter(f => {
    const q = search.toLowerCase();
    const kws = Array.isArray(f.keyword) ? f.keyword.join(" ").toLowerCase() : "";
    const matchSearch = !search ||
      f.pertanyaan?.toLowerCase().includes(q) ||
      f.jawaban?.toLowerCase().includes(q) ||
      f.scriptWA?.toLowerCase().includes(q) ||
      kws.includes(q);
    return matchSearch && (!katFilter || f.kategori === katFilter);
  });

  const grouped = filtered.reduce((acc, faq) => {
    const k = faq.kategori || "Lainnya";
    if (!acc[k]) acc[k] = [];
    acc[k].push(faq);
    return acc;
  }, {});

  const kategoris = [...new Set(faqs.map(f => f.kategori).filter(Boolean))];

  return (
    <PageLayout navbar={<Navbar />}>
      <style>{css}</style>

      <div className="fq-header">
        <div>
          <h1 className="fq-title">FAQ</h1>
          <p className="fq-sub">Standard response & script WA siap pakai untuk tim CS</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm(emptyForm); }}>
          + Tambah FAQ
        </button>
      </div>

      {/* Controls */}
      <div className="fq-controls">
        <div className="fq-search-wrap">
          <SearchIcon />
          <input className="fq-search" placeholder="Cari pertanyaan, jawaban, keyword..."
            value={search} onChange={e => { setSearch(e.target.value); setOpen(null); }} />
          {search && <button className="fq-clear" onClick={() => setSearch("")}>✕</button>}
        </div>
        <select className="f-sel" value={katFilter} onChange={e => { setKatFilter(e.target.value); setOpen(null); }}>
          <option value="">Semua Kategori</option>
          {kategoris.map(k => <option key={k}>{k}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="fq-stats">
        <span><b>{faqs.length}</b> total FAQ</span>
        <span className="fq-dot" />
        <span><b>{kategoris.length}</b> kategori</span>
        {filtered.length !== faqs.length && (<><span className="fq-dot"/><span className="text-sage"><b>{filtered.length}</b> hasil</span></>)}
      </div>

      {/* Empty */}
      {Object.keys(grouped).length === 0 && (
        <div className="fq-empty">
          <EmptyIcon />
          <p>{search||katFilter ? "Tidak ada hasil." : "Belum ada FAQ. Tambahkan sekarang!"}</p>
        </div>
      )}

      {/* Grouped list */}
      {Object.entries(grouped).map(([kat, items]) => (
        <div key={kat} className="fq-group">
          <div className="fq-group-header">
            <span className="fq-group-label">{kat}</span>
            <span className="fq-group-count">{items.length} FAQ</span>
          </div>
          <div className="fq-list">
            {items.map((f, i) => {
              const uid  = `${kat}-${f.id}`;
              const isOpen = open === uid;
              const kws  = Array.isArray(f.keyword) ? f.keyword : [];
              return (
                <div key={f.id} className={`fq-item ${isOpen?"open":""}`}>

                  {/* Question */}
                  <button className="fq-q" onClick={() => setOpen(isOpen ? null : uid)}>
                    <div className="fq-q-left">
                      {f.subKategori && <span className="fq-subkat">{f.subKategori}</span>}
                      <span className="fq-q-text">{f.pertanyaan}</span>
                      {kws.length > 0 && (
                        <div className="fq-kws-preview">
                          {kws.slice(0,3).map((k,ki) => <span key={ki} className="fq-kw-pill">{k}</span>)}
                          {kws.length > 3 && <span className="fq-kw-more">+{kws.length-3}</span>}
                        </div>
                      )}
                    </div>
                    <div className="fq-q-right">
                      <span className="fq-updated">{fmtDate(f.updatedAt || f.createdAt)}</span>
                      <ChevronIcon rotated={isOpen} />
                    </div>
                  </button>

                  {/* Body */}
                  {isOpen && (
                    <div className="fq-body">

                      {/* Jawaban */}
                      <div className="fq-section">
                        <div className="fq-section-label"><AnswerIcon />&nbsp;Jawaban / Solusi (Standard Response)</div>
                        <p className="fq-answer">{f.jawaban}</p>
                      </div>

                      {/* Script WA */}
                      {f.scriptWA && (
                        <div className="fq-section">
                          <div className="fq-section-label"><WAIcon />&nbsp;Script Copy-Paste (WA Ready)</div>
                          <div className="fq-script-wrap">
                            <pre className="fq-script">{f.scriptWA}</pre>
                            <button
                              className={`fq-copy-btn ${copied===f.id?"copied":""}`}
                              onClick={() => copyScript(f.scriptWA, f.id)}
                            >
                              {copied===f.id ? <CheckIcon /> : <CopyIcon />}
                              {copied===f.id ? "Tersalin!" : "Copy"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Keywords */}
                      {kws.length > 0 && (
                        <div className="fq-section">
                          <div className="fq-section-label"><TagIcon />&nbsp;Keyword (Kata Kunci)</div>
                          <div className="fq-kws">
                            {kws.map((k,ki) => <span key={ki} className="fq-kw-tag">{k}</span>)}
                          </div>
                        </div>
                      )}

                      {/* Meta + actions */}
                      <div className="fq-meta-row">
                        <span className="fq-meta">
                          Last updated: {fmtDate(f.updatedAt || f.createdAt)}
                          {f.updatedBy && ` · ${f.updatedBy}`}
                        </span>
                        <div className="fq-actions">
                          <button className="btn-sm-edit" onClick={() => openEdit(f)}><EditIcon /> Edit</button>
                          <button className="btn-sm-del" onClick={() => setConfirm({ id:f.id, label:f.pertanyaan })}><TrashIcon /> Hapus</button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Form Modal */}
      {showForm && (
        <Modal onClose={closeForm}>
          <h3 className="modal-title">{editItem ? "Edit FAQ" : "Tambah FAQ Baru"}</h3>
          <div className="form-grid">
            <div className="form-row">
              <Field label="Kategori *">
                <select className="form-input" value={form.kategori} onChange={e=>setForm(f=>({...f,kategori:e.target.value}))}>
                  {KATEGORI_LIST.map(k=><option key={k}>{k}</option>)}
                </select>
              </Field>
              <Field label="Sub-Kategori / Fitur">
                <input className="form-input" value={form.subKategori}
                  onChange={e=>setForm(f=>({...f,subKategori:e.target.value}))}
                  placeholder="Fitur A, Fitur B..." />
              </Field>
            </div>
            <Field label="Pertanyaan Customer (Customer Inquiry) *">
              <textarea className="form-input form-textarea" rows={2} value={form.pertanyaan}
                onChange={e=>setForm(f=>({...f,pertanyaan:e.target.value}))}
                placeholder="Tulis pertanyaan yang sering diajukan customer..." />
            </Field>
            <Field label="Jawaban / Solusi (Standard Response) *">
              <textarea className="form-input form-textarea" rows={4} value={form.jawaban}
                onChange={e=>setForm(f=>({...f,jawaban:e.target.value}))}
                placeholder="Tulis jawaban atau langkah penyelesaian..." />
            </Field>
            <Field label="Script Copy-Paste (WA Ready)">
              <textarea className="form-input form-textarea script-area" rows={5} value={form.scriptWA}
                onChange={e=>setForm(f=>({...f,scriptWA:e.target.value}))}
                placeholder={"Halo Kak [Nama], terima kasih sudah menghubungi kami! 😊\n\n[isi jawaban]\n\nSemoga membantu ya Kak! 🙏"} />
              <p className="form-hint">Gunakan [Nama], [Nomor Order] sebagai placeholder yang bisa diganti.</p>
            </Field>
            <Field label="Keyword / Kata Kunci">
              <input className="form-input" value={form.keyword}
                onChange={e=>setForm(f=>({...f,keyword:e.target.value}))}
                placeholder="refund, batal pesanan, uang kembali (pisah dengan koma)" />
              <p className="form-hint">Keyword memudahkan pencarian FAQ ini.</p>
            </Field>
          </div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={closeForm}>Batal</button>
            <button className="btn-primary" onClick={save}>{editItem ? "Simpan Perubahan" : "Tambah FAQ"}</button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirm && (
        <Modal onClose={() => setConfirm(null)} small>
          <div className="confirm-wrap">
            <div className="confirm-icon"><TrashIcon /></div>
            <h3 className="confirm-title">Hapus FAQ?</h3>
            <p className="confirm-sub">"{confirm.label}" akan dihapus permanen.</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirm(null)}>Batal</button>
              <button className="btn-danger" onClick={async () => {
                await deleteDoc(doc(db, "faqs", confirm.id));
                setConfirm(null); setOpen(null);
              }}>Ya, Hapus</button>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

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

function SearchIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function ChevronIcon({ rotated }) { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform:rotated?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s",flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>; }
function CopyIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>; }
function CheckIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function EditIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>; }
function AnswerIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>; }
function WAIcon()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>; }
function TagIcon()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function EmptyIcon()   { return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }

const css = `
  .fq-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:20px; font-family:'Plus Jakarta Sans',sans-serif; }
  .fq-title  { font-size:22px; font-weight:700; color:#2B3140; }
  .fq-sub    { font-size:13px; color:#8E97A3; margin-top:2px; }
  .fq-controls { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px; align-items:center; }
  .fq-search-wrap { display:flex; align-items:center; gap:10px; flex:1; min-width:220px; background:#fff; border:1.5px solid #E8EDE8; border-radius:10px; padding:0 14px; transition:border-color 0.15s; }
  .fq-search-wrap:focus-within { border-color:#86A788; }
  .fq-search { flex:1; border:none; outline:none; padding:11px 0; font-size:14px; color:#2B3140; background:transparent; font-family:'Plus Jakarta Sans',sans-serif; }
  .fq-search::placeholder { color:#B8C0CC; }
  .fq-clear  { border:none; background:transparent; color:#9CA3AF; cursor:pointer; font-size:14px; padding:4px; }
  .f-sel     { padding:8px 10px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; color:#2B3140; font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; min-width:160px; outline:none; }
  .f-sel:focus { border-color:#86A788; }
  .fq-stats  { display:flex; align-items:center; gap:10px; margin-bottom:20px; font-size:13px; color:#6B7280; font-family:'Plus Jakarta Sans',sans-serif; }
  .fq-stats b { color:#2B3140; }
  .fq-dot    { width:4px; height:4px; border-radius:50%; background:#D1D5DB; }
  .text-sage b { color:#3A7040; }
  .fq-empty  { display:flex; flex-direction:column; align-items:center; gap:12px; padding:48px 0; color:#9CA3AF; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; }
  .fq-group  { margin-bottom:24px; }
  .fq-group-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; padding-bottom:8px; border-bottom:2px solid #E8EDE8; }
  .fq-group-label  { font-size:12px; font-weight:700; color:#3A7040; background:#E8F0E8; border-radius:6px; padding:4px 12px; font-family:'Plus Jakarta Sans',sans-serif; letter-spacing:0.3px; text-transform:uppercase; }
  .fq-group-count  { font-size:12px; color:#9CA3AF; font-family:'Plus Jakarta Sans',sans-serif; }
  .fq-list   { display:flex; flex-direction:column; gap:8px; }
  .fq-item   { background:#fff; border-radius:14px; border:1.5px solid #E8EDE8; overflow:hidden; transition:border-color 0.15s, box-shadow 0.15s; font-family:'Plus Jakarta Sans',sans-serif; }
  .fq-item:hover { box-shadow:0 2px 8px rgba(43,49,64,0.07); }
  .fq-item.open  { border-color:#86A788; box-shadow:0 4px 16px rgba(134,167,136,0.12); }
  .fq-q      { width:100%; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:14px 18px; border:none; background:transparent; cursor:pointer; text-align:left; transition:background 0.15s; }
  .fq-q:hover { background:#FAFBFA; }
  .fq-q-left { display:flex; flex-direction:column; gap:5px; flex:1; }
  .fq-subkat { font-size:11px; font-weight:700; color:#86A788; background:#E8F0E8; border-radius:4px; padding:2px 8px; width:fit-content; }
  .fq-q-text { font-size:14px; font-weight:600; color:#2B3140; line-height:1.4; }
  .fq-kws-preview { display:flex; gap:4px; flex-wrap:wrap; }
  .fq-kw-pill { font-size:10px; color:#6B7280; background:#F3F4F6; border-radius:20px; padding:2px 7px; }
  .fq-kw-more { font-size:10px; color:#9CA3AF; padding:2px 4px; }
  .fq-q-right { display:flex; align-items:center; gap:10px; flex-shrink:0; padding-top:2px; }
  .fq-updated { font-size:11px; color:#9CA3AF; white-space:nowrap; }
  .fq-body   { border-top:1px solid #F3F4F6; }
  .fq-section { padding:14px 18px; border-bottom:1px solid #F9FAFB; }
  .fq-section:last-of-type { border-bottom:none; }
  .fq-section-label { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; }
  .fq-answer { font-size:13.5px; color:#374151; line-height:1.7; white-space:pre-line; }
  .fq-script-wrap { position:relative; }
  .fq-script { background:#F0FFF4; border:1.5px solid #BBF7D0; border-radius:10px; padding:14px 16px; padding-right:100px; font-size:13px; color:#166534; line-height:1.7; white-space:pre-wrap; font-family:'Plus Jakarta Sans',sans-serif; margin:0; }
  .fq-copy-btn { position:absolute; top:10px; right:10px; display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:7px; border:none; cursor:pointer; font-size:12px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; background:#86A788; color:#fff; transition:all 0.15s; }
  .fq-copy-btn:hover { background:#6d9070; }
  .fq-copy-btn.copied { background:#16A34A; }
  .fq-kws    { display:flex; flex-wrap:wrap; gap:6px; }
  .fq-kw-tag { font-size:12px; font-weight:600; color:#3A7040; background:#E8F0E8; border-radius:20px; padding:4px 10px; border:1px solid #C6DEC6; }
  .fq-meta-row { display:flex; align-items:center; justify-content:space-between; padding:12px 18px; gap:12px; flex-wrap:wrap; background:#FAFBFA; border-top:1px solid #F3F4F6; }
  .fq-meta   { font-size:11px; color:#B0BAC7; }
  .fq-actions { display:flex; gap:8px; }
  .btn-sm-edit { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:8px; border:1.5px solid #E8EDE8; background:#fff; color:#4B5563; font-size:12px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-sm-edit:hover { background:#F5F7F5; }
  .btn-sm-del  { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:8px; border:1.5px solid #FECACA; background:#FEF2F2; color:#B91C1C; font-size:12px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-sm-del:hover { background:#FEE2E2; }
  .btn-primary { padding:9px 18px; border-radius:10px; border:none; background:#86A788; color:#fff; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; box-shadow:0 2px 8px rgba(134,167,136,0.3); }
  .btn-primary:hover { background:#6d9070; }
  .btn-ghost   { padding:9px 18px; border-radius:10px; border:1.5px solid #E8EDE8; background:transparent; color:#4B5563; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-danger  { padding:9px 18px; border-radius:10px; border:none; background:#EF4444; color:#fff; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-danger:hover { background:#DC2626; }
  .modal-overlay { position:fixed; inset:0; z-index:200; background:rgba(43,49,64,0.45); display:flex; align-items:center; justify-content:center; padding:16px; font-family:'Plus Jakarta Sans',sans-serif; animation:fadeIn 0.15s ease; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .modal-box   { background:#fff; border-radius:20px; padding:28px; width:100%; max-width:580px; max-height:90vh; overflow-y:auto; position:relative; animation:slideUp 0.2s cubic-bezier(0.22,1,0.36,1); }
  .modal-small { max-width:380px; }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .modal-close { position:absolute; top:16px; right:16px; width:28px; height:28px; border-radius:7px; border:none; background:#F3F4F6; color:#6B7280; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; }
  .modal-title   { font-size:17px; font-weight:700; color:#2B3140; margin-bottom:20px; }
  .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:20px; }
  .form-grid { display:flex; flex-direction:column; gap:14px; }
  .form-row  { display:flex; gap:12px; flex-wrap:wrap; }
  .form-row > * { flex:1; min-width:140px; }
  .form-field { display:flex; flex-direction:column; gap:5px; }
  .form-label { font-size:12px; font-weight:600; color:#4B5563; }
  .form-input { padding:9px 12px; border-radius:9px; border:1.5px solid #E8EDE8; background:#FAFBFA; color:#2B3140; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; width:100%; transition:border-color 0.15s; }
  .form-input:focus { border-color:#86A788; background:#fff; }
  .form-textarea { resize:vertical; min-height:80px; }
  .script-area   { min-height:110px; font-size:13px; line-height:1.6; }
  .form-hint     { font-size:11px; color:#9CA3AF; margin-top:4px; }
  .confirm-wrap  { display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding-top:8px; }
  .confirm-icon  { width:52px; height:52px; border-radius:50%; background:#FEE2E2; color:#EF4444; display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
  .confirm-title { font-size:16px; font-weight:700; color:#2B3140; }
  .confirm-sub   { font-size:13px; color:#6B7280; max-width:280px; line-height:1.5; }
  @media (max-width:640px) {
    .fq-controls { flex-direction:column; }
    .fq-search-wrap, .f-sel { width:100%; }
    .fq-meta-row { flex-direction:column; align-items:flex-start; }
    .fq-script { padding-right:16px; padding-bottom:50px; }
    .fq-copy-btn { position:static; margin-top:8px; width:100%; justify-content:center; }
  }
`;
