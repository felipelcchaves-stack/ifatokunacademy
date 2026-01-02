import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ContentProtection from "@/components/ContentProtection";
import ProtectedRoute from "@/components/ProtectedRoute";

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
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminModules from "./pages/admin/AdminModules";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminLessonsOverview from "./pages/admin/AdminLessonsOverview";
import AdminExercises from "./pages/admin/AdminExercises";
import AdminImportOdu from "./pages/admin/AdminImportOdu";
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
              
              {/* Admin Routes - Protected & Admin Only */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/modules" element={
                <ProtectedRoute requireAdmin>
                  <AdminModules />
                </ProtectedRoute>
              } />
              <Route path="/admin/modules/:moduleId/lessons" element={
                <ProtectedRoute requireAdmin>
                  <AdminLessons />
                </ProtectedRoute>
              } />
              <Route path="/admin/modules/:moduleId/lessons/:lessonId/exercises" element={
                <ProtectedRoute requireAdmin>
                  <AdminExercises />
                </ProtectedRoute>
              } />
              <Route path="/admin/lessons" element={
                <ProtectedRoute requireAdmin>
                  <AdminLessonsOverview />
                </ProtectedRoute>
              } />
              <Route path="/admin/import-odu" element={
                <ProtectedRoute requireAdmin>
                  <AdminImportOdu />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/payments" element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/reports" element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              
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
