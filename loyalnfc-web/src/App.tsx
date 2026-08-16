import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RequireRole } from "./components/RequireRole";
import { StaffLogin } from "./pages/StaffLogin";
import { CustomerLogin } from "./pages/CustomerLogin";
import { SuperAdminDashboard } from "./pages/SuperAdminDashboard";
import { BusinessAdminDashboard } from "./pages/BusinessAdminDashboard";
import { CustomerDashboard } from "./pages/CustomerDashboard";
import { Unauthorized } from "./pages/Unauthorized";
import { NfcTapPage } from "./pages/NfcTapPage";
import { Loader2 } from "lucide-react";

const RootRedirect: React.FC = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === "super_admin") return <Navigate to="/super-admin" replace />;
  if (role === "business_admin") return <Navigate to="/admin" replace />;
  if (role === "customer") return <Navigate to="/c" replace />;

  return <Navigate to="/unauthorized" replace />;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication & Tap Pages */}
          <Route path="/t/:token" element={<NfcTapPage />} />
          <Route path="/login" element={<StaffLogin />} />
          <Route path="/staff-login" element={<StaffLogin />} />
          <Route path="/customer-login" element={<CustomerLogin />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Routes Scoped by Custom Claims */}
          <Route element={<RequireRole allowedRoles={["super_admin"]} />}>
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
          </Route>

          <Route element={<RequireRole allowedRoles={["business_admin"]} />}>
            <Route path="/admin" element={<BusinessAdminDashboard />} />
          </Route>

          <Route element={<RequireRole allowedRoles={["customer"]} />}>
            <Route path="/c" element={<CustomerDashboard />} />
          </Route>

          {/* Root Redirect Handler */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
