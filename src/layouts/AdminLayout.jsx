import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axiosClient from '../utils/axiosClient';
import { 
  MdOutlineDashboard, MdOutlineRestaurantMenu, MdOutlineCategory, 
  MdOutlineReceipt, MdOutlinePeople, MdOutlineImage, 
  MdOutlineLocalOffer, MdOutlineWarning, MdHome, MdLogout,
  MdKitchen, MdInventory, MdMilitaryTech, MdBusiness, MdAddCircle, MdSmartToy, MdGavel,
  MdCampaign, MdInsertChartOutlined, MdCalendarToday, MdRecommend
} from "react-icons/md";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Lấy thông tin user từ LocalStorage để phân menu
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};
  const role = user.role ? user.role.toUpperCase() : '';

  // 1. MENU CHO ADMIN (Quản trị toàn hệ thống)
  const adminMenu = [
    { path: '/admin', icon: <MdOutlineDashboard size={20} />, label: 'Thống kê tổng quát' },
    { path: '/admin/chi-nhanh', icon: <MdBusiness size={20} />, label: 'Quản lý chi nhánh' },
    { path: '/admin/mon-an', icon: <MdOutlineRestaurantMenu size={20} />, label: 'Quản lý món ăn' },
    { path: '/admin/topping', icon: <MdAddCircle size={20} />, label: 'Quản lý topping' },
    { path: '/admin/danh-muc', icon: <MdOutlineCategory size={20} />, label: 'Quản lý danh mục' },
    { path: '/admin/nguyen-lieu', icon: <MdKitchen size={20} />, label: 'Quản lý nguyên liệu' },
    { path: '/admin/tai-khoan', icon: <MdOutlinePeople size={20} />, label: 'Quản lý tài khoản' },
    { path: '/admin/banner', icon: <MdOutlineImage size={20} />, label: 'Quản lý Banner' },
    { path: '/admin/vouchers', icon: <MdOutlineLocalOffer size={20} />, label: 'Quản lý vouchers' },    
    { path: '/admin/bac-hang', icon: <MdMilitaryTech size={20} />, label: 'Quản lý bậc thăng hạng' },
    { path: '/admin/bang-tin', icon: <MdOutlineImage size={20} />, label: 'Quản lý Bảng tin' },
    { path: '/admin/kiem-duyet', icon: <MdGavel size={20} />, label: 'Kiểm duyệt AI', badgeKey: 'moderation' },
    { path: '/admin/ai-management', icon: <MdSmartToy size={20} />, label: 'Quản lý Trợ lý AI' },
    
    { isHeader: true, label: 'Trung tâm chiến dịch' },
    { path: '/admin/campaigns/dashboard', icon: <MdOutlineDashboard size={20} />, label: 'Thống kê chiến dịch' },
    { path: '/admin/campaigns', icon: <MdCampaign size={20} />, label: 'Quản lý chiến dịch' },
    { path: '/admin/campaigns/calendar', icon: <MdCalendarToday size={20} />, label: 'Lịch chiến dịch' },
    { path: '/admin/campaigns/reports', icon: <MdInsertChartOutlined size={20} />, label: 'Báo cáo hiệu quả' },
    { path: '/admin/campaigns/insight', icon: <MdSmartToy size={20} />, label: 'AI đánh giá' },
    { path: '/admin/campaigns/proposals', icon: <MdRecommend size={20} />, label: 'Đề xuất chiến dịch' }
  ];

  // 2. MENU CHO MANAGER (Quản lý chi nhánh)
  const managerMenu = [
    { path: '/manager/dashboard', icon: <MdOutlineDashboard size={20} />, label: 'Thống kê doanh thu chi nhánh' },
    { path: '/manager/don-hang', icon: <MdOutlineReceipt size={20} />, label: 'Lịch sử đơn hàng chi nhánh' },
    { path: '/manager/khieu-nai', icon: <MdOutlineWarning size={20} />, label: 'Xử lý Khiếu nại' },
    { path: '/manager/kho', icon: <MdInventory size={20} />, label: 'Quản lý Tồn kho' },
    { path: '/manager/thuc-don', icon: <MdOutlineRestaurantMenu size={20} />, label: 'Trạng thái món' },
    
    { isHeader: true, label: 'MARKETING' },
    { path: '/manager/campaigns', icon: <MdCampaign size={20} />, label: 'Chiến dịch chi nhánh' }
  ];

  // 3. MENU CHO STAFF (Nhân viên / Bếp)
  const staffMenu = [
    { path: '/staff/don-hang', icon: <MdOutlineReceipt size={20} />, label: 'Tiếp nhận đơn hàng' },
    { path: '/staff/thuc-don', icon: <MdOutlineRestaurantMenu size={20} />, label: 'Cập nhật món nhanh' },
    { path: '/staff/che-bien', icon: <MdKitchen size={20} />, label: 'Quản lý chế biến' },
    { path: '/staff/kho', icon: <MdInventory size={20} />, label: 'Quản lý kho' },
  ];  
  let activeMenu = [];
  let roleTitle = '';
  if (role === 'ADMIN') { activeMenu = adminMenu; roleTitle = 'Admin'; }
  else if (role === 'MANAGER') { activeMenu = managerMenu; roleTitle = 'Quản lý chi nhánh'; }
  else if (role === 'STAFF') { activeMenu = staffMenu; roleTitle = 'Nhân viên'; }
  
  const [badges, setBadges] = useState({});
  useEffect(() => {
    if (role === 'ADMIN') {
      axiosClient.get('/admin/feed/escalations?status=PENDING')
        .then(res => { if (res.success) setBadges({ moderation: res.pending_count || 0 }); })
        .catch(() => {});
    }
  }, [role]);
  
  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedBranchId');
      navigate('/');
      window.location.reload(); 
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      
      {/* ================= SIDEBAR ================= */}
      <aside className="w-[260px] bg-white border-r border-gray-100 flex flex-col h-full shrink-0">
        <div className="p-7 flex items-center gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-xl leading-none">{roleTitle}</h3>
            <p className="text-sm text-gray-500 mt-1">{user.name || 'System User'}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto hide-scrollbar space-y-1">
          {(() => {
            // Find the most specific active item to avoid multiple highlights
            const activeMatch = activeMenu
              .filter(m => !m.isHeader)
              .filter(m => {
                const isDashboard = m.path === '/admin' || m.path === '/staff';
                return isDashboard 
                  ? location.pathname === m.path 
                  : location.pathname === m.path || location.pathname.startsWith(m.path + '/');
              })
              .sort((a, b) => b.path.length - a.path.length)[0];

            return activeMenu.map((item, index) => {
              if (item.isHeader) {
                return (
                  <div key={`header-${index}`} className="px-4 pt-4 pb-2 text-[10px] font-black text-gray-400 tracking-wider">
                    {item.label}
                  </div>
                );
              }

              const isActive = activeMatch && activeMatch.path === item.path;
              return (
              <Link
                key={item.path}
                to={item.path}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all relative ${
                  isActive
                    ? 'bg-[#65DDDD]/10 text-[#65DDDD]' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
                {item.badgeKey && badges[item.badgeKey] > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badges[item.badgeKey] > 9 ? '9+' : badges[item.badgeKey]}
                  </span>
                )}
              </Link>
            );
            });
          })()}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer">
            <MdLogout size={20} /> Đăng xuất
          </button>
          <Link to="/" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all">
            <MdHome size={20} /> Thoát về trang chủ
          </Link>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet /> 
      </main>
      
    </div>
  );
};

export default AdminLayout;