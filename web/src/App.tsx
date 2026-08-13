import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { AuthProvider } from "./lib/auth-context";
import Calculator from "./pages/Calculator";
import CustomFoodForm from "./pages/CustomFoodForm";
import Diary from "./pages/Diary";
import FoodDetail from "./pages/FoodDetail";
import FoodSearch from "./pages/FoodSearch";
import HealthCheck from "./pages/HealthCheck";
import Login from "./pages/Login";
import SettingsProfile from "./pages/SettingsProfile";
import SettingsSystem from "./pages/SettingsSystem";
import WeightLog from "./pages/WeightLog";

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/food/search" element={<FoodSearch />} />
          <Route path="/food/:source/:id" element={<FoodDetail />} />
          <Route path="/debug/health" element={<HealthCheck />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/diary" replace />} />
            <Route path="/diary" element={<Diary />} />
            <Route path="/settings/profile" element={<SettingsProfile />} />
            <Route path="/settings/system" element={<SettingsSystem />} />
            <Route path="/weight-log" element={<WeightLog />} />
            <Route path="/food/custom/new" element={<CustomFoodForm />} />
            <Route path="/food/custom/:id/edit" element={<CustomFoodForm />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
