import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaMinus, FaPlus, FaTrashAlt, FaStore, FaMapMarkerAlt, FaCheckCircle, FaSearch } from 'react-icons/fa';
import axiosClient from '../../utils/axiosClient';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import OtpVerificationModal from './OtpVerificationModal';
const CartDrawer = ({ isOpen, onClose, cartItems = [] }) => {
  const [localCart, setLocalCart] = useState([]);
  const [isScanning, setIsScanning] = useState(false); 
  const [suggestedBranches, setSuggestedBranches] = useState([]);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [activeUserForOtp, setActiveUserForOtp] = useState(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showAddressConfirmModal, setShowAddressConfirmModal] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState({ lat: null, lng: null, address: '' });
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    let items = [];
    if (Array.isArray(cartItems)) {
        items = cartItems;
    } else if (cartItems && Array.isArray(cartItems.items)) {
        items = cartItems.items;
    }

    const normalizedItems = items.map(item => {
        const rawToppingNotes = item.topping_notes || item.Topping_notes || item.Topping_Notes || null;
        let finalOptions = Array.isArray(item.options) ? item.options : [];
        let finalNote = item.note || '';

        if (rawToppingNotes) {
            try {
                let parsedData = rawToppingNotes;
                if (typeof parsedData === 'string') parsedData = JSON.parse(parsedData);
                if (typeof parsedData === 'string') parsedData = JSON.parse(parsedData);

                if (parsedData && Array.isArray(parsedData.options) && parsedData.options.length > 0) {
                    finalOptions = parsedData.options;
                }
                if (parsedData && parsedData.note) {
                    finalNote = parsedData.note;
                }
            } catch (error) {
                console.error("❌ Lỗi giải mã topping_notes cho món:", item.id, error);
            }
        }

        let basePrice = Number(item.base_price || item.unit_price || item.price || 0);
        let optionsPrice = 0;
        finalOptions.forEach(opt => {
            optionsPrice += (Number(opt.price || 0) * Number(opt.quantity || 1));
        });
        
        let safeUnitPrice = basePrice + optionsPrice;
        let safeTotalPrice = safeUnitPrice * (item.quantity || 1);

        return {
            ...item,
            options: finalOptions,
            note: finalNote,
            safeUnitPrice: safeUnitPrice, 
            safeTotalPrice: safeTotalPrice 
        };
    });

    setLocalCart(normalizedItems);
  }, [cartItems]);

  const subtotal = localCart.reduce((sum, item) => sum + (item.safeTotalPrice || 0), 0);
  const timerRef = useRef({});

  const handleUpdateQuantity = (id, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;

    setLocalCart(prevCart => 
      prevCart.map(item => {
        if (item.id === id) {
           return { ...item, quantity: newQty, safeTotalPrice: item.safeUnitPrice * newQty };
        }
        return item;
      })
    );

    if (timerRef.current[id]) clearTimeout(timerRef.current[id]);

    timerRef.current[id] = setTimeout(async () => {
      try {
        await axiosClient.put(`/cart/update/${id}`, { quantity: newQty });
        window.dispatchEvent(new Event("cartUpdated"));
      } catch (error) {
        console.error("Lỗi cập nhật số lượng", error);
      }
    }, 500); 
  };

  const handleRemoveItem = async (id) => {
    if (window.confirm('Bạn có chắc muốn bỏ món này khỏi giỏ hàng?')) {
      try {
        await axiosClient.delete(`/cart/remove/${id}`);
        window.dispatchEvent(new Event("cartUpdated"));
      } catch (error) {
        console.error("Lỗi xoá món", error);
      }
    }
  };

  // HÀM XỬ LÝ KHỬ KIỂM TRA ĐƠN VÀ GỢI Ý BẢNG CHỌN
  const resumeCheckoutFlow = async (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    
    if (localCart.length === 0) {
      alert("Giỏ hàng của bạn đang trống!");
      setIsScanning(false);
      return;
    }

    const isPendingReservation = localStorage.getItem('pendingReservation');
    if (isPendingReservation) {
        setIsScanning(false);
        onClose();
        navigate('/checkout');
        return;
    }

    let lat = user.latitude || user.Latitude;
    let lng = user.longitude || user.Longitude;

    // NẾU CHƯA CÓ ĐỊA CHỈ TRONG DB -> LẤY GPS & MỞ POPUP XÁC NHẬN
    if (!lat || !lng) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 10000, maximumAge: 0
                });
            });
            
            lat = position.coords.latitude;
            lng = position.coords.longitude;

            let detectedAddress = "Vị trí GPS của bạn (Vui lòng bổ sung số nhà/hẻm)";
            try {
                const TRACKASIA_API_KEY = import.meta.env.VITE_TRACKASIA_API_KEY;
                const revRes = await axios.get('https://maps.track-asia.com/api/v1/reverse', {
                    params: { 'point.lat': lat, 'point.lon': lng, key: TRACKASIA_API_KEY, lang: 'vi' }
                });
                if (revRes.data && revRes.data.features && revRes.data.features.length > 0) {
                    detectedAddress = revRes.data.features[0].properties.label; 
                }
            } catch (apiErr) {
                console.error("Lỗi dịch địa chỉ từ GPS:", apiErr);
            }

            // Tạm lưu thông tin và MỞ POPUP XÁC NHẬN, dừng luồng quét chi nhánh lại!
            setDetectedLocation({ lat: lat, lng: lng, address: detectedAddress });
            setShowAddressConfirmModal(true);
            setIsScanning(false);
            return; 

        } catch (geoError) {
            console.warn("Khách hàng từ chối cấp quyền vị trí:", geoError);
            setIsScanning(false);
            const confirmUpdate = window.confirm("Hệ thống cần biết vị trí để gợi ý chi nhánh tối ưu. Chuyển đến trang Cá nhân để thiết lập địa chỉ?");
            if (confirmUpdate) {
                onClose(); navigate('/profile');
            }
            return; 
        }
    }

    // NẾU ĐÃ CÓ TỌA ĐỘ TRONG PROFILE TỪ TRƯỚC -> QUÉT CHI NHÁNH LUÔN
    if (lat && lng) {
        try {
            const res = await axiosClient.post('/shipping/suggest-branches', { lat, lng, cartItems: localCart });
            if (res.success && res.allBranches) {
                setSuggestedBranches(res.allBranches);
                setShowBranchModal(true);
            }
        } catch (err) {
            console.error("Lỗi quét chi nhánh ngầm:", err);
        } finally {
            setIsScanning(false);
        }
    }
  };

  const handleCheckout = async() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Vui lòng đăng nhập để tiến hành đặt hàng!");
      onClose();
      window.dispatchEvent(new Event("openAuthModal"));
      return;
    }
    
    try {
      setIsScanning(true); 
      const data = await axiosClient.get('/users/profile');
      
      if(data.success || data.user){
        const user = data.user || data;
        if (user.is_phone_verified !== 1 && user.Is_phone_verified !== 1) {
          setActiveUserForOtp(user);
          setShowOtpModal(true);
          setIsScanning(false);
          return;
        }
        
        await resumeCheckoutFlow(user);
      }
    } catch (error) {
      setIsScanning(false);
      alert("Lỗi máy chủ, không thể xác minh tài khoản lúc này!");
    }    
  };

  // HÀM XÁC NHẬN CHỌN CHI NHÁNH TỪ BẢNG CHỌN ĐỂ ĐI ĐẾN THANH TOÁN
  const handleConfirmBranch = async (branchId) => {
    try {
        const res = await axiosClient.put('/cart/set-branch', { branch_id: branchId });
        localStorage.setItem('selectedBranchId', branchId); // Lưu lại chi nhánh tối ưu khách đã chốt
        setShowBranchModal(false);
        onClose();
        navigate('/checkout');
    } catch (error) {
        const errorData = error.response?.data || error;
        if (errorData.outOfStockItems) {
            alert(`⚠️ Các món sau đang hết hàng tại chi nhánh này:\n- ${errorData.outOfStockItems.join('\n- ')}\n\nVui lòng loại bỏ các món này khỏi giỏ hàng trước khi thanh toán.`);
            setShowBranchModal(false);
        } else {
            alert(errorData.message || 'Lỗi: Không thể cập nhật chi nhánh!');
        }
    }
  };

  const handleConfirmAddress = async () => {
    localStorage.setItem('tempDeliveryLocation', JSON.stringify(detectedLocation));
    setShowAddressConfirmModal(false);
    setIsScanning(true);

    try {
        const res = await axiosClient.post('/shipping/suggest-branches', {
            lat: detectedLocation.lat,
            lng: detectedLocation.lng,
            cartItems: localCart
        });

        if (res.success && res.allBranches) {
            setSuggestedBranches(res.allBranches);
            setShowBranchModal(true);
        }
    } catch (err) {
        console.error("Lỗi quét chi nhánh ngầm:", err);
    } finally {
        setIsScanning(false);
    }
  };

  const handleSearchAddress = (e) => {
    const text = e.target.value;
    setDetectedLocation({...detectedLocation, address: text});

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const TRACKASIA_API_KEY = import.meta.env.VITE_TRACKASIA_API_KEY;
        const res = await axios.get(`https://maps.track-asia.com/api/v1/autocomplete`, {
            params: { text: text, key: TRACKASIA_API_KEY, lang: 'vi', new_admin: 'true' }
        });
        setSuggestions(res.data.features || []);
      } catch (error) {
        console.error('Lỗi phân tích địa chỉ:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectLocation = (feature) => {
    const fullAddress = feature.properties.label;
    const [lng, lat] = feature.geometry.coordinates;
    
    setDetectedLocation({ address: fullAddress, lat: lat, lng: lng });
    setSuggestions([]);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[120] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-2xl font-black text-gray-800">Giỏ hàng của bạn</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"><FaTimes size={24} /></button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-8 hide-scrollbar">
          {localCart.length > 0 ? (
            localCart.map((item, index) => (
              <div key={item.id || index} className="flex gap-4 group relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-gray-100">
                  <img src={item.img || item.image_url || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-full object-cover"/>
                </div>

                <div className="flex-grow flex flex-col justify-between">
                  <div className="relative pr-6">
                    <h3 className="font-bold text-gray-900 text-[15px] leading-tight mb-1">{item.name || item.food_name}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {item.options && item.options.length > 0 && (
                        <>
                          <span className="font-semibold text-gray-700">Tùy chọn: </span> 
                          {item.options.map(opt => `${opt.Name || opt.name} (x${opt.quantity || 1})`).join(', ')} 
                          <br />
                        </>
                      )}
                      {item.note && (
                        <>
                          <span className="font-semibold text-red-500">Ghi chú:</span> <span className="italic">{item.note}</span>
                        </>
                      )}
                    </p>
                    <button onClick={() => handleRemoveItem(item.id)} className="absolute top-0 right-0 text-gray-300 hover:text-red-500 transition p-1 cursor-pointer">
                      <FaTrashAlt size={16} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                      <button onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-red-500 cursor-pointer">
                        <FaMinus size={10} />
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-gray-800">{item.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-[#006a6a] cursor-pointer">
                        <FaPlus size={10} />
                      </button>
                    </div>
                    <span className="font-black text-[#006a6a]">
                      {(item.safeTotalPrice || 0).toLocaleString()}đ
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <div className="text-6xl mb-2 opacity-50">🛒</div>
              <p className="font-medium text-lg text-gray-500">Giỏ hàng của bạn đang trống</p>
              <button onClick={onClose} className="px-6 py-2 bg-gray-100 text-[#006a6a] font-bold rounded-full hover:bg-gray-200 transition">Tiếp tục mua sắm</button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-white">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500 font-medium">Tạm tính:</span>
            <span className="text-2xl font-black text-[#006a6a]">{subtotal.toLocaleString()}đ</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={localCart.length === 0 || isScanning}
            className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex justify-center items-center gap-2 ${(localCart.length > 0 && !isScanning) ? 'bg-[#006a6a] hover:bg-teal-700 text-white active:scale-[0.98]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {isScanning ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ĐANG TÌM CHI NHÁNH...
              </>
            ) : (
              "TIẾN HÀNH THANH TOÁN"
            )}
          </button>
        </div>
      </div>
      {showAddressConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-800 mb-2 flex items-center gap-2">
              <FaMapMarkerAlt className="text-[#006a6a]" /> Xác nhận địa chỉ nhận hàng
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Hệ thống đã lấy vị trí hiện tại của bạn. Vui lòng kiểm tra và <strong>bổ sung thêm số nhà, ngõ/hẻm</strong> (nếu có) để tài xế giao hàng chính xác nhất nhé!
            </p>
            
            <div className="relative mb-6">
              <FaSearch className="absolute left-4 top-[18px] text-gray-400" />
              <input
                type="text"
                className="w-full p-4 pl-11 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#006a6a] transition text-[15px] text-gray-800 font-medium shadow-sm"
                value={detectedLocation.address || ''}
                onChange={handleSearchAddress}
                placeholder="Nhập chi tiết số nhà, tên tòa nhà, đường..."
              />
              {isSearching && <span className="absolute right-4 top-[18px] w-5 h-5 border-2 border-[#006a6a] border-t-transparent rounded-full animate-spin"></span>}
              {suggestions.length > 0 && (
                  <ul className="absolute z-[250] w-full bg-white border border-gray-100 mt-2 rounded-xl shadow-2xl max-h-56 overflow-y-auto overflow-x-hidden">
                      {suggestions.map((feature, index) => (
                          <li key={index} className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition flex items-start gap-3" onClick={() => handleSelectLocation(feature)}>
                              <FaMapMarkerAlt className="text-gray-400 mt-1 shrink-0" />
                              <div>
                                  <span className="font-bold text-gray-800 block text-sm">{feature.properties.name}</span>
                                  <span className="text-xs text-gray-500 line-clamp-1">{feature.properties.label}</span>
                              </div>
                          </li>
                      ))}
                  </ul>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleConfirmAddress} 
                className="flex-[1.2] py-3.5 bg-[#006a6a] text-white font-bold rounded-xl hover:bg-teal-700 transition shadow-lg text-sm"
              >
                Xác nhận & Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ĐÃ THÊM: BẢNG CHỌN CHI NHÁNH ĐA ĐIỂM TỰ ĐỘNG XẾP HẠNG ==================== */}
      {showBranchModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-wide">
                <FaStore className="text-[#006a6a]" /> Bảng Đối Chiếu Chi Nhánh
              </h3>
              <button onClick={() => setShowBranchModal(false)} className="text-gray-400 hover:text-gray-600"><FaTimes size={18} /></button>
            </div>
            
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Hệ thống đã tự động quét thực đơn và khoảng cách dựa trên địa chỉ của bạn. Vui lòng xác nhận chi nhánh xử lý đơn hàng:
            </p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 mb-6 hide-scrollbar">
              {suggestedBranches.map((branch, idx) => {
                const isBest = idx === 0;
                const isFullyStocked = branch.availableCount === branch.totalItems;
                const isOutOfRange = branch.distance_km > 10;

                return (
                  <div 
                    key={branch.id} 
                    onClick={() => !isOutOfRange && handleConfirmBranch(branch.id)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                      isOutOfRange 
                        ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed' 
                        : isBest 
                          ? 'border-[#006a6a] bg-teal-50/40 hover:bg-teal-50/70 cursor-pointer shadow-sm' 
                          : 'border-gray-100 hover:border-gray-200 bg-white cursor-pointer'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <span className="font-extrabold text-gray-800 text-sm flex items-center gap-1.5 leading-tight">
                          {branch.name}
                          {isBest && <span className="bg-[#006a6a] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">Tối ưu nhất</span>}
                        </span>
                        <span className="text-[11px] text-gray-400 block mt-1 line-clamp-1">📍 {branch.address}</span>
                      </div>
                      <span className="text-xs font-black text-[#006a6a] whitespace-nowrap bg-white px-2 py-1 rounded-md border border-gray-100">
                        {branch.distance_km} km
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-semibold">Khả năng phục vụ:</span>
                      {isOutOfRange ? (
                        <span className="text-red-500 font-black">❌ Vượt quá 10km</span>
                      ) : (
                        <span className={`font-black flex items-center gap-1 ${isFullyStocked ? 'text-green-600' : 'text-amber-500'}`}>
                          {isFullyStocked ? <FaCheckCircle/> : '⚠️'} Có sẵn {branch.availableCount}/{branch.totalItems} món
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowBranchModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition text-xs"
              >
                Thay đổi giỏ hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OTP XÁC THỰC SỐ ĐIỆN THOẠI */}
      {showOtpModal && activeUserForOtp && (
        <OtpVerificationModal 
          initialPhone={activeUserForOtp.phone || activeUserForOtp.Phone || ''}
          onCancel={() => setShowOtpModal(false)}
          onSuccess={(verifiedPhone) => {
            setShowOtpModal(false);
            // Tiếp tục luồng thanh toán sau khi xác thực thành công
            const updatedUser = { ...activeUserForOtp, phone: verifiedPhone, is_phone_verified: 1 };
            resumeCheckoutFlow(updatedUser);
          }}
        />
      )}
    </>
  );
};

export default CartDrawer;