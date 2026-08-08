import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// ================= USER PAGES =================
import UserLayout from './layouts/UserLayout';
import ProfilePage from './pages/user/ProfilePage';
import HomePage from './pages/user/HomePage';
import CheckoutPage from './pages/user/CheckoutPage';
import VoucherPage from './pages/user/VoucherPage';
import UserOrderPage from './pages/user/UserOrderPage';
import PaymentResultPage from './pages/user/PaymentResultPage';
import ReservationPage from './pages/user/ReservationPage';
import ResetPasswordPage from './pages/user/ResetPasswordPage';
import FeedPage from './pages/user/FeedPage';
// ================= LAYOUTS & PROTECTED ROUTES =================
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AdminLayout from './layouts/AdminLayout';

// ================= ADMIN PAGES =================
import DashboardPage from './pages/admin/DashboardPage';
import FeedManagementPage from './pages/admin/FeedManagementPage';
import ModerationQueuePage from './pages/admin/ModerationQueuePage';
import CategoryManagementPage from './pages/admin/CategoryManagementPage';
import ProductManagementPage from './pages/admin/ProductManagementPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import BannerManagementPage from './pages/admin/BannerManagementPage';
import VoucherManagementPage from './pages/admin/VoucherManagementPage';
import IngredientManagementPage from './pages/admin/IngredientManagementPage';
import BranchManagementPage from './pages/admin/BranchManagementPage';
import ToppingManagementPage from './pages/admin/ToppingManagementPage';
import MemberPromotionPage from './pages/admin/MemberPromotionPage';
import AIManagerPage from './pages/admin/AIManagerPage';

// ================= CAMPAIGN CENTER PAGES =================
import CampaignDashboard from './pages/admin/campaign/CampaignDashboard';
import CampaignListPage from './pages/admin/campaign/CampaignListPage';
import CampaignFormPage from './pages/admin/campaign/CampaignFormPage';
import CampaignCalendarPage from './pages/admin/campaign/CampaignCalendarPage';
import CampaignReportPage from './pages/admin/campaign/CampaignReportPage';
import CampaignAIInsightPage from './pages/admin/campaign/CampaignAIInsightPage';
import CampaignProposalPage from './pages/admin/campaign/CampaignProposalPage';
import ManagerCampaignPage from './pages/manager/ManagerCampaignPage';

// ================= MANAGER PAGES =================
import ComplaintManagementPage from './pages/manager/ComplaintManagementPage';
import ManagerOrderManagement from './pages/manager/ManagerOrderManagement';

// ================= STAFF / BRANCH PAGES =================
import OrderQueuePage from './pages/staff/OrderQueuePage';
import BranchMenuStatusPage from './pages/staff/BranchMenuStatusPage';
import StockManagementPage from './pages/staff/StockManagementPage';
import ManufacturePage from './pages/staff/ManufacturePage';

function App() {
  return (
    <Router>
      <Routes>
        
        {/* ================= ADMIN ROUTES (Chỉ dành cho ADMIN) ================= */}
        <Route path="/admin" element={
          <AdminProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout />
          </AdminProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="chi-nhanh" element={<BranchManagementPage />} />
          <Route path="mon-an" element={<ProductManagementPage/>} />
          <Route path="danh-muc" element={<CategoryManagementPage />} />
          <Route path="nguyen-lieu" element={<IngredientManagementPage />} />
          <Route path="tai-khoan" element={<UserManagementPage />} />
          <Route path="banner" element={<BannerManagementPage />} />
          <Route path="vouchers" element={<VoucherManagementPage />} />
          <Route path="topping" element={<ToppingManagementPage />} />
          <Route path="bac-hang" element={<MemberPromotionPage />} />
          <Route path="bang-tin" element={<FeedManagementPage />} />
          <Route path="kiem-duyet" element={<ModerationQueuePage />} />
          <Route path="ai-management" element={<AIManagerPage />} />

          {/* Campaign Center */}
          <Route path="campaigns/dashboard" element={<CampaignDashboard />} />
          <Route path="campaigns" element={<CampaignListPage />} />
          <Route path="campaigns/create" element={<CampaignFormPage />} />
          <Route path="campaigns/:id" element={<CampaignFormPage />} />
          <Route path="campaigns/calendar" element={<CampaignCalendarPage />} />
          <Route path="campaigns/reports" element={<CampaignReportPage />} />
          <Route path="campaigns/insight" element={<CampaignAIInsightPage />} />
          <Route path="campaigns/proposals" element={<CampaignProposalPage />} />
        </Route>

        {/* ================= MANAGER ROUTES (Chỉ dành cho MANAGER) ================= */}
        <Route path="/manager" element={
          <AdminProtectedRoute allowedRoles={['MANAGER']}>
            <AdminLayout />
          </AdminProtectedRoute>
        }>
          {/* Note: Bạn cần cấu hình DashboardPage xử lý nhận biết Role để hiển thị Doanh thu chi nhánh */}
          <Route path="dashboard" element={<DashboardPage />} /> 
          <Route path="don-hang" element={<ManagerOrderManagement />} />
          <Route path="khieu-nai" element={<ComplaintManagementPage />} />
          <Route path="kho" element={<StockManagementPage />} />
          <Route path="thuc-don" element={<BranchMenuStatusPage />} />
          <Route path="campaigns" element={<ManagerCampaignPage />} />
        </Route>

        {/* ================= STAFF ROUTES (Chỉ dành cho STAFF) ================= */}
        <Route path="/staff" element={
          <AdminProtectedRoute allowedRoles={['STAFF', 'MANAGER']}>
            <AdminLayout />
          </AdminProtectedRoute>
        }>
          <Route path="don-hang" element={<OrderQueuePage />} />
          <Route path="thuc-don" element={<BranchMenuStatusPage />} />
          <Route path="che-bien" element={<ManufacturePage />} />
          <Route path="kho" element={<StockManagementPage />} />
        </Route>

        {/* ================= USER ROUTES ================= */}
        <Route path="/" element={<UserLayout />}>
          <Route index element={<HomePage />} />
          <Route path="bang-tin" element={<FeedPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="uu-dai" element={<VoucherPage />} />
          <Route path="don-hang" element={<UserOrderPage />} />
          <Route path="payment-result" element={<PaymentResultPage />} />
          <Route path="dat-ban" element={<ReservationPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;