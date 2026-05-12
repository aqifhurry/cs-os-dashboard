// src/pages/cs/CSMasterDocPage.jsx
// ─────────────────────────────────────────────────────────────
// CS Master Doc — view only + filter per kategori
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import Navbar    from "../../components/Navbar";
import PageLayout from "../../components/PageLayout";

export default function CSMasterDocPage() {
  const [docs, setDocs]           = useState([]);
  const [search, setSearch]       = useState("");
  const [filterKat, setFilterKat] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "masterDocs"), snap =>
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  // Semua kategori unik dari data
  const allKategori = [...new Set(docs.map(d => d.kategori).filter(Boolean))].sort();

  const filtered = docs.filter(d => {
    const matchKat    = !filterKat || d.kategori === filterKat;
    const matchSearch = !search ||
      d.nama?.toLowerCase().includes(search.toLowerCase()) ||
      d.keterangan?.toLowerCase().includes(search.toLowerCase()) ||
      d.kategori?.toLowerCase().includes(search.toLowerCase());
    return matchKat && matchSearch;
  });

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
          <p className="md-sub">Dokumen & referensi tim</p>
        </div>
        <div className="md-badge">View Only</div>
      </div>

      {/* ── Search + Filter ── */}
      <div className="md-toolbar">
        <div className="md-search-wrap">
          <SearchIcon />
          <input className="md-search" placeholder="Cari dokumen..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {allKategori.length > 0 && (
          <div className="md-kat-filters">
            <button
              className={`kat-btn ${filterKat === "" ? "kat-btn--active" : ""}`}
              onClick={() => setFilterKat("")}>
              Semua <span className="kat-count">{docs.length}</span>
            </button>
            {allKategori.map(k => {
              const cnt = docs.filter(d => d.kategori === k).length;
              const c   = getKatColor(k);
              return (
                <button
                  key={k}
                  className={`kat-btn ${filterKat === k ? "kat-btn--active" : ""}`}
                  style={filterKat === k ? { background: c.bg, color: c.text, borderColor: c.text } : {}}
                  onClick={() => setFilterKat(k === filterKat ? "" : k)}>
                  {k} <span className="kat-count">{cnt}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      <div className="md-grid">
        {filtered.length === 0 && (
          <p className="md-empty">
            {search || filterKat ? "Tidak ada hasil." : "Belum ada dokumen dari Supervisor."}
          </p>
        )}
        {filtered.map(d => {
          const c = getKatColor(d.kategori);
          return (
            <div key={d.id} className="md-card">
              <div className="md-card-top">
                {d.kategori && (
                  <span className="md-kat-badge" style={{ background: c.bg, color: c.text }}>
                    {d.kategori}
                  </span>
                )}
              </div>
              <div className="md-icon"><DocIcon /></div>
              <h4 className="md-name">{d.nama}</h4>
              {d.keterangan && <p className="md-ket">{d.keterangan}</p>}
              <a href={d.link} target="_blank" rel="noreferrer" className="md-link">
                Buka Dokumen →
              </a>
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}

// ── Icons ────────────────────────────────────────────────────
function DocIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#86A788" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}

// ── CSS ──────────────────────────────────────────────────────
const css = `
  .md-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:20px; font-family:'Plus Jakarta Sans',sans-serif; }
  .md-title  { font-size:22px; font-weight:700; color:#2B3140; }
  .md-sub    { font-size:13px; color:#8E97A3; margin-top:2px; }
  .md-badge  { padding:6px 12px; border-radius:8px; background:#F3F4F6; color:#6B7280; font-size:12px; font-weight:600; align-self:flex-start; font-family:'Plus Jakarta Sans',sans-serif; }

  .md-toolbar { display:flex; flex-direction:column; gap:12px; margin-bottom:20px; }
  .md-search-wrap { display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid #E8EDE8; border-radius:10px; padding:0 14px; }
  .md-search-wrap:focus-within { border-color:#86A788; }
  .md-search { flex:1; border:none; outline:none; padding:11px 0; font-size:14px; color:#2B3140; background:transparent; font-family:'Plus Jakarta Sans',sans-serif; }
  .md-search::placeholder { color:#B8C0CC; }

  .md-kat-filters { display:flex; flex-wrap:wrap; gap:7px; }
  .kat-btn { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:20px; border:1.5px solid #E8EDE8; background:#fff; color:#6B7280; font-size:12px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:all 0.15s; }
  .kat-btn:hover { border-color:#86A788; color:#3A7040; }
  .kat-btn--active { background:#E8F0E8; color:#3A7040; border-color:#86A788; }
  .kat-count { background:#F3F4F6; color:#6B7280; font-size:10px; font-weight:700; border-radius:99px; padding:1px 6px; }
  .kat-btn--active .kat-count { background:rgba(255,255,255,0.6); }

  .md-grid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:14px; }
  .md-empty { color:#9CA3AF; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; padding:32px 0; }
  .md-card  { background:#fff; border-radius:16px; padding:18px; border:1.5px solid #E8EDE8; box-shadow:0 1px 4px rgba(43,49,64,0.04); display:flex; flex-direction:column; gap:8px; font-family:'Plus Jakarta Sans',sans-serif; transition:box-shadow 0.15s; }
  .md-card:hover { box-shadow:0 4px 14px rgba(43,49,64,0.09); }
  .md-card-top { display:flex; justify-content:flex-start; min-height:22px; }
  .md-kat-badge { font-size:11px; font-weight:700; border-radius:20px; padding:3px 9px; }
  .md-icon { color:#86A788; }
  .md-name { font-size:15px; font-weight:700; color:#2B3140; }
  .md-ket  { font-size:12px; color:#6B7280; line-height:1.5; }
  .md-link { font-size:13px; color:#86A788; font-weight:600; text-decoration:none; margin-top:auto; }
  .md-link:hover { text-decoration:underline; }
  @media (max-width:480px) { .md-grid { grid-template-columns:1fr; } }
`;
