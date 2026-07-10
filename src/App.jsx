import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./routes/AdminLayout.jsx";
import ContractorLayout from "./routes/ContractorLayout.jsx";
import LoginPage from "./routes/LoginPage.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

function RootRedirect() {
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contractor/*"
          element={
            <ProtectedRoute allowedRole="contractor">
              <ContractorLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
