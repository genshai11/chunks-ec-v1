import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Courses from "./pages/Courses";
import Progress from "./pages/Progress";
import Practice from "./pages/Practice";
import Vocabulary from "./pages/Vocabulary";
import NotFound from "./pages/NotFound";
import ProjectIntroduction from "./pages/ProjectIntroduction";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />

            {/* Learner app namespace */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/courses"
              element={
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/practice"
              element={
                <ProtectedRoute>
                  <Practice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/vocabulary"
              element={
                <ProtectedRoute>
                  <Vocabulary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/leaderboard"
              element={
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/progress"
              element={
                <ProtectedRoute>
                  <Progress />
                </ProtectedRoute>
              }
            />

            {/* Admin namespace */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireTeacher>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/introduction"
              element={
                <ProtectedRoute requireTeacher>
                  <ProjectIntroduction />
                </ProtectedRoute>
              }
            />

            {/* Legacy route compatibility */}
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/courses" element={<Navigate to="/app/courses" replace />} />
            <Route path="/practice" element={<Navigate to="/app/practice" replace />} />
            <Route path="/vocabulary" element={<Navigate to="/app/vocabulary" replace />} />
            <Route path="/leaderboard" element={<Navigate to="/app/leaderboard" replace />} />
            <Route path="/profile" element={<Navigate to="/app/profile" replace />} />
            <Route path="/progress" element={<Navigate to="/app/progress" replace />} />
            <Route path="/introduction" element={<Navigate to="/admin/introduction" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
