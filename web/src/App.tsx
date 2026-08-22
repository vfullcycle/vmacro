import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { AuthProvider } from "./lib/auth-context";
import Achievements from "./pages/Achievements";
import AdminCustomFoods from "./pages/AdminCustomFoods";
import AdminFoodImport from "./pages/AdminFoodImport";
import AdminFoodRequests from "./pages/AdminFoodRequests";
import AdminHome from "./pages/AdminHome";
import AiFoodImport from "./pages/AiFoodImport";
import Calculator from "./pages/Calculator";
import CustomFoodForm from "./pages/CustomFoodForm";
import Dashboard from "./pages/Dashboard";
import Diary from "./pages/Diary";
import DishBuilder from "./pages/DishBuilder";
import FoodDetail from "./pages/FoodDetail";
import FoodRequests from "./pages/FoodRequests";
import FoodSearch from "./pages/FoodSearch";
import Friends from "./pages/Friends";
import HealthCheck from "./pages/HealthCheck";
import Login from "./pages/Login";
import SettingsDayType from "./pages/SettingsDayType";
import SettingsHome from "./pages/SettingsHome";
import SettingsMealTargets from "./pages/SettingsMealTargets";
import SettingsMealTemplates from "./pages/SettingsMealTemplates";
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
          <Route path="/debug/health" element={<HealthCheck />} />

          {/* Public per R-07/D-012 — still wrapped in Layout so the tab bar shows for
              logged-in users too; tapping a protected tab from here just prompts login. */}
          <Route element={<Layout />}>
            <Route path="/food/search" element={<FoodSearch />} />
            <Route path="/food/:source/:id" element={<FoodDetail />} />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/diary" replace />} />
            <Route path="/diary" element={<Diary />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/settings" element={<SettingsHome />} />
            <Route path="/settings/profile" element={<SettingsProfile />} />
            <Route path="/settings/system" element={<SettingsSystem />} />
            <Route path="/settings/day-type" element={<SettingsDayType />} />
            <Route path="/settings/meal-targets" element={<SettingsMealTargets />} />
            <Route path="/settings/meal-templates" element={<SettingsMealTemplates />} />
            <Route path="/settings/admin" element={<AdminHome />} />
            <Route path="/settings/admin/food-import" element={<AdminFoodImport />} />
            <Route path="/settings/admin/custom-foods" element={<AdminCustomFoods />} />
            <Route path="/settings/admin/food-requests" element={<AdminFoodRequests />} />
            <Route path="/weight-log" element={<WeightLog />} />
            <Route path="/food/requests" element={<FoodRequests />} />
            <Route path="/food/ai-import" element={<AiFoodImport />} />
            <Route path="/food/custom/new" element={<CustomFoodForm />} />
            <Route path="/food/custom/:id/edit" element={<CustomFoodForm />} />
            <Route path="/food/dish/new" element={<DishBuilder />} />
            <Route path="/food/dish/:id/edit" element={<DishBuilder />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
