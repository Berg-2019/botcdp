import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { useNotifications } from "@/hooks/useNotifications";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import Attending from "./pages/Attending";
import SettingsPage from "./pages/SettingsPage";
import Contacts from "./pages/Contacts";
import AdminDashboard from "./pages/AdminDashboard";
import DeveloperPanel from "./pages/DeveloperPanel";
import SetPasswordPage from "./pages/SetPasswordPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedProfiles }: { children: React.ReactNode; allowedProfiles?: string[] }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedProfiles && user?.profile && !allowedProfiles.includes(user.profile)) {
    const home = user.profile === 'admin' ? '/admin' : user.profile === 'developer' ? '/developer' : '/';
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}

function getHomeRoute(profile?: string) {
  if (profile === 'admin') return '/admin';
  if (profile === 'developer') return '/developer';
  return '/';
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  useNotifications();

  return (
    <>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to={getHomeRoute(user?.profile)} replace /> : <Login />} />
        <Route path="/set-password" element={<SetPasswordPage />} />

        {/* Rotas de Agente */}
        <Route path="/" element={<ProtectedRoute allowedProfiles={['agent', 'user']}><Index /></ProtectedRoute>} />
        <Route path="/attending" element={<ProtectedRoute allowedProfiles={['agent', 'user']}><Attending /></ProtectedRoute>} />
        <Route path="/chat/:id" element={<ProtectedRoute allowedProfiles={['agent', 'user']}><Chat /></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute allowedProfiles={['agent', 'user']}><Contacts /></ProtectedRoute>} />

        {/* Rotas de Administrador */}
        <Route path="/admin" element={<ProtectedRoute allowedProfiles={['admin']}><AdminDashboard /></ProtectedRoute>} />

        {/* Rotas de Desenvolvedor */}
        <Route path="/developer" element={<ProtectedRoute allowedProfiles={['developer']}><DeveloperPanel /></ProtectedRoute>} />

        {/* Rotas Compartilhadas */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {isAuthenticated && <BottomNav />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
