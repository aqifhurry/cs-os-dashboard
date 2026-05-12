// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login               from "./pages/Login";
import DashboardSPV        from "./pages/spv/DashboardSPV";       // ← BARU
import WhatShouldIDoToday  from "./pages/WhatShouldIDoToday";
import SPVResponPage       from "./pages/spv/SPVResponPage";
import SPVSchedulePage     from "./pages/spv/SPVSchedulePage";
import SPVMasterDocPage    from "./pages/spv/SPVMasterDocPage";
import SPVFaqPage          from "./pages/spv/SPVFaqPage";
import DashboardCS         from "./pages/cs/DashboardCS";
import CSTodoPage          from "./pages/cs/CSTodoPage";
import CSResponPage        from "./pages/cs/CSResponPage";
import CSSchedulePage      from "./pages/cs/CSSchedulePage";
import CSMasterDocPage     from "./pages/cs/CSMasterDocPage";
import CSFaqPage           from "./pages/cs/CSFaqPage";

// ── Auth guard ────────────────────────────────────────────────
function PrivateRoute({ children, role }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.id)                        return <Navigate to="/" replace />;
  if (role && user.role !== role)      return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public ──────────────────────────────────────── */}
        <Route path="/" element={<Login />} />

        {/* ── SPV ROUTES ──────────────────────────────────── */}

        {/* Home: /dashboard/spv → DashboardSPV (ada navbar + welcome) */}
        <Route path="/dashboard/spv" element={
          <PrivateRoute role="spv"><DashboardSPV /></PrivateRoute>
        } />

        <Route path="/dashboard/spv/todo" element={
          <PrivateRoute role="spv"><WhatShouldIDoToday /></PrivateRoute>
        } />
        <Route path="/dashboard/spv/respon" element={
          <PrivateRoute role="spv"><SPVResponPage /></PrivateRoute>
        } />
        <Route path="/dashboard/spv/schedule" element={
          <PrivateRoute role="spv"><SPVSchedulePage /></PrivateRoute>
        } />
        <Route path="/dashboard/spv/masterdoc" element={
          <PrivateRoute role="spv"><SPVMasterDocPage /></PrivateRoute>
        } />
        <Route path="/dashboard/spv/faq" element={
          <PrivateRoute role="spv"><SPVFaqPage /></PrivateRoute>
        } />

        {/* ── CS ROUTES ───────────────────────────────────── */}

        {/* Home: /dashboard/cs → DashboardCS */}
        <Route path="/dashboard/cs" element={
          <PrivateRoute role="cs"><DashboardCS /></PrivateRoute>
        } />
        <Route path="/dashboard/cs/home" element={
          <PrivateRoute role="cs"><DashboardCS /></PrivateRoute>
        } />

        <Route path="/dashboard/cs/todo" element={
          <PrivateRoute role="cs"><CSTodoPage /></PrivateRoute>
        } />
        <Route path="/dashboard/cs/respon" element={
          <PrivateRoute role="cs"><CSResponPage /></PrivateRoute>
        } />
        <Route path="/dashboard/cs/schedule" element={
          <PrivateRoute role="cs"><CSSchedulePage /></PrivateRoute>
        } />
        <Route path="/dashboard/cs/masterdoc" element={
          <PrivateRoute role="cs"><CSMasterDocPage /></PrivateRoute>
        } />
        <Route path="/dashboard/cs/faq" element={
          <PrivateRoute role="cs"><CSFaqPage /></PrivateRoute>
        } />

        {/* ── Catch all ────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
