// ─────────────────────────────────────────────────────────────
// SPV Master Doc — tambah dokumen + filter per kategori
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp
} from "firebase/firestore";
import PageLayout from "../../components/PageLayout";
import Navbar    from "../../components/Navbar";

// Kategori default
const DEFAULT_CATEGORIES = ["SOP", "Template", "Laporan", "OKR", "Training", "Referensi", "Lainnya"];

export default function SPVMasterDocPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [docs, setDocs]           = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [confirm, setConfirm]     = useState(null);
  const [search, setSearch]       = useState("");
  const [filterKat, setFilterKat] = useState(""); // filter kategori aktif

  const emptyForm = { nama: "", link: "", keterangan: "", kategori: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "masterDocs"), snap =>
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  // Semua kategori unik dari data + default
  const allKategori = [
    ...new Set([
      ...DEFAULT_CATEGORIES,
      ...docs.map(d => d.kategori).filter(Boolean)
    ])
  ].sort();

  const save = async () => {
    if (!form.nama.trim()) { alert("Nama dokumen wajib."); return; }
    if (!form.link.trim()) { alert("Link wajib diisi.");   return; }
    await addDoc(collection(db, "masterDocs"), {
      ...form,
      kategori:  form.kategori || "Lainnya",
      createdAt: serverTimestamp(),
      createdBy: user.nama,
    });
    setShowForm(false);
    setForm(emptyForm);
  };

  // Filter: kategori + search
  const filtered = docs.filter(d => {
    const matchKat    = !filterKat || d.kategori === filterKat;
    const matchSearch = !search ||
      d.nama?.toLowerCase().includes(search.toLowerCase()) ||
      d.keterangan?.toLowerCase().includes(search.toLowerCase()) ||
      d.kategori?.toLowerCase().includes(search.toLowerCase());
    return matchKat && matchSearch;
  });

  // Warna per kategori
  const KAT_COLOR = {
    SOP:       { bg:"#EFF6FF", text:"#1D4ED8" },
    Template:  { bg:"#F5F3FF", text:"#6D28D9" },
    Laporan:   { bg:"#FFF7ED", text:"#C2410C" },
    OKR:       { bg:"#E8F0E8", text:"#3A7040" },
    Training:  { bg:"#FEF3C7", text:"#92400E" },
    Referensi: { bg:"#FFF1F2", text:"#BE123C" },
    Lainnya:   { bg:"#F3F4F6", text:"#4B5563" },
  };
  const getKatColor = (k) => KAT_COLOR[k] || KAT_COLOR.Lainnya;

  return (
    <PageLayout navbar={<Navbar />}>
      <style>{css}</style>

      {/* ── Header ── */}
      <div className="md-header">
        <div>
          <h1 className="md-title">Master Doc</h1>
          <p className="md-sub">Kelola dokumen & referensi tim</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Tambah Dokumen</button>
      </div>

      {/* ── Search + Filter kategori ── */}
      <div className="md-toolbar">
        <div className="md-search-wrap">
          <SearchIcon />
          <input className="md-search" placeholder="Cari dokumen..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="md-kat-filters">
          <button
            className={`kat-btn ${filterKat === "" ? "kat-btn--active" : ""}`}
            onClick={() => setFilterKat("")}>
            Semua
            <span className="kat-count">{docs.length}</span>
          </button>
          {allKategori.map(k => {
            const cnt = docs.filter(d => d.kategori === k).length;
            if (cnt === 0) return null;
            const c = getKatColor(k);
            return (
              <button
                key={k}
                className={`kat-btn ${filterKat === k ? "kat-btn--active" : ""}`}
                style={filterKat === k ? { background: c.bg, color: c.text, borderColor: c.text } : {}}
                onClick={() => setFilterKat(k === filterKat ? "" : k)}>
                {k}
                <span className="kat-count">{cnt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="md-grid">
        {filtered.length === 0 && (
          <p className="md-empty">
            {search || filterKat
              ? `Tidak ada hasil.`
              : "Belum ada dokumen. Tambahkan dokumen pertama!"}
          </p>
        )}
        {filtered.map(d => {
          const c = getKatColor(d.kategori);
          return (
            <div key={d.id} className="md-card">
              <div className="md-card-top">
                <span className="md-kat-badge" style={{ background: c.bg, color: c.text }}>
                  {d.kategori || "Lainnya"}
                </span>
                <button className="icon-btn danger"
                  onClick={() => setConfirm({ id: d.id, label: d.nama })} title="Hapus">
                  <TrashIcon />
                </button>
              </div>
              <div className="md-icon"><DocIcon /></div>
              <h4 className="md-name">{d.nama}</h4>
              {d.keterangan && <p className="md-ket">{d.keterangan}</p>}
              <a href={d.link} target="_blank" rel="noreferrer" className="md-link">
                Buka Dokumen →
              </a>
              {d.createdBy && <p className="md-meta">Ditambahkan oleh {d.createdBy}</p>}
            </div>
          );
        })}
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <Modal onClose={() => { setShowForm(false); setForm(emptyForm); }}>
          <h3 className="modal-title">Tambah Dokumen</h3>
          <div className="form-grid">
            <Field label="Nama Dokumen *">
              <input className="form-input" value={form.nama}
                onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                placeholder="Nama dokumen" />
            </Field>
            <Field label="Kategori *">
              <div className="kat-picker">
                {DEFAULT_CATEGORIES.map(k => (
                  <button
                    key={k} type="button"
                    className={`kat-chip ${form.kategori === k ? "kat-chip--active" : ""}`}
                    onClick={() => setForm(f => ({ ...f, kategori: k }))}>
                    {k}
                  </button>
                ))}
              </div>
              <input className="form-input" style={{marginTop:8}} value={form.kategori}
                onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
                placeholder="Atau ketik kategori custom..." />
            </Field>
            <Field label="Link *">
              <input className="form-input" value={form.link}
                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                placeholder="https://docs.google.com/..." />
            </Field>
            <Field label="Keterangan (opsional)">
              <textarea className="form-input form-textarea" value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                placeholder="Deskripsi singkat dokumen..." rows={3} />
            </Field>
          </div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => { setShowForm(false); setForm(emptyForm); }}>Batal</button>
            <button className="btn-primary" onClick={save}>Simpan</button>
          </div>
        </Modal>
      )}

      {/* ── Confirm delete ── */}
      {confirm && (
        <Modal onClose={() => setConfirm(null)} small>
          <div className="confirm-wrap">
            <div className="confirm-icon"><TrashIcon /></div>
            <h3 className="confirm-title">Hapus dokumen?</h3>
            <p className="confirm-sub">"{confirm.label}" akan dihapus permanen.</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirm(null)}>Batal</button>
              <button className="btn-danger" onClick={async () => {
                await deleteDoc(doc(db, "masterDocs", confirm.id));
                setConfirm(null);
              }}>Ya, Hapus</button>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

// ── Sub-components ───────────────────────────────────────────
function Modal({ children, onClose, small }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box ${small ? "modal-small" : ""}`}>
        <button className="modal-close" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return <div className="form-field"><label className="form-label">{label}</label>{children}</div>;
}

// ── Icons ────────────────────────────────────────────────────
function DocIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#86A788" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}

// ── CSS ──────────────────────────────────────────────────────
const css = `
  .md-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:20px; font-family:'Plus Jakarta Sans',sans-serif; }
  .md-title  { font-size:22px; font-weight:700; color:#2B3140; }
  .md-sub    { font-size:13px; color:#8E97A3; margin-top:2px; }

  /* Toolbar */
  .md-toolbar { display:flex; flex-direction:column; gap:12px; margin-bottom:20px; }
  .md-search-wrap { display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid #E8EDE8; border-radius:10px; padding:0 14px; }
  .md-search-wrap:focus-within { border-color:#86A788; }
  .md-search { flex:1; border:none; outline:none; padding:11px 0; font-size:14px; color:#2B3140; background:transparent; font-family:'Plus Jakarta Sans',sans-serif; }
  .md-search::placeholder { color:#B8C0CC; }

  /* Kategori filter pills */
  .md-kat-filters { display:flex; flex-wrap:wrap; gap:7px; }
  .kat-btn {
    display:flex; align-items:center; gap:6px;
    padding:6px 12px; border-radius:20px; border:1.5px solid #E8EDE8;
    background:#fff; color:#6B7280; font-size:12px; font-weight:600;
    font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer;
    transition:all 0.15s;
  }
  .kat-btn:hover { border-color:#86A788; color:#3A7040; }
  .kat-btn--active { background:#E8F0E8; color:#3A7040; border-color:#86A788; }
  .kat-count { background:#F3F4F6; color:#6B7280; font-size:10px; font-weight:700; border-radius:99px; padding:1px 6px; }
  .kat-btn--active .kat-count { background:rgba(255,255,255,0.6); }

  /* Grid */
  .md-grid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:14px; }
  .md-empty { color:#9CA3AF; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; padding:32px 0; }
  .md-card  { background:#fff; border-radius:16px; padding:18px; border:1.5px solid #E8EDE8; box-shadow:0 1px 4px rgba(43,49,64,0.04); display:flex; flex-direction:column; gap:8px; font-family:'Plus Jakarta Sans',sans-serif; transition:box-shadow 0.15s; }
  .md-card:hover { box-shadow:0 4px 16px rgba(43,49,64,0.09); }
  .md-card-top { display:flex; justify-content:space-between; align-items:center; }
  .md-kat-badge { font-size:11px; font-weight:700; border-radius:20px; padding:3px 9px; }
  .md-icon { color:#86A788; }
  .md-name { font-size:15px; font-weight:700; color:#2B3140; }
  .md-ket  { font-size:12px; color:#6B7280; line-height:1.5; }
  .md-link { font-size:13px; color:#86A788; font-weight:600; text-decoration:none; margin-top:auto; }
  .md-link:hover { text-decoration:underline; }
  .md-meta { font-size:11px; color:#B0BAC7; margin-top:2px; }

  /* Kategori picker in form */
  .kat-picker { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:4px; }
  .kat-chip {
    padding:5px 11px; border-radius:20px; border:1.5px solid #E8EDE8;
    background:#F9FAFB; color:#6B7280; font-size:12px; font-weight:600;
    font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:all 0.15s;
  }
  .kat-chip:hover { border-color:#86A788; color:#3A7040; }
  .kat-chip--active { background:#E8F0E8; color:#3A7040; border-color:#86A788; font-weight:700; }

  /* Shared */
  .icon-btn { width:28px; height:28px; border-radius:7px; border:none; background:#F3F4F6; color:#6B7280; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .icon-btn.danger { background:#FEE2E2; color:#B91C1C; }
  .icon-btn.danger:hover { background:#FECACA; }
  .btn-primary { padding:9px 18px; border-radius:10px; border:none; background:#86A788; color:#fff; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; box-shadow:0 2px 8px rgba(134,167,136,0.3); }
  .btn-primary:hover { background:#6d9070; }
  .btn-ghost  { padding:9px 18px; border-radius:10px; border:1.5px solid #E8EDE8; background:transparent; color:#4B5563; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-danger { padding:9px 18px; border-radius:10px; border:none; background:#EF4444; color:#fff; font-size:14px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; }
  .btn-danger:hover { background:#DC2626; }
  .modal-overlay { position:fixed; inset:0; z-index:200; background:rgba(43,49,64,0.45); display:flex; align-items:center; justify-content:center; padding:16px; font-family:'Plus Jakarta Sans',sans-serif; }
  .modal-box { background:#fff; border-radius:20px; padding:28px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; position:relative; animation:slideUp 0.2s cubic-bezier(0.22,1,0.36,1); }
  .modal-small { max-width:380px; }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .modal-close { position:absolute; top:16px; right:16px; width:28px; height:28px; border-radius:7px; border:none; background:#F3F4F6; color:#6B7280; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; }
  .modal-title   { font-size:17px; font-weight:700; color:#2B3140; margin-bottom:20px; }
  .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:20px; }
  .form-grid { display:flex; flex-direction:column; gap:14px; }
  .form-field { display:flex; flex-direction:column; gap:5px; }
  .form-label { font-size:12px; font-weight:600; color:#4B5563; }
  .form-input { padding:9px 12px; border-radius:9px; border:1.5px solid #E8EDE8; background:#FAFBFA; color:#2B3140; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; width:100%; }
  .form-input:focus { border-color:#86A788; background:#fff; }
  .form-textarea { resize:vertical; min-height:80px; }
  .confirm-wrap  { display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding-top:8px; }
  .confirm-icon  { width:52px; height:52px; border-radius:50%; background:#FEE2E2; color:#EF4444; display:flex; align-items:center; justify-content:center; margin-bottom:4px; }
  .confirm-title { font-size:16px; font-weight:700; color:#2B3140; }
  .confirm-sub   { font-size:13px; color:#6B7280; max-width:280px; }
  @media (max-width:480px) { .md-grid { grid-template-columns:1fr; } }
`;
