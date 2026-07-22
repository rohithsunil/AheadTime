import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { TabHistoryProvider } from '@/lib/TabHistoryContext';
import Home from '@/pages/Home';
import Documents from '@/pages/Documents';
import AddDocument from '@/pages/AddDocument';
import DocumentDetail from '@/pages/DocumentDetail';
import Alerts from '@/pages/Alerts';
import Settings from '@/pages/Settings';
import Onboarding from '@/pages/Onboarding';
import Categories from '@/pages/Categories';
import CalendarView from '@/pages/CalendarView';
import Insights from '@/pages/Insights';
import FamilyProfiles from '@/pages/FamilyProfiles';
import Admin from '@/pages/Admin';
import OnboardingGate from '@/components/OnboardingGate';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import { Navigate } from 'react-router-dom';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Render the main app
  return (
    <>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            <Route element={<OnboardingGate />}>
              <Route path="/" element={<Home />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/add" element={<AddDocument />} />
              <Route path="/edit/:id" element={<AddDocument />} />
              <Route path="/document/:id" element={<DocumentDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/profiles" element={<FamilyProfiles />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        <PWAInstallBanner />
      </ErrorBoundary>
    </>
  );
};

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <TabHistoryProvider>
            <AuthenticatedApp />
          </TabHistoryProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App