import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaMoneyBillWave, FaCreditCard, FaTicketAlt, FaMapMarkerAlt, FaSearch, FaStore, FaClock, FaUsers, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import axiosClient from '../../utils/axiosClient';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();   
  const isFastTrackReservation = location.state?.isFastTrackReservation || false;

  const [cartItems, setCartItems] = useState([]);
  const [userData, setUserData] = useState(null);
  
  const [orderType, setOrderType] = useState(() => {
      if (location.state?.orderType) return location.state.orderType;
      if (localStorage.getItem('pendingReservation')) return 'DINE_IN';
      return 'DELIVERY';
  });
  const [reservationTime, setReservationTime] = useState(location.state?.reservationTime || '');
  const [guestCount, setGuestCount] = useState(location.state?.guestCount || 2);
  const [shippingInfo, setShippingInfo] = useState({ fullName: '', phone: '', note: '' });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationError, setLocationError] = useState('');
  
  const [selectedLocation, setSelectedLocation] = useState({
      address: '', lat: null, lng: null, distance_km: null, branch_id: location.state?.branch_id || null, branch_name: '', duration_mins: null
  });

  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [myVouchers, setMyVouchers] = useState([]);
  
  const [shippingFee, setShippingFee] = useState(0); 
  const [paymentMethod, setPaymentMethod] = useState(isFastTrackReservation ? 'VNPAY_DEPOSIT' : 'COD');
  
  const searchTimeoutRef = useRef(null);
  const TRACKASIA_API_KEY = import.meta.env.VITE_TRACKASIA_API_KEY;

  const calculateDistance = async (lat, lng, fullAddress) => {
    try {
      const currentBranchId = localStorage.getItem('selectedBranchId') || 1;
      const res = await axiosClient.post('/shipping/check-distance', { lat, lng, branch_id: Number(currentBranchId) });
      if (res.distance > 10) {
        setLocationError("Rất tiếc, địa chỉ nhận hàng của bạn hiện nằm ngoài bán kính phục vụ (10km).");
        setSelectedLocation({ address: '', lat: null, lng: null, distance_km: null, branch_id: null, branch_name: '', duration_mins: res.duration_mins });
        setShippingFee(0);
      } else {
        setSelectedLocation({ address: fullAddress, lat, lng, distance_km: res.distance, branch_id: res.branch_id, branch_name: res.branch_name || 'Chi nhánh hệ thống',duration_mins: res.duration_mins });
        setShippingFee(res.fee || 15000);
        setLocationError('');
      }
    } catch (error) {
        setSelectedLocation({ address: fullAddress, lat, lng, distance_km: 2.5, branch_id: 1, branch_name: 'Chi nhánh mặc định',duration_mins: 10 });
        setShippingFee(15000);
        setLocationError('');
    }
  };

  const [autoPromotions, setAutoPromotions] = useState([]);
  const [tiers, setTiers] = useState([]);
  
  useEffect(() => {
    const controller = new AbortController();
    const fetchAutoPromotions = async () => {
        try {
            const currentBranchId = localStorage.getItem('selectedBranchId') || 1;
            const [memberRes, campaignRes, tierRes] = await Promise.all([
                axiosClient.get('/member-promotions/my-promotions', { signal: controller.signal }),
                axiosClient.get(`/campaigns/active-auto-promotions?branch_id=${currentBranchId}`, { signal: controller.signal }),
                axiosClient.get('/membership-tiers', { signal: controller.signal })
            ]);
            if (tierRes.success) setTiers(tierRes.data || []);
            let combined = [];
            if (memberRes.success && memberRes.promotions) combined = [...memberRes.promotions];
            if (campaignRes.success && campaignRes.data) {
                // Map campaign structure to match promotion structure for UI
                const campPromos = campaignRes.data.map(c => ({
                    id: `camp_${c.id}`,
                    name: c.name,
                    discount_percent: c.discount_percent || 0,
                    discount_amount: c.discount_amount || 0,
                    free_shipping: 0,
                    gift_food_ids: c.gift_food_ids,
                    buy_qty: c.buy_qty,
                    get_food_id: c.get_food_id,
                    min_tier: c.min_tier
                }));
                combined = [...combined, ...campPromos];
            }
            setAutoPromotions(combined);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi tải ưu đãi tự động:", error);
        }
    };
    fetchAutoPromotions();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.title = "Thanh toán đơn hàng";
    const userLocal = JSON.parse(localStorage.getItem('user'));
    
    if (!userLocal) {
      alert("Vui lòng đăng nhập để thanh toán!");
      navigate('/');
      return;
    }
    let displayPhone = userLocal.Phone || userLocal.phone || '';
    if (displayPhone.startsWith('+84')) displayPhone = '0' + displayPhone.slice(3); 
    setUserData(userLocal);    

    const pendingReservationStr = localStorage.getItem('pendingReservation');
    
    const initializeCheckout = async (signal) => {
        try {
            const cartData = await axiosClient.get('/cart/items', { signal });
            const items = cartData.items || [];
            setCartItems(items);

            if (location.state?.aiOrder) {
                const aiData = location.state.aiOrder;
                setOrderType(aiData.order_type || 'DELIVERY');
                setPaymentMethod(aiData.order_type === 'DINE_IN' ? 'VNPAY_DEPOSIT' : 'COD');
                setShippingFee(aiData.order_type === 'DELIVERY' ? 15000 : 0);
                setShippingInfo(prev => ({ 
                    ...prev, 
                    fullName: aiData.customer_name || userLocal.Name || userLocal.full_name || '', 
                    phone: aiData.phone || displayPhone,
                    note: aiData.note || ''
                }));
                if (aiData.address && aiData.order_type === 'DELIVERY') {
                    setSearchQuery(aiData.address);
                    try {
                        const apiKey = import.meta.env.VITE_TRACKASIA_API_KEY;
                        const res = await axios.get(`https://maps.track-asia.com/api/v1/autocomplete`, { params: { text: aiData.address, key: apiKey, lang: 'vi', new_admin: 'true' } });
                        if (res.data && res.data.features && res.data.features.length > 0) {
                            const first = res.data.features[0];
                            const [lng, lat] = first.geometry.coordinates;
                            await calculateDistance(lat, lng, first.properties.label);
                            setSearchQuery(first.properties.label);
                        }
                    } catch (e) { console.error('Lỗi tính phí tự động từ AI:', e); }
                } else if (aiData.address) {
                    setSearchQuery(aiData.address);
                }
                const resTime = aiData.date_time || aiData.reservation_time;
                if (resTime) {
                    setReservationTime(resTime);
                    setGuestCount(aiData.guests || 2);
                }
                if (aiData.order_type !== 'DELIVERY') {
                    try {
                        const branchRes = await axiosClient.get('/branches', { signal });
                        const branches = branchRes.data?.data || branchRes.data || branchRes;
                        if (Array.isArray(branches)) {
                            const target = branches.find(b => Number(b.id) === Number(aiData.branch_id || 1));
                            if (target) {
                                setSelectedLocation({
                                    address: target.address, lat: null, lng: null, distance_km: null, branch_id: target.id, branch_name: target.name || target.Name, duration_mins: null
                                });
                            }
                        }
                    } catch (bErr) { if (bErr.name !== 'CanceledError' && bErr.code !== 'ERR_CANCELED') console.error("Lỗi tải thông tin chi nhánh đặt bàn:", bErr); }
                }
                
            } else if (isFastTrackReservation) {
                setOrderType('DINE_IN');
                setPaymentMethod('VNPAY_DEPOSIT'); 
                setShippingInfo(prev => ({ ...prev, fullName: userLocal.Name || userLocal.full_name || '', phone: displayPhone }));
                setShippingFee(0);

                try {
                    const branchRes = await axiosClient.get('/branches', { signal });
                    const branches = branchRes.data?.data || branchRes.data || branchRes;
                    if (Array.isArray(branches)) {
                        const target = branches.find(b => Number(b.id) === Number(location.state.branch_id));
                        if (target) {
                            setSelectedLocation({
                                address: target.address || 'Tại cửa hàng', lat: null, lng: null, distance_km: null, branch_id: target.id, branch_name: target.name || target.Name, duration_mins: null
                            });
                        }
                    }
                } catch (bErr) { if (bErr.name !== 'CanceledError' && bErr.code !== 'ERR_CANCELED') console.error("Lỗi tải thông tin chi nhánh đặt bàn:", bErr); }
            } else if (pendingReservationStr) {
                const pendingData = JSON.parse(pendingReservationStr);
                setOrderType('DINE_IN');
                setPaymentMethod('VNPAY_DEPOSIT'); 
                setReservationTime(pendingData.reservation_time);
                setGuestCount(pendingData.guest_count);
                setShippingInfo(prev => ({ ...prev, fullName: userLocal.Name || userLocal.full_name || '', phone: displayPhone, note: pendingData.note || '' }));
                setShippingFee(0);

                try {
                    const branchRes = await axiosClient.get('/branches', { signal });
                    const branches = branchRes.data?.data || branchRes.data || branchRes;
                    if (Array.isArray(branches)) {
                        const target = branches.find(b => Number(b.id) === Number(pendingData.branch_id));
                        if (target) {
                            setSelectedLocation({
                                address: target.address || 'Tại cửa hàng', lat: null, lng: null, distance_km: null, branch_id: target.id, branch_name: target.name || target.Name, duration_mins: null
                            });
                        }
                    }
                } catch (bErr) { if (bErr.name !== 'CanceledError' && bErr.code !== 'ERR_CANCELED') console.error("Lỗi tải thông tin chi nhánh đặt bàn:", bErr); }
            } else {
                setOrderType('DELIVERY');
                setPaymentMethod('COD');
                setShippingInfo(prev => ({ ...prev, fullName: userLocal.Name || userLocal.full_name || '', phone: displayPhone }));
                
                const profileRes = await axiosClient.get('/users/profile', { signal });
                const activeUser = profileRes.user || profileRes.data?.user || profileRes;
                
                if (activeUser) {
                    const freshAddress = activeUser.address || activeUser.Address;
                    if (freshAddress) {
                        setSearchQuery(freshAddress);
                        const lat = activeUser.latitude || activeUser.Latitude;
                        const lng = activeUser.longitude || activeUser.Longitude;
                        if (lat && lng && items.length > 0) {
                            await calculateDistance(lat, lng, freshAddress);
                        }

                    }
                }
            }
        } catch (error) { if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') console.error("Lỗi khởi tạo dữ liệu đơn hàng:", error); }
    };
    
    const controller = new AbortController();
    const sig = controller.signal;
    initializeCheckout(sig);
    
    const handleCartUpdate = () => {
        initializeCheckout();
    };
    window.addEventListener("cartUpdated", handleCartUpdate);
    
    return () => { 
        controller.abort(); 
        window.removeEventListener("cartUpdated", handleCartUpdate);
    };
  }, [navigate, isFastTrackReservation]);

  const handleSearchAddress = (e) => {
    const text = e.target.value;
    setSearchQuery(text);
    setLocationError('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (text.length < 3) { setSuggestions([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`https://maps.track-asia.com/api/v1/autocomplete`, { params: { text: text, key: TRACKASIA_API_KEY, lang: 'vi', new_admin: 'true' } });
        setSuggestions(res.data.features || []);
      } catch (error) { console.error('Lỗi phân tích địa chỉ:', error); } finally { setIsSearching(false); }
    }, 500);
  };
  
  const handleSelectLocation = async (feature) => {
    const fullAddress = feature.properties.label;
    const [lng, lat] = feature.geometry.coordinates;
    setSearchQuery(fullAddress);
    setSuggestions([]);
    setLocationError('');
    setShippingFee(0);
    await calculateDistance(lat, lng, fullAddress);
  };

  const subtotal = cartItems.reduce((acc, item) => {
      let optPrice = 0;
      let finalOptions = [];
      try {
          let parsed = item.topping_notes;
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
          finalOptions = (parsed && parsed.options) ? parsed.options : (item.options || []);
          finalOptions.forEach(opt => { optPrice += (Number(opt.price || 0) * Number(opt.quantity || 1)); });
      } catch (e) {}
      
      const basePrice = Number(item.base_price || item.unit_price || item.price || 0);
      const itemTotal = (basePrice + optPrice) * (item.quantity || 1);
      item.safeTotal = itemTotal; 
      item.safeOptions = finalOptions; 
      return acc + itemTotal;
  }, 0);

  // =========================================================================
  // HOÀN THIỆN: TÍNH TOÁN CÁC ĐẶC QUYỀN TỰ ĐỘNG TỪ BẬC HẠNG
  // =========================================================================
  const totalQuantity = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  let autoDiscountPercent = 0;
  let autoDiscountAmount = 0;
  let isAutoFreeship = false;
  let giftMessages = [];

  const userLocal = JSON.parse(localStorage.getItem('user'));
  const userTierStr = userLocal?.member_tier || 'NONE';

  autoPromotions.forEach(p => {
      // Check tier requirement
      if (p.min_tier) {
          const uTierObj = tiers.find(t => t.tier === userTierStr);
          const reqTierObj = tiers.find(t => t.tier === p.min_tier);
          const uSpent = uTierObj ? Number(uTierObj.min_spent) : 0;
          const rSpent = reqTierObj ? Number(reqTierObj.min_spent) : 0;
          if (uSpent < rSpent) {
              giftMessages.push(`⚠️ ${p.name} (Chỉ dành cho hạng ${reqTierObj?.name || p.min_tier} trở lên)`);
              return;
          }
      }

      if (p.discount_percent > autoDiscountPercent) autoDiscountPercent = p.discount_percent;
      if (p.discount_amount) autoDiscountAmount += Number(p.discount_amount);
      if (p.free_shipping === 1) isAutoFreeship = true;
      if (p.gift_food_ids) giftMessages.push(`Tặng kèm ${p.gift_food_ids.split(',').length} món quà VIP`);
      if (p.buy_qty && totalQuantity >= p.buy_qty) giftMessages.push(`${p.name}`);
  });

  const totalAutoDiscount = (subtotal * autoDiscountPercent / 100) + autoDiscountAmount;
  const finalShippingFee = isAutoFreeship ? 0 : shippingFee; // Ép ship về 0 nếu có freeship

  // =========================================================================

  const handleOpenVoucherModal = async () => {
    setShowVoucherModal(true);
    try {
        const res = await axiosClient.get('/vouchers/my-vouchers');
        if (Array.isArray(res)) {
            setMyVouchers(res.filter(v => v.is_used === 0 || v.is_used === false));
        }
    } catch (error) { console.error("Lỗi lấy ví voucher:", error); }
  };

  const handleSelectVoucher = async (voucher) => {
    if (subtotal < Number(voucher.min_order_value)) {
        return alert(`Đơn hàng cần đạt tối thiểu ${Number(voucher.min_order_value).toLocaleString()}đ để dùng mã này!`);
    }

    try {
        const res = await axiosClient.post('/vouchers/apply', { code: voucher.code, total_order_value: subtotal, shipping_fee: finalShippingFee });
        if (res.success || res.voucher) {
            setAppliedVoucher(res.voucher);
            setDiscountAmount(res.discountValue || res.discount_amount);
            setShowVoucherModal(false);
        } else {
            alert(res.message || "Mã giảm giá không hợp lệ!");
        }
    } catch (error) {
        alert(error.response?.data?.message || "Lỗi khi áp dụng voucher.");
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setDiscountAmount(0);
  };

  // Cập nhật lại tổng tiền (Bao gồm cả trừ tiền Voucher nhập tay + Tiền ưu đãi Rank tự động)
  const depositAmount = orderType === 'DINE_IN' ? guestCount * 10000 : 0;
  const voucherDiscount =
    appliedVoucher?.discount_type === "FREE_SHIPPING"
        ? Math.min(finalShippingFee, discountAmount)
        : discountAmount;
  // PICKUP: không tính phí ship
  const effectiveShippingFee = orderType === 'PICKUP' ? 0 : finalShippingFee;
  const total = Math.max(0, subtotal + effectiveShippingFee - voucherDiscount - totalAutoDiscount) + depositAmount;  
  const amountToPayNow = (orderType === 'DINE_IN' && paymentMethod === 'VNPAY_DEPOSIT') ? depositAmount : total;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (orderType === 'DELIVERY' && (!selectedLocation.lat || locationError)) {
        alert('Vui lòng chọn một địa chỉ giao hàng hợp lệ trên bản đồ!'); return;
    }
    if (orderType === 'DINE_IN' && !reservationTime) {
        alert('Vui lòng chọn thời gian đặt bàn!'); return;
    }
    if (orderType === 'PICKUP' && !selectedLocation.branch_id) {
        alert('Vui lòng chọn chi nhánh để nhận tại quầy!'); return;
    }

    try {
        const payload = {
            address: orderType === 'DELIVERY' ? selectedLocation.address : (orderType === 'PICKUP' ? 'Nhận tại quầy' : 'Nhận tại cửa hàng'),
            shipping_lat: orderType === 'DELIVERY' ? selectedLocation.lat : null,
            shipping_lng: orderType === 'DELIVERY' ? selectedLocation.lng : null,
            paymentMethod: paymentMethod,
            voucher_id: appliedVoucher ? appliedVoucher.id : null,
            note: shippingInfo.note, name: shippingInfo.fullName, phone: shippingInfo.phone,
            branch_id: Number(selectedLocation.branch_id || localStorage.getItem('selectedBranchId') || 1),
            order_type: orderType, 
            reservation_time: orderType === 'DINE_IN' ? reservationTime : null, 
            guest_count: orderType === 'DINE_IN' ? guestCount : null,
            delivery_duration: orderType === 'DELIVERY' ? selectedLocation.duration_mins : 0,
            is_table_only: isFastTrackReservation 
        };        
        const response = await axiosClient.post('/orders/create', payload);        
        if (response.success || response.orderId || response.order_id || response.paymentUrl) {
            if ((paymentMethod === 'VNPAY' || paymentMethod === 'VNPAY_DEPOSIT') && response.paymentUrl) {
                // Clear cart state early since order is now created in DB
                localStorage.removeItem('pendingReservation'); 
                localStorage.removeItem('selectedBranchId');
                window.dispatchEvent(new Event("cartUpdated"));
                
                window.location.href = response.paymentUrl;
            } else {
                localStorage.removeItem('pendingReservation'); 
                localStorage.removeItem('selectedBranchId'); // Reset selected branch after successful order
                window.dispatchEvent(new Event("cartUpdated"));
                alert(orderType === 'DINE_IN' ? "Đặt bàn thành công!" : "Đặt hàng thành công!");
                navigate('/don-hang');
            }
        }
    } catch (error) { alert(error.response?.data?.message || "Lỗi kết nối máy chủ hệ thống."); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans relative">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black mb-8 text-gray-800 tracking-tight">Thanh toán đơn hàng</h1>
        
        {/* CHỌN HÌNH THỨC NHẬN HÀNG */}
        {!isFastTrackReservation && !localStorage.getItem('pendingReservation') && (
            <div className="flex gap-3 mb-6 p-1 bg-gray-100 rounded-2xl">
              {[
                { key: 'DELIVERY', label: '🚶 Giao hàng', desc: 'Tận nơi' },
                { key: 'PICKUP', label: '🏥 Tại quầy', desc: 'Tự đến lấy' },
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setOrderType(key);
                    setPaymentMethod('COD');
                    setAppliedVoucher(null); setDiscountAmount(0);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                    orderType === key
                      ? 'bg-white shadow-md text-[#006a6a] border border-[#006a6a]/20'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div>{label}</div>
                  <div className="text-xs font-normal opacity-70">{desc}</div>
                </button>
              ))}
            </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <FaMapMarkerAlt className="text-[#006a6a]" /> Thông tin nhận hàng
              </h2>
              
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Họ và tên người nhận</label>
                    <input type="text" value={shippingInfo.fullName || ''} onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#006a6a]/20 outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại</label>
                    <input type="tel" value={shippingInfo.phone || ''} onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#006a6a]/20 outline-none transition" />
                  </div>
                </div>

                {orderType === 'DELIVERY' ? (
                  <div className="relative animate-in fade-in">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Địa chỉ nhận hàng</label>
                    <div className="relative">
                      <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                          type="text" 
                          value={searchQuery || ''} 
                          onChange={handleSearchAddress} 
                          required 
                          className={`w-full p-3 pl-10 border rounded-xl outline-none transition ${locationError ? 'border-red-400 bg-red-50' : selectedLocation.lat ? 'border-[#006a6a] bg-teal-50' : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-[#006a6a]'}`} 
                          placeholder="Nhập địa chỉ giao hàng khác nếu muốn..." 
                      />
                      {isSearching && <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#006a6a] border-t-transparent rounded-full animate-spin"></span>}
                    </div>

                    {suggestions.length > 0 && (
                      <ul className="absolute z-20 w-full bg-white border border-gray-100 mt-2 rounded-xl shadow-xl max-h-64 overflow-y-auto overflow-x-hidden">
                          {suggestions.map((feature, index) => (
                              <li key={index} className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition flex items-start gap-3" onClick={() => handleSelectLocation(feature)}>
                                  <FaMapMarkerAlt className="text-gray-400 mt-1 shrink-0" />
                                  <div>
                                      <span className="font-semibold text-gray-800 block">{feature.properties.name}</span>
                                      <span className="text-sm text-gray-500">{feature.properties.label}</span>
                                  </div>
                              </li>
                          ))}
                      </ul>
                    )}
                    
                    {locationError && <div className="mt-3 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">{locationError}</div>}
                    {selectedLocation.distance_km && !locationError && (
                      <div className="mt-3 text-sm text-[#006a6a] font-bold bg-teal-50 inline-block px-3 py-1.5 rounded-lg">
                          📍 Vận chuyển từ: {selectedLocation.branch_name} ({selectedLocation.distance_km} km)
                      </div>
                    )}
                  </div>
                ) : orderType === 'PICKUP' ? (
                  <div className="p-5 bg-green-50/60 border border-green-200/60 rounded-2xl space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-2.5 text-green-800 font-black text-sm uppercase tracking-wide">
                      <FaStore size={16} /> Hình thức: Nhận tại quầy (Pickup)
                    </div>
                    <div className="text-sm text-green-900 font-medium bg-white/70 p-4 rounded-xl border border-green-100">
                      <p className="font-bold text-green-800 mb-2">🏥 Chi nhánh phục vụ:</p>
                      <p className="font-semibold">{selectedLocation.branch_name || (localStorage.getItem('selectedBranchId') ? `Chi nhánh #${localStorage.getItem('selectedBranchId')}` : 'Chi nhánh đã chọn')}</p>
                      <p className="text-xs text-green-600 mt-2">⚠️ Vui lòng đến nhận hàng khi nhận được thông báo đơn đã sẵn sàng.</p>
                    </div>
                    <p className="text-xs font-bold text-green-700">Phí vận chuyển: <span className="text-green-600">Miễn phí 🎉</span></p>
                  </div>
                ) : (
                  <div className="p-5 bg-purple-50/60 border border-purple-200/60 rounded-2xl space-y-3 animate-in fade-in">
                      <div className="flex items-center gap-2.5 text-purple-800 font-black text-sm uppercase tracking-wide">
                          <FaStore size={16} /> Hình thức: Đặt bàn ăn tại quán (Dine-in)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-purple-900 font-medium bg-white/70 p-4 rounded-xl border border-purple-100">
                          <div>
                              <label className="flex items-center gap-2 mb-1"><FaClock className="text-purple-600"/> <strong>Giờ đến:</strong></label>
                              <input type="datetime-local" value={reservationTime || ''} onChange={(e) => setReservationTime(e.target.value)} className="w-full p-2 rounded-lg border border-purple-200 outline-none text-gray-700 text-sm" required />
                          </div>
                          <div>
                              <label className="flex items-center gap-2 mb-1"><FaUsers className="text-purple-600"/> <strong>Số lượng:</strong></label>
                              <input type="number" min="1" max="50" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} className="w-full p-2 rounded-lg border border-purple-200 outline-none text-gray-700 text-sm" required />
                          </div>
                      </div>
                      <p className="text-xs text-purple-700/90 font-semibold pl-1">📍 Địa điểm phục vụ: <span className="underline font-bold">{selectedLocation.branch_name || 'Chi nhánh đã chốt'}</span></p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú thêm cho đơn hàng</label>
                  <textarea value={shippingInfo.note || ''} onChange={(e) => setShippingInfo({...shippingInfo, note: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#006a6a]/20 outline-none transition" placeholder="VD: Giao giờ hành chính, bớt cay..." rows="2"></textarea>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-6 text-gray-800">Phương thức thanh toán</h2>
              
              {orderType === 'DINE_IN' ? (
                 <>
                    <div className="mb-5 p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 font-medium flex items-start gap-3">
                        <span className="text-xl">⚠️</span>
                        <p>Để đảm bảo trải nghiệm, hệ thống yêu cầu <strong>thanh toán trước tối thiểu tiền cọc giữ bàn</strong>. Bếp sẽ chuẩn bị món ăn sẵn sàng ngay khi bạn đến!</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <label className={`flex flex-col p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'VNPAY_DEPOSIT' ? 'border-[#006a6a] bg-teal-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <input type="radio" name="paymentMethod" value="VNPAY_DEPOSIT" checked={paymentMethod === 'VNPAY_DEPOSIT'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-[#006a6a]"/>
                                    <span className="font-bold text-gray-800">Cọc trước giữ bàn (VNPay)</span>
                                </div>
                                <span className="font-black text-orange-600 bg-orange-100 px-3 py-1 rounded-lg text-sm">{depositAmount.toLocaleString()}đ</span>
                            </div>
                            <span className="text-sm text-gray-500 pl-8">Chỉ thanh toán trước tiền cọc giữ chỗ. Phần tiền món ăn còn lại thanh toán trực tiếp tại quầy sau khi dùng bữa.</span>
                        </label>

                        <label className={`flex flex-col p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'VNPAY' ? 'border-[#006a6a] bg-teal-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <input type="radio" name="paymentMethod" value="VNPAY" checked={paymentMethod === 'VNPAY'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-[#006a6a]"/>
                                    <span className="font-bold text-gray-800">Thanh toán trước 100% (VNPay)</span>
                                </div>
                                <span className="font-black text-[#006a6a] bg-teal-100 px-3 py-1 rounded-lg text-sm">{total.toLocaleString()}đ</span>
                            </div>
                            <span className="text-sm text-gray-500 pl-8">Thanh toán toàn bộ hóa đơn ngay bây giờ để tiết kiệm thời gian chờ đợi tính tiền tại quán.</span>
                        </label>
                    </div>
                 </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`flex flex-col p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-[#006a6a] bg-teal-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-[#006a6a]"/>
                        <span className="font-bold text-gray-800">Tiền mặt (COD)</span>
                      </div>
                      <span className="text-sm text-gray-500 pl-8">Thanh toán trực tiếp cho tài xế khi nhận hàng.</span>
                    </label>

                    <label className={`flex flex-col p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === 'VNPAY' ? 'border-[#006a6a] bg-teal-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <input type="radio" name="paymentMethod" value="VNPAY" checked={paymentMethod === 'VNPAY'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 text-[#006a6a]"/>
                        <span className="font-bold text-gray-800">Cổng VNPay</span>
                      </div>
                      <span className="text-sm text-gray-500 pl-8">Quét mã QR hoặc ATM nội địa nhanh chóng.</span>
                    </label>
                </div>
              )}
            </div>
          </div>

          {/* CỘT TỔNG KẾT ĐƠN HÀNG BIÊN PHẢI */}
          <div className="lg:w-[400px]">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
              <h2 className="text-xl font-bold mb-6 text-gray-800">Chi tiết thực đơn</h2>
              
              <div className="space-y-4 mb-6 max-h-72 overflow-y-auto pr-2 hide-scrollbar">
                {cartItems.length > 0 ? (
                  cartItems.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between text-sm group">
                      <div className="pr-4 flex-1">
                        <p className="font-bold text-gray-800 text-[15px]">{item.quantity} x {item.name || item.food_name}</p>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {item.safeOptions && item.safeOptions.length > 0 && <span>Tùy chọn: {item.safeOptions.map(o => o.Name || o.name).join(', ')}</span>}
                        </p>
                        {item.note && <p className="text-xs text-orange-500 mt-1 italic">Ghi chú món: {item.note}</p>}
                      </div>
                      <p className="font-black text-[#006a6a]">{(item.safeTotal || 0).toLocaleString()}đ</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 py-4">Giỏ hàng trống</p>
                )}
              </div>

              {/* HOÀN THIỆN: HIỂN THỊ UI ĐẶC QUYỀN TỰ ĐỘNG CỦA RANK */}
              {autoPromotions.length > 0 && (
                  <div className="bg-gradient-to-r from-teal-50 to-white border border-teal-200 rounded-2xl p-5 mb-6 shadow-sm">
                      <h4 className="font-black text-teal-800 text-[15px] mb-3 flex items-center gap-2">
                          💎 Các ưu đãi áp dụng tự động:
                      </h4>
                      <ul className="list-disc pl-5 mb-3 space-y-1 text-sm font-semibold text-teal-900">
                          {autoPromotions.map((p, idx) => (
                              <li key={p.id || idx}>{p.name}</li>
                          ))}
                      </ul>
                      <div className="space-y-2 text-sm text-teal-700 font-bold ml-1">
                          {autoDiscountPercent > 0 && <p>• Giảm {autoDiscountPercent}% tổng hóa đơn</p>}
                          {autoDiscountAmount > 0 && <p>• Trừ thẳng {autoDiscountAmount.toLocaleString()}đ vào bill</p>}
                          {isAutoFreeship && <p className="text-orange-600">• Miễn phí giao hàng (Freeship 0đ)</p>}
                          {giftMessages.map((msg, idx) => <p key={idx} className="text-purple-700">🎁 {msg}</p>)}
                      </div>
                      
                      {(totalAutoDiscount > 0) && (
                          <div className="mt-4 pt-3 border-t border-teal-200/60 flex justify-between font-black text-teal-800 text-lg">
                                <span>Ưu đãi giảm:</span>
                                <span>- {totalAutoDiscount.toLocaleString()} đ</span>
                          </div>
                      )}
                  </div>
              )}

              {/* KHU VỰC CHỌN VOUCHER NHẬP TAY */}
              <div 
                className="bg-white border-2 border-teal-100 p-4 rounded-2xl mb-6 shadow-sm flex items-center justify-between cursor-pointer hover:border-[#006a6a] hover:bg-teal-50 transition-all group" 
                onClick={handleOpenVoucherModal}
              >
                <div className="flex items-center gap-3">
                    <FaTicketAlt className="text-[#006a6a] text-2xl group-hover:scale-110 transition-transform" />
                    <div>
                        <p className="font-bold text-gray-800 text-[15px]">
                            {appliedVoucher ? `Đã áp dụng: ${appliedVoucher.code}` : 'Mã giảm giá / Voucher'}
                        </p>
                        <p className={`text-xs mt-0.5 ${appliedVoucher ? 'text-green-600 font-bold' : 'text-gray-500'}`}>
                            {appliedVoucher ? `Giảm được ${discountAmount.toLocaleString()}đ` : 'Bấm vào đây để chọn mã >'}
                        </p>
                    </div>
                </div>
                {appliedVoucher && (
                    <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); handleRemoveVoucher(); }} 
                        className="text-xs font-bold text-red-500 hover:text-white border border-red-200 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Hủy
                    </button>
                )}
              </div>

              <div className="space-y-3 text-[15px] text-gray-600 mb-6 border-b border-gray-100 pb-6">
                <div className="flex justify-between">
                  <span>Tạm tính món</span>
                  <span className="font-bold text-gray-800">{subtotal.toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Phí giao hàng</span>
                  <span className="font-bold text-[#006a6a]">
                    {orderType === 'PICKUP' ? (
                      <span className="text-green-600 font-bold">Miễn phí 🎉</span>
                    ) : orderType === 'DELIVERY' ? (
                       isAutoFreeship ? <span className="line-through text-gray-400 mr-2 text-sm">{shippingFee.toLocaleString()}đ</span> : '',
                       finalShippingFee > 0 ? `${finalShippingFee.toLocaleString()}đ` : (isAutoFreeship ? '0đ' : <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded">Chờ địa chỉ</span>)
                    ) : '0đ'}
                  </span>
                </div>
                {orderType === 'DELIVERY' && selectedLocation.distance_km && (
                    <div className="flex justify-between items-center text-orange-600 font-medium text-[13px] bg-orange-50 p-2.5 rounded-lg border border-orange-100 mt-2">
                        <span className="flex items-center gap-1.5">⏱️ Giao tới trong khoảng:</span>
                        <span className="font-bold">
                           {(selectedLocation.duration_mins || Math.ceil(selectedLocation.distance_km * 3)) + 15} phút
                        </span>
                    </div>
                )}
                
                {/* Trừ tiền Voucher nhập tay */}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Khuyến mãi (Voucher)</span>
                    <span className="font-bold">-{discountAmount.toLocaleString()}đ</span>
                  </div>
                )}

                {/* BÓC TÁCH CHI TIẾT CỌC */}
                {orderType === 'DINE_IN' && (
                  <>
                    <div className="flex justify-between text-orange-600 font-bold pt-2 border-t border-dashed border-gray-200">
                      <span>Tiền cọc giữ bàn ({guestCount} khách)</span>
                      <span>{depositAmount.toLocaleString()}đ</span>
                    </div>
                    
                    {paymentMethod === 'VNPAY_DEPOSIT' ? (
                      <div className="flex justify-between text-gray-400 text-xs font-medium mt-1">
                        <span>Còn lại cần trả tại quán (Tiền món)</span>
                        <span>{Math.max(0, total - depositAmount).toLocaleString()}đ</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-teal-600 text-xs font-medium mt-1">
                        <span>Tiền cọc đã được gộp vào tổng thanh toán trước</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-between items-end mb-8">
                <span className="font-bold text-gray-500">
                  {orderType === 'DINE_IN' && paymentMethod === 'VNPAY_DEPOSIT' ? 'Tiền cọc thanh toán ngay' : 'Tổng thanh toán'}
                </span>
                <span className="text-3xl font-black text-red-500 leading-none">
                  {amountToPayNow.toLocaleString()}đ
                </span>
              </div>

              <button 
                type="submit" 
                disabled={(cartItems.length === 0 && !isFastTrackReservation && orderType !== 'DINE_IN') || (orderType === 'DELIVERY' && (!selectedLocation.lat || locationError))} 
                className={`w-full py-4.5 rounded-2xl font-bold text-lg shadow-lg transition-all ${(cartItems.length > 0 || isFastTrackReservation || orderType === 'DINE_IN') && (orderType !== 'DELIVERY' || (selectedLocation.lat && !locationError)) ? 'bg-[#006a6a] hover:bg-teal-700 text-white active:scale-[0.98]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                {orderType === 'DINE_IN' 
                  ? (paymentMethod === 'VNPAY_DEPOSIT' ? 'THANH TOÁN CỌC & ĐẶT BÀN' : 'THANH TOÁN TOÀN BỘ & ĐẶT BÀN') 
                  : orderType === 'PICKUP' ? 'XÁC NHẬN ĐẶT MÓN & NHẬN TẠI QUẦY'
                  : 'XÁC NHẬN ĐẶT HÀNG'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* MODAL POPUP: KHO VOUCHER */}
      {showVoucherModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm bg-black/50 animate-in fade-in duration-200">
              <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl p-6 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
                      <h3 className="font-black text-xl text-gray-800 flex items-center gap-2">
                          <FaTicketAlt className="text-[#006a6a]" /> Kho Voucher Của Bạn
                      </h3>
                      <button onClick={() => setShowVoucherModal(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-2 rounded-full transition-colors"><FaTimes size={16}/></button>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 pr-2 hide-scrollbar space-y-4">
                      {myVouchers.length > 0 ? myVouchers.map(v => {
                          const isExpired = v.end_date && new Date(v.end_date) < new Date();
                          const isEligible = subtotal >= Number(v.min_order_value) && !isExpired;
                          return (
                              <div 
                                  key={v.user_voucher_id} 
                                  className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${isEligible ? 'border-teal-100 bg-white cursor-pointer hover:border-[#006a6a] hover:shadow-md' : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'}`} 
                                  onClick={() => isEligible && handleSelectVoucher(v)}
                              >
                                  <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1.5">
                                          <span className="font-black text-[#006a6a] bg-teal-50 px-2.5 py-0.5 rounded uppercase tracking-wider text-xs border border-teal-100">{v.code}</span>
                                      </div>
                                      <h4 className="font-bold text-gray-800 text-[15px] leading-tight mb-1">{v.name}</h4>
                                      <p className="text-xs text-gray-500 font-medium">Đơn tối thiểu {Number(v.min_order_value).toLocaleString()}đ</p>
                                      <p className="text-xs text-orange-500 mt-0.5 font-medium">HSD: {v.end_date ? new Date(v.end_date).toLocaleDateString('vi-VN') : 'Không giới hạn'}</p>
                                  </div>
                                  <div className="pl-3">
                                      <button className={`px-4 py-2 rounded-[10px] font-bold text-sm transition-all ${isEligible ? 'bg-[#006a6a] text-white hover:bg-teal-700 shadow-md shadow-teal-500/20' : 'bg-gray-200 text-gray-400'}`}>
                                          {isExpired ? 'Hết hạn' : 'Dùng'}
                                      </button>
                                  </div>
                              </div>
                          )
                      }) : (
                          <div className="text-center py-10">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <FaTicketAlt className="text-gray-300 text-3xl" />
                              </div>
                              <p className="text-gray-500 font-medium">Bạn chưa lưu mã giảm giá nào trong ví.</p>
                              <p className="text-sm text-[#006a6a] mt-2 cursor-pointer hover:underline" onClick={() => {setShowVoucherModal(false); navigate('/vouchers');}}>Tới trang Ưu Đãi ngay!</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CheckoutPage;