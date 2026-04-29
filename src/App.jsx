import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { I18nProvider } from '@/lib/i18n/I18nContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProductCatalog from './pages/ProductCatalog';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Events from './pages/Events';
import EventDashboard from './pages/EventDashboard';
import EventJoin from './pages/EventJoin';
import MyOrders from './pages/MyOrders.jsx';
import TailoringStatus from './pages/TailoringStatus';
import FamilyGroup from './pages/FamilyGroup';
import CreateFamilyGroup from './pages/CreateFamilyGroup';
import MyAccount from './pages/MyAccount';
import CareAndInfo from './pages/CareAndInfo';
import AboutUs from './pages/AboutUs';
import FollowUs from './pages/FollowUs';
import TermsAndConditions from './pages/TermsAndConditions';
import AdminDashboard from './pages/AdminDashboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<ProductCatalog />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/events" element={<Events />} />
        <Route path="/event/:id" element={<EventDashboard />} />
        <Route path="/join/:id" element={<EventJoin />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/tailoring-status" element={<TailoringStatus />} />
        <Route path="/family-group/:groupId" element={<FamilyGroup />} />
        <Route path="/create-family-group" element={<CreateFamilyGroup />} />
        <Route path="/my-account" element={<MyAccount />} />
        <Route path="/care-and-info" element={<CareAndInfo />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/follow-us" element={<FollowUs />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </I18nProvider>
    </AuthProvider>
  )
}

export default App