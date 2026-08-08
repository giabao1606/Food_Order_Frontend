import React, { useState, useRef, useEffect } from 'react';
import { FaShoppingCart, FaUserCircle, FaSearch, FaUser, FaTicketAlt, FaSignOutAlt, FaSignInAlt, FaUserPlus, FaBell, FaCircle } from 'react-icons/fa';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../utils/axiosClient';
import { io } from 'socket.io-client';

const Header = ({ onOpenAuth, onOpenCart }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false); 
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [userData, setUserData] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [searchParams] = useSearchParams();
  const initialSearchTerm = searchParams.get('search') || '';
  const [localSearchTerm, setLocalSearchTerm] = useState(initialSearchTerm);
  
  const menuRef = useRef(null);
  const notifRef = useRef(null); 
  const location = useLocation(); 
  const navigate = useNavigate();

  const fetchCartCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setCartCount(0);
        return;
      }
      const res = await axiosClient.get(`/cart/count`); 
      const data = res.data || res;
      if (data.success || data.count !== undefined) {
        setCartCount(data.count || 0);
      }
    } catch (error) {
      console.error("Lỗi lấy số lượng giỏ hàng:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axiosClient.get('/notifications');
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => n.is_read === 0).length);
      }
    } catch (error) {
      console.error("Lỗi lấy thông báo:", error);
    }
  };

  const handleOpenNotifications = async () => {
    setIsNotifOpen(!isNotifOpen);
    setIsMenuOpen(false); 

    if (!isNotifOpen && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 }))); 
      try {
        await axiosClient.put('/notifications/read');
      } catch (error) {
        console.error("Lỗi đánh dấu đã đọc:", error);
      }
    }
  };
  
  const handleSearchChange = (e) => {
    setLocalSearchTerm(e.target.value);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Lấy từ khóa hiện tại đang có trên thanh URL
      const currentUrlSearch = searchParams.get('search') || '';
      
      // Bức tường lửa: Chỉ cho phép chuyển hướng (navigate) nếu ô input thực sự khác biệt so với URL
      if (localSearchTerm !== currentUrlSearch) {
        if (localSearchTerm.trim()) {
          navigate(`/?search=${encodeURIComponent(localSearchTerm)}`);
        } else if (localSearchTerm === '' && searchParams.has('search')) {
          navigate(`/`);
        }
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [localSearchTerm, navigate, searchParams]);

  // Đồng bộ ngược: Nếu người dùng back trang hoặc URL thay đổi từ nơi khác, cập nhật lại ô input
  useEffect(() => {
    const currentUrlSearch = searchParams.get('search') || '';
    if (localSearchTerm !== currentUrlSearch) {
      setLocalSearchTerm(currentUrlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleNotificationClick = (notif) => {
      setIsNotifOpen(false);      
      const notifType = notif.type ? notif.type.toUpperCase() : '';
      if (notifType === 'COMPLAINT' || notifType === 'ORDER') {
          navigate(`/don-hang?id=${notif.target_id}`);
      } else if (notifType === 'VOUCHER') {
          navigate('/uu-dai');
      }
  };

  const checkAuth = () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      setIsLoggedIn(true);
      setUserData(JSON.parse(user));
    } else {
      setIsLoggedIn(false);
      setUserData(null);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const handleExitReservationMode = () => {
        localStorage.removeItem('pendingReservation');
        window.dispatchEvent(new Event("cartUpdated"));
        window.location.reload(); 
    };

  useEffect(() => {
    checkAuth();
    fetchCartCount(); 

    let socket;
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
        const user = JSON.parse(userStr);
        fetchNotifications();
        
        socket = io(import.meta.env.VITE_API_URL || 'https://food-order-backend-myjy.onrender.com');
        socket.emit('join_user_room', user.id);

        socket.on('new_notification', (notif) => {
            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(prev => prev + 1);
            window.dispatchEvent(new Event("orderUpdated")); 
        });
    }

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifOpen(false);
    };

    const handleAuthChange = () => {
        checkAuth();
        fetchCartCount();
        if (localStorage.getItem("token")) {
            fetchNotifications();
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener("authChange", handleAuthChange);
    window.addEventListener("cartUpdated", fetchCartCount); 

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener("authChange", handleAuthChange);
      window.removeEventListener("cartUpdated", fetchCartCount);
      if (socket) socket.disconnect(); 
    };
  }, []);

  const navLinks = [
    { path: '/', label: 'Trang chủ' },
    { path: '/uu-dai', label: 'Ưu đãi' },
    { path: '/bang-tin', label: 'Bảng tin' },
    { path: '/don-hang', label: 'Đơn hàng' },
    { path: '/dat-ban', label: 'Đặt bàn' },
  ];

  const handleLogout = () => {
    const xacNhan = window.confirm("Bạn có chắc chắn muốn đăng xuất không?");
    if (xacNhan){
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("authChange")); 
      setIsLoggedIn(false);
      setUserData(null);
      setIsMenuOpen(false);
      alert("Đăng xuất thành công!");
      window.location.href = '/';
    }     
  };

  return (
    <header className="sticky top-0 z-50 bg-[#65DDDD] shadow-md h-20 flex items-center w-full">
      {localStorage.getItem('pendingReservation') && (
          <div className="h-full bg-gradient-to-r from-orange-600 to-amber-600 text-white px-3 md:px-4 flex items-center gap-3 shrink-0 z-10 shadow-[4px_0_10px_rgba(0,0,0,0.15)]">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                  <span className="text-xl">🍽️</span>
                  <span className="hidden lg:block leading-tight">
                      Đang chọn món cho <br/> <b>Bàn đặt trước</b>
                  </span>
              </div>
              <button 
                  onClick={handleExitReservationMode}
                  className="bg-white text-orange-700 hover:bg-orange-50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all transform active:scale-95 shadow-sm whitespace-nowrap"
              >
                  Thoát chế độ
              </button>
          </div>
      )}

      {/* MENU CHÍNH*/}
      <div className="flex-grow max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-6">
        
        {/* Logo Thương hiệu */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="text-4xl text-red-600">🥢</div>
          <span className="text-xl font-black text-black leading-tight uppercase">
            Golden <br/> Chopsticks
          </span>
        </Link>

        {/* Thanh tìm kiếm */}
        <div className="flex-grow max-w-md relative hidden md:block">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            <FaSearch size={16} />
          </div>
          <input 
            type="text" 
            placeholder="Tìm kiếm món ăn"
            value={localSearchTerm}
            onChange={handleSearchChange} 
            className="w-full py-2.5 pl-10 pr-5 rounded-md text-sm bg-gray-100/90 text-gray-800 focus:outline-none focus:bg-white shadow-inner"
          />
        </div>

        {/* Các link điều hướng */}
       <nav className="hidden lg:flex items-center gap-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const protectedPaths = ['/uu-dai', '/don-hang']; 
            const handleLinkClick = (e) => {
                if (protectedPaths.includes(link.path) && !isLoggedIn) {
                    e.preventDefault();
                    alert("Vui lòng đăng nhập để sử dụng tính năng này!");
                    onOpenAuth('login'); // Bật modal đăng nhập lên
                }
            };
            return (
              <Link 
                key={link.path}
                to={link.path} 
                onClick={handleLinkClick}
                className={`px-4 py-2 font-bold rounded-md transition-all ${
                  isActive 
                    ? 'bg-[#4CD361] text-black shadow-sm' 
                    : 'text-black hover:bg-white/30'      
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Icons: Giỏ hàng, Thông báo & Tài khoản */}
        <div className="flex items-center gap-4 shrink-0 text-black">
          
          <button 
            onClick={onOpenCart}
            className="relative p-2 hover:bg-white/20 rounded-full transition cursor-pointer">
            <FaShoppingCart size={22} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ">
              {cartCount}
            </span>
          </button>

          <div className="relative" ref={notifRef}>
            <button 
                onClick={handleOpenNotifications}
                className="relative p-2 hover:bg-white/20 rounded-full transition cursor-pointer"
            >
              <FaBell size={22} />
              {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
              )}
            </button>

            {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-black text-gray-800">Thông báo của bạn</h3>
                    </div>
                    
                    <div className="max-h-[350px] overflow-y-auto hide-scrollbar">
                        {notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3 items-start ${notif.is_read === 0 ? 'bg-blue-50/30' : ''}`}
                                >
                                    <div className="mt-1 shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-[#006a6a]">
                                            <FaBell size={12} />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-sm whitespace-normal break-words ${notif.is_read === 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                                            {notif.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1 whitespace-normal break-words leading-relaxed">
                                            {notif.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-2">
                                            {new Date(notif.created_at).toLocaleString('vi-VN')}
                                        </p>
                                    </div>
                                    {notif.is_read === 0 && <FaCircle size={8} className="text-blue-500 mt-2 shrink-0" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                Bạn chưa có thông báo nào.
                            </div>
                        )}
                    </div>
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
                        <Link to="/don-hang" onClick={() => setIsNotifOpen(false)} className="text-xs font-bold text-[#006a6a] hover:underline">
                            Xem tất cả đơn hàng
                        </Link>
                    </div>
                </div>
            )}
          </div>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 hover:bg-white/20 rounded-full transition cursor-pointer"
            >
              <FaUserCircle size={28} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
                {!isLoggedIn ? (
                  <>
                    <button 
                      onClick={() => { onOpenAuth('login'); setIsMenuOpen(false); }} 
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-300 transition font-medium cursor-pointer"
                    >
                      <FaSignInAlt className="text-gray-400" /> Đăng nhập
                    </button>
                    <button 
                      onClick={() => { onOpenAuth('register'); setIsMenuOpen(false); }} 
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-300 transition font-medium cursor-pointer"
                    >
                      <FaUserPlus className="text-gray-400" /> Đăng ký
                    </button>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-3 bg-gray-50 mb-1 border-b border-gray-100">
                      <p className="text-xs text-gray-500 break-all">{userData?.name || userData?.email}</p>
                    </div>
                    <button 
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-200 transition font-medium cursor-pointer">
                        <Link to="/profile" className="flex items-center gap-3 w-full">
                          <FaUser className="text-gray-400" /> Thông tin cá nhân
                        </Link>
                    </button>
                    <button 
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-200 transition font-medium cursor-pointer">
                        <Link to="/uu-dai" className="flex items-center gap-3 w-full">
                          <FaTicketAlt className="text-gray-400" /> Voucher
                        </Link>
                    </button>
                    <div className="border-t my-1"></div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-200 transition font-bold cursor-pointer"
                    >
                      <FaSignOutAlt /> Đăng xuất 
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};

export default Header;