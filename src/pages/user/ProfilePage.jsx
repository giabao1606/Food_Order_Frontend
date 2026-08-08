import React, { useState, useEffect, useContext, useRef } from 'react';
import { FaRegBell, FaEdit, FaCheckCircle, FaExclamationCircle, FaLock, FaTimes } from 'react-icons/fa';
import { FaRegUser } from "react-icons/fa6";
import axiosClient from '../../utils/axiosClient';
import { AuthContext } from '../../context/AuthContext';
import OtpVerificationModal from '../../components/user/OtpVerificationModal';
import axios from 'axios';

const ProfilePage = () => {
  const { user: globalUser, setUser: setGlobalUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  
  // Trạng thái Form & Dữ liệu user
  const [userData, setUserData] = useState(null); // ĐÃ THÊM ĐỂ LƯU DỮ LIỆU RANK
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', latitude: null, longitude: null, phoneVerified: false });
  const [countryCode, setCountryCode] = useState('+84');
  const countryCodeList = [
    { code: '+84', label: 'VN' },
    { code: '+1', label: 'US' },
    { code: '+44', label: 'UK' },
    { code: '+91', label: 'IN' },
    { code: '+81', label: 'JP' },
    { code: '+61', label: 'AU' },
  ]; 
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  // Trạng thái Popup OTP mới
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  const [tierPromotions, setTierPromotions] = useState([]);
  const [showPromotionsPopup, setShowPromotionsPopup] = useState(false);


  useEffect(() => {
    document.title = "Thông tin cá nhân";
    const controller = new AbortController();
    const fetchProfile = async () => {
      try {
        const data = await axiosClient.get('/users/profile', { signal: controller.signal });
        if (data.success) {
          setUserData(data.user); // Lưu lại dữ liệu để lấy total_spent và member_tier

          let displayPhone = data.user.phone || '';
          if (displayPhone.startsWith('+84')) {
              displayPhone = '0' + displayPhone.slice(3); 
          }
          setFormData({
            name: data.user.full_name || '',
            email: data.user.email || '',     
            phone: displayPhone || '',
            phoneVerified: data.user.is_phone_verified === 1,
            address: data.user.address || '',
            latitude: data.user.latitude || null,
            longitude: data.user.longitude || null
          });
          
          try {
              const promoRes = await axiosClient.get('/member-promotions/my-promotions', { signal: controller.signal });
              if (promoRes.success) {
                  setTierPromotions(promoRes.promotions || []);
              }
          } catch(e) {
              console.error("Lỗi lấy ưu đãi hạng:", e);
          }
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
          setMessage({ type: 'error', text: 'Không thể tải thông tin người dùng.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
    return () => controller.abort();
  }, []);

  const handleAddressChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, address: value }));
    if (typingTimeout) clearTimeout(typingTimeout);
    if (value.length > 2) {
      setTypingTimeout(setTimeout(async () => {
        try {
          const apiKey = import.meta.env.VITE_TRACKASIA_API_KEY
          const response = await axios.get('https://maps.track-asia.com/api/v1/autocomplete', {
            params: {
                text: value,
                key: apiKey,
                lang: 'vi',
                new_admin: 'true'
            }
          });
          const data = response.data;
          if (data && data.features) {
            setAddressSuggestions(data.features);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error("Lỗi lấy gợi ý địa chỉ:", error);
        }
      }, 500));
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectAddress = (feature) => {
    const [lng, lat] = feature.geometry.coordinates; 
    const selectedAddress = feature.properties.label || feature.properties.name;
    setFormData(prev => ({
      ...prev,
      address: selectedAddress,
      latitude: lat,
      longitude: lng
    }));
    setShowSuggestions(false);
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    const phoneInput = formData.phone.trim();
    
    if (phoneInput && !/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(phoneInput)) {
        setMessage({ type: 'error', text: 'Số điện thoại không hợp lệ.' });
        return; 
    }
    try {
      const data = await axiosClient.put('/users/profile', {
          full_name: formData.name, 
          phone: phoneInput, 
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude
      });      
      setMessage({ type: 'success', text: data.message });      
      if (phoneInput !== globalUser?.Phone && phoneInput !== globalUser?.phone) {
         setFormData(prev => ({...prev, phoneVerified: false}));
      }
      setGlobalUser(prev => ({
          ...prev, 
          full_name: formData.name, 
          Name: formData.name 
      }));
      
    } catch (error) {
       setMessage({ type: 'error', text: error.message || 'Cập nhật thất bại.' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu mới và xác nhận không khớp!' });
      return;
    }    
    if (passwordData.newPassword.length < 4) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 4 ký tự.' });
      return;
    }
    try {
      const data = await axiosClient.put('/user/password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });      
      setMessage({ type: 'success', text: data.message });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });       
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Đổi mật khẩu thất bại!' });
    }
  };

  const renderMembershipCard = () => {
    if (!userData) return null;
    
    // Lấy dữ liệu thật từ Backend trả về
    const currentTier = userData.member_tier || 'NONE'; 
    const totalSpent = Number(userData.total_spent) || 0;

    const tierInfo = {
        'NONE': { name: 'Thành viên mới', nextMiletone: 500000, nextTierName: 'ĐỒNG', color: 'from-gray-400 to-gray-500' },
        'BRONZE': { name: 'Hạng Đồng', nextMiletone: 1000000, nextTierName: 'BẠC', color: 'from-orange-600 to-amber-700' },
        'SILVER': { name: 'Hạng Bạc', nextMiletone: 3000000, nextTierName: 'VÀNG', color: 'from-gray-300 to-gray-400 text-gray-800' },
        'GOLD': { name: 'Hạng Vàng', nextMiletone: 10000000, nextTierName: 'KIM CƯƠNG', color: 'from-yellow-400 to-yellow-600 text-gray-900' },
        'DIAMOND': { name: 'Kim Cương', nextMiletone: 10000000, nextTierName: 'MAX', color: 'from-cyan-400 to-blue-600' }
    };

    const myTier = tierInfo[currentTier] || tierInfo['NONE'];
    const progressPercent = currentTier === 'DIAMOND' ? 100 : Math.min((totalSpent / myTier.nextMiletone) * 100, 100);
    const amountNeeded = currentTier === 'DIAMOND' ? 0 : myTier.nextMiletone - totalSpent;

    const renderPromoBenefits = (p) => {
        let benefits = [];
        if (p.discount_percent > 0) benefits.push(`Giảm ${p.discount_percent}%`);
        if (Number(p.discount_amount) > 0) benefits.push(`Giảm ${Number(p.discount_amount).toLocaleString()}đ`);
        if (p.free_shipping === 1) benefits.push(`Miễn phí vận chuyển`);
        if (p.gift_food_ids) benefits.push(`Tặng món VIP`);
        if (p.buy_qty && p.get_food_id) benefits.push(`Mua ${p.buy_qty} tặng 1`);
        if (p.reward_voucher_id) benefits.push(`Voucher độc quyền`);
        return benefits.length > 0 ? benefits.join(', ') : 'Quà tặng bí mật';
    };

    return (
        <div className={`mt-2 mb-8 w-full p-6 rounded-2xl shadow-lg bg-gradient-to-br ${myTier.color} text-white relative`}>
            {/* Hiệu ứng lấp lánh */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
            </div>
            
            <div className="flex justify-between items-center relative z-20">
                <div>
                    <p className="text-sm opacity-90 uppercase tracking-widest font-semibold mb-1">Thành Viên</p>
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-3xl font-black">{myTier.name}</h2>
                        <div className="relative" onMouseLeave={() => setShowPromotionsPopup(false)}>
                            <button 
                                onMouseEnter={() => setShowPromotionsPopup(true)} 
                                onClick={() => setShowPromotionsPopup(!showPromotionsPopup)}
                                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 backdrop-blur-sm"
                            >
                                🎁 Đặc Quyền
                            </button>
                            {showPromotionsPopup && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl p-4 text-gray-800 z-50 text-sm border border-gray-100 animate-in fade-in zoom-in duration-200">
                                    <h4 className="font-bold text-[#006a6a] border-b pb-2 mb-2">Đặc quyền {myTier.name}</h4>
                                    {tierPromotions.length > 0 ? (
                                        <ul className="space-y-2">
                                            {tierPromotions.map((p, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="text-[#006a6a] mt-0.5">✨</span>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-800 leading-tight">{p.name}</span>
                                                        <span className="text-[11px] text-[#F25C05] font-medium mt-0.5 tracking-tight uppercase">🎁 {renderPromoBenefits(p)}</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-500 italic">Chưa có quà tặng cho hạng này.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm opacity-90 mb-1">Tổng chi tiêu</p>
                    <p className="text-xl font-bold">{totalSpent.toLocaleString()}đ</p>
                </div>
            </div>

            {currentTier !== 'DIAMOND' && (
                <div className="mt-6 relative z-10">
                    <div className="flex justify-between text-xs font-semibold mb-2">
                        <span>Tiến trình lên {myTier.nextTierName}</span>
                        <span>Cần thêm {Math.max(0, amountNeeded).toLocaleString()}đ</span>
                    </div>
                    {/* Thanh Progress */}
                    <div className="w-full bg-black/20 rounded-full h-2.5 backdrop-blur-sm">
                        <div className="bg-white h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-[#F25C05] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full max-w-7xl mx-auto relative">
      
      {/* 1. Cột Sidebar */}
      <div className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-fit">
        <h2 className="text-lg font-bold mb-4 px-4">Cài đặt</h2>
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'profile' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FaRegUser size={18} className={activeTab === 'profile' ? 'text-orange-500' : 'text-gray-400'} />
            Thông tin cá nhân
          </button>
          
          <button 
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'password' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FaLock size={18} className={activeTab === 'password' ? 'text-orange-500' : 'text-gray-400'} />
            Mật khẩu
          </button>
        </nav>
      </div>
      
      {/* 2. Cột Nội dung Form */}
      <div className="flex-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        {activeTab === 'profile' && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold mb-4">Thông tin cá nhân</h1>
            
            {/* GỌI GIAO DIỆN THẺ THÀNH VIÊN VÀO ĐÂY */}
            {renderMembershipCard()}

            {message.text && (
              <div className={`p-4 mb-6 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />} {message.text}
              </div>
            )}

            <form onSubmit={handleUpdateInfo}>  
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Tên khách hàng</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="VD: Jane Doe"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:border-[#F25C05] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Email</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg outline-none text-gray-500 text-sm"
                    />
                    <FaLock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                   <label className="block text-sm font-semibold mb-2">Số điện thoại</label>
                   <div id="recaptcha-container"></div>
                   
                   <div className="flex flex-col sm:flex-row gap-4">
                       <div className="flex-1 flex border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#F25C05] transition">
                           <select value={countryCode} onChange={e => setCountryCode(e.target.value)} className="px-3 bg-gray-50 border-r outline-none text-sm font-medium text-gray-600">
                              {countryCodeList.map(item => <option key={item.code} value={item.code}>{item.code} ({item.label})</option>)}
                           </select>
                           <input 
                              type="text" 
                              value={formData.phone}
                              onChange={e => setFormData({...formData, phone: e.target.value, phoneVerified: false})}
                              className="flex-1 px-4 py-2.5 outline-none text-sm" 
                           />
                       </div>
                       
                       {!formData.phoneVerified && (
                           <button type="button" onClick={() => setShowOtpInput(true)} className="px-6 py-2.5 text-[#F25C05] border border-[#65DDDD] hover:bg-teal-50 rounded-lg font-semibold text-sm whitespace-nowrap transition">
                              Xác thực điện thoại
                           </button>
                       )}
                   </div>
                   
                   {formData.phoneVerified 
                     ? <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><FaCheckCircle/> Đã xác thực</p>
                     : <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><FaExclamationCircle/> Chưa xác thực</p>
                   }
              </div>

              <div className="mb-8 relative">
                <label className="block text-sm font-semibold mb-2">Địa chỉ giao hàng</label>
                <textarea 
                  value={formData.address}
                  onChange={handleAddressChange} 
                  rows="3"
                  placeholder="Nhập địa chỉ của bạn (VD: 123 Lê Lợi, Quận 1...)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-[#F25C05] text-sm resize-none transition-all"
                ></textarea>
                {showSuggestions && addressSuggestions.length > 0 && (
                  <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {addressSuggestions.map((feature, index) => (
                      <li 
                        key={index}
                        onClick={() => handleSelectAddress(feature)}
                        className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-0 text-sm text-gray-700 transition-colors"
                      >
                        {feature.properties.label || feature.properties.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                  <button type="button" className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm">Hủy</button>
                  <button type="submit" className="px-6 py-2.5 bg-[#65DDDD] hover:bg-teal-600 text-white font-semibold rounded-lg shadow-sm transition text-sm">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        )}
        
        {activeTab === 'password' && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold mb-8">Đổi mật khẩu</h1>
            
            {message.text && (
              <div className={`p-4 mb-6 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />} {message.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="max-w-md">
              <div className="mb-5">
                <label className="block text-sm font-semibold mb-2">Mật khẩu hiện tại</label>
                <input 
                  type="password" 
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                  required
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:border-[#F25C05] text-sm"
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-semibold mb-2">Mật khẩu mới</label>
                <input 
                  type="password" 
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  required
                  placeholder="Nhập mật khẩu mới"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:border-[#F25C05] text-sm"
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold mb-2">Xác nhận mật khẩu mới</label>
                <input 
                  type="password" 
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:border-[#F25C05] text-sm"
                />
              </div>

              <button 
                type="submit" 
                className="w-full px-6 py-3 bg-[#65DDDD] hover:bg-teal-500 text-white font-bold rounded-lg shadow-sm transition"
              >
                Cập nhật mật khẩu
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Popup OTP */}
      {showOtpInput && (
        <OtpVerificationModal 
            initialPhone={formData.phone}
            onCancel={() => setShowOtpInput(false)}
            onSuccess={(verifiedPhone) => {
                setFormData(prev => ({...prev, phone: verifiedPhone, phoneVerified: true}));
                setShowOtpInput(false); 
                setMessage({ type: 'success', text: 'Xác thực số điện thoại thành công!' });
            }}
        />
      )}

    </div>
  );
};

export default ProfilePage;