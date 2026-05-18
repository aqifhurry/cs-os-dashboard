// Wrapper layout: Navbar + halaman konten
import Navbar from "./Navbar";

export default function PageLayout({ children, navbar }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F5F7F5; min-height: 100vh; }
        #root { min-height: 100vh; }
        .pl-root { min-height: 100vh; background: #F5F7F5; }
        .pl-main  { padding: 28px 24px; max-width: 1200px; margin: 0 auto; }
        @media (max-width: 768px) { .pl-main { padding: 16px; } }
      `}</style>
      <div className="pl-root">
        {navbar}
        <main className="pl-main">
          {children}
        </main>
      </div>
    </>
  );
}
