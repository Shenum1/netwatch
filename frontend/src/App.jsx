import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/dashboard/Sidebar.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import LoginPage   from "./pages/LoginPage.jsx";
import Dashboard   from "./pages/Dashboard.jsx";
import AlertsPage  from "./pages/AlertsPage.jsx";
import GeoPage     from "./pages/GeoPage.jsx";
import ModelPage   from "./pages/ModelPage.jsx";
import ScriptsPage from "./pages/ScriptsPage.jsx";

function AppShell({ children }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", background: "var(--color-background-tertiary)" }}>
        {children}
      </main>
    </div>
  );
}

function Protected({ children }) {
  return <ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"   element={<LoginPage />} />
        <Route path="/"        element={<Protected><Dashboard /></Protected>} />
        <Route path="/alerts"  element={<Protected><AlertsPage /></Protected>} />
        <Route path="/geo"     element={<Protected><GeoPage /></Protected>} />
        <Route path="/model"   element={<Protected><ModelPage /></Protected>} />
        <Route path="/scripts" element={<Protected><ScriptsPage /></Protected>} />
      </Routes>
    </BrowserRouter>
  );
}
