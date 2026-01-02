import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ContentProtection from "@/components/ContentProtection";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/layout/AdminLayout";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ModuleView from "./pages/ModuleView";
import ModuleQuiz from "./pages/ModuleQuiz";
import LessonView from "./pages/LessonView";
import SpacedReview from "./pages/SpacedReview";
import SpacedReviewStats from "./pages/SpacedReviewStats";
import ChallengeMode from "./pages/ChallengeMode";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminModules from "./pages/admin/AdminModules";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminLessonsOverview from "./pages/admin/AdminLessonsOverview";
import AdminExercises from "./pages/admin/AdminExercises";
import AdminImportOdu from "./pages/admin/AdminImportOdu";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReports from "./pages/admin/AdminReports";
import UserSettings from "./pages/UserSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <ContentProtection>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Student Routes - Protected */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/module/:moduleId" element={
                <ProtectedRoute>
                  <ModuleView />
                </ProtectedRoute>
              } />
              <Route path="/module/:moduleId/lesson/:lessonId" element={
                <ProtectedRoute>
                  <LessonView />
                </ProtectedRoute>
              } />
              <Route path="/module/:moduleId/quiz" element={
                <ProtectedRoute>
                  <ModuleQuiz />
                </ProtectedRoute>
              } />
              <Route path="/modules" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/review" element={
                <ProtectedRoute>
                  <SpacedReview />
                </ProtectedRoute>
              } />
              <Route path="/review/stats" element={
                <ProtectedRoute>
                  <SpacedReviewStats />
                </ProtectedRoute>
              } />
              <Route path="/challenge" element={
                <ProtectedRoute>
                  <ChallengeMode />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <UserSettings />
                </ProtectedRoute>
              } />
              <Route path="/settings/study-plan" element={
                <ProtectedRoute>
                  <UserSettings />
                </ProtectedRoute>
              } />
              
              {/* Admin Routes - Protected & Admin Only with shared layout */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="modules" element={<AdminModules />} />
                <Route path="modules/:moduleId/lessons" element={<AdminLessons />} />
                <Route path="modules/:moduleId/lessons/:lessonId/exercises" element={<AdminExercises />} />
                <Route path="lessons" element={<AdminLessonsOverview />} />
                <Route path="import-odu" element={<AdminImportOdu />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="payments" element={<AdminDashboard />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ContentProtection>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
