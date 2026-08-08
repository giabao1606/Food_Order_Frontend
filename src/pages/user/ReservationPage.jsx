import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCalendarAlt, FaUsers, FaClock, FaStore, FaUtensils, FaCheckCircle } from 'react-icons/fa';
import axiosClient from '../../utils/axiosClient';

const ReservationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const aiOrder = location.state?.aiOrder || null;

  const getDateTime = () =>{
    const resTime = aiOrder ? (aiOrder.date_time || aiOrder.reservation_time) : null;
    if (resTime) {
        const date = new Date(resTime);
        const datePart = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        const timePart = String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
        return { date: datePart, time: timePart };
    }
    const now = new Date();
    now.setHours(now.getHours() + 2);
    const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const [datePart, timePart] = date.toISOString().split('T');
    return { date: datePart, time: timePart.slice(0, 5) };
  };
  const dateTime = getDateTime();

  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    branch_id: aiOrder?.branch_id || '',
    reservation_date: dateTime.date,
    reservation_time: dateTime.time || '',
    guest_count: aiOrder?.guests || 2,
    fullName: aiOrder?.customer_name || '',
    phone: aiOrder?.phone || '',
    note: aiOrder?.note || ''
  });
  
  const [branchDetails, setBranchDetails] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);

  useEffect(() => {
    document.title = "Đặt bàn trước";
    const controller = new AbortController();
    const signal = controller.signal;

    const initializeReservationData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token && !aiOrder?.customer_name) {
          const profileRes = await axiosClient.get('/users/profile', { signal });          
          if (profileRes.success || profileRes.user) {
            const user = profileRes.user || profileRes;
            let displayPhone = user.Phone || user.phone || '';
            if (displayPhone.startsWith('+84')) {
              displayPhone = '0' + displayPhone.slice(3);
            }
            setFormData(prev => ({ 
                ...prev, 
                fullName: user.Name || user.full_name || '', 
                phone: displayPhone 
            }));
          }
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
            console.error("Lỗi khi lấy thông tin thành viên từ DB:", error);
      }
      try {
        const res = await axiosClient.get('/branches', { signal });
        const branchData = res.data?.data || res.data || res;
        if (Array.isArray(branchData)) {
            setBranches(branchData);
            if (branchData.length > 0) {
                setFormData(prev => ({ ...prev, branch_id: branchData[0].id }));
            }
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
            console.error("Lỗi lấy danh sách chi nhánh:", error);
      }
    };
    initializeReservationData();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (formData.branch_id && branches.length > 0) {
        const selectedBranch = branches.find(b => Number(b.id) === Number(formData.branch_id));
        if (selectedBranch) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setBranchDetails(selectedBranch);
        }
    }
  }, [formData.branch_id, branches]);

  useEffect(() => {
      if (branchDetails && formData.reservation_date) {
          const openTime = branchDetails.opening_time || '09:00:00';
          const closeTime = branchDetails.closing_time || '22:00:00';
          
          const slots = [];
          const start = new Date(`${formData.reservation_date}T${openTime}`);
          const end = new Date(`${formData.reservation_date}T${closeTime}`);
          // Trừ đi thời lượng ăn để không nhận khách sát giờ đóng cửa (giả định 1 tiếng nếu không có reservation_duration)
          const durationMins = branchDetails.reservation_duration || 60;
          end.setMinutes(end.getMinutes() - durationMins);
          
          const now = new Date();
          const minTime = new Date(now.getTime() + 60 * 60 * 1000); // Phải đặt trước 1 tiếng

          let current = start;
          while (current <= end) {
              // Bỏ qua phút lẻ, làm tròn lên slot 30 phút
              const minutes = current.getMinutes();
              if (minutes !== 0 && minutes !== 30) {
                  current.setMinutes(minutes < 30 ? 30 : 60);
                  current.setSeconds(0);
              }
              
              if (current >= minTime || formData.reservation_date !== now.toISOString().split('T')[0]) {
                  const timeStr = current.toTimeString().slice(0, 5);
                  slots.push(timeStr);
              }
              current = new Date(current.getTime() + 30 * 60 * 1000);
          }
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTimeSlots(slots);
          
          // Reset time nếu time cũ không hợp lệ trong ngày mới
          if (slots.length > 0 && !slots.includes(formData.reservation_time)) {
              // eslint-disable-next-line react-hooks/set-state-in-effect
              setFormData(prev => ({ ...prev, reservation_time: slots[0] }));
          } else if (slots.length === 0) {
              // eslint-disable-next-line react-hooks/set-state-in-effect
              setFormData(prev => ({ ...prev, reservation_time: '' }));
          }
      }
  }, [branchDetails, formData.reservation_date]);

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    return future.toISOString().split('T')[0];
  };

  const handleBookTableOnly = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Vui lòng đăng nhập để tiến hành đặt bàn!");
        window.dispatchEvent(new Event("openAuthModal"));
        return;
    }
    if (!validateForm()) return;
    const depositAmount = formData.guest_count * 10000;    
    const confirmMsg = `Quy định nhà hàng: Thu cọc giữ chỗ 10,000đ / Khách.\nTổng tiền cọc của bạn (cho ${formData.guest_count} khách) là: ${depositAmount.toLocaleString()} VNĐ.\n\nNhà hàng chỉ nhận cọc giữ bàn thông qua cổng VNPay. Bạn có đồng ý tiến hành thanh toán không?`;

    if (!window.confirm(confirmMsg)) return;
    try {
        const payload = {
            address: 'Nhận tại cửa hàng',
            name: formData.fullName,
            phone: formData.phone,
            note: formData.note,
            branch_id: formData.branch_id,
            order_type: 'DINE_IN',
            reservation_time: `${formData.reservation_date}T${formData.reservation_time}`,
            guest_count: formData.guest_count,
            paymentMethod: 'VNPAY',
            is_table_only: true
        };
        const response = await axiosClient.post('/orders/create', payload);
        if (response.paymentUrl) {
            window.location.assign(response.paymentUrl);
        } else {
            alert("Đã xảy ra lỗi khi tạo link thanh toán cọc!");
        }
    } catch (error) {
        alert(error.response?.data?.message || "Lỗi khi gửi yêu cầu đặt bàn!");
    }
  };

  const handleBookAndOrderFood = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const pendingReservation = {
        branch_id: formData.branch_id,
        reservation_time: `${formData.reservation_date}T${formData.reservation_time}`,
        guest_count: formData.guest_count,
        note: formData.note
    };
    
    localStorage.setItem('pendingReservation', JSON.stringify(pendingReservation));
    localStorage.setItem('selectedBranchId', formData.branch_id); // Đổi chi nhánh xem menu
    
    alert("Đã lưu thông tin bàn! Xin mời bạn chọn món ăn.");
    window.dispatchEvent(new Event("branchChanged"));
    navigate('/');
  };

  const validateForm = () => {
    if (!formData.reservation_date || !formData.reservation_time) {
        alert("Vui lòng chọn ngày và giờ đến hợp lệ! (Có thể chi nhánh đã hết giờ nhận khách trong ngày này)");
        return false;
    }
    const selectedDateTime = new Date(`${formData.reservation_date}T${formData.reservation_time}`);
    const minDateTime = new Date(new Date().getTime() + 1 * 60 * 60 * 1000);
    
    if (selectedDateTime < minDateTime) {
        alert("Vui lòng đặt bàn trước ít nhất 1 tiếng để nhà hàng chuẩn bị tốt nhất!");
        return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans flex justify-center">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gray-800 tracking-tight mb-3 flex justify-center items-center gap-3">
              <FaUtensils className="text-[#006a6a]" /> Đặt Bàn Tại Quán
          </h1>
          <p className="text-gray-500 font-medium">Lựa chọn vị trí tuyệt vời và thưởng thức những món ăn trứ danh</p>
        </div>

        <form className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="space-y-6 mb-8">
            {/* Chi nhánh */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><FaStore className="text-[#006a6a]"/> Chọn chi nhánh</label>
              <select 
                value={formData.branch_id}
                onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#006a6a]/20 outline-none transition font-semibold text-gray-700"
              >
                {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name || b.Name}</option>
                ))}
              </select>
            </div>

            {/* Thời gian & Số khách */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><FaCalendarAlt className="text-[#006a6a]"/> Ngày đến</label>
                    <input type="date" min={getMinDate()} max={getMaxDate()} value={formData.reservation_date} onChange={(e) => setFormData({...formData, reservation_date: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#006a6a]/20 transition"/>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><FaClock className="text-[#006a6a]"/> Giờ đến (Slot 30p)</label>
                    <select value={formData.reservation_time} onChange={(e) => setFormData({...formData, reservation_time: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#006a6a]/20 transition">
                        {timeSlots.length > 0 ? (
                            timeSlots.map(time => (
                                <option key={time} value={time}>{time}</option>
                            ))
                        ) : (
                            <option value="">Hết khung giờ trống</option>
                        )}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><FaUsers className="text-[#006a6a]"/> Số người</label>
                    <input type="number" min="1" max="50" value={formData.guest_count} onChange={(e) => setFormData({...formData, guest_count: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#006a6a]/20 transition text-center font-black text-lg text-[#006a6a]"/>
                </div>
            </div>

            {/* Thông tin liên hệ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tên người đặt</label>
                    <input type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#006a6a]/20 transition"/>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Số điện thoại</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#006a6a]/20 transition"/>
                </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Ghi chú cho nhà hàng</label>
              <textarea value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} placeholder="VD: Gốc cửa sổ, có trẻ em, chuẩn bị ghế ăn dặm..." rows="2" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#006a6a]/20 transition"></textarea>
            </div>
            
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="text-orange-800 text-sm font-medium leading-relaxed">
                    <span className="font-bold">⚠️ Rủi ro giữ chỗ:</span> Nếu bạn tự hủy đơn đặt bàn trong vòng <strong>2 tiếng</strong> trước giờ đến, hoặc bạn không đến (No-show), bạn sẽ <strong className="text-red-600">MẤT 100% TIỀN CỌC</strong>. Mong quý khách sắp xếp thời gian hợp lý.
                </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
            <button type="button" onClick={handleBookTableOnly} className="flex-1 py-4 bg-white border-2 border-[#006a6a] text-[#006a6a] font-bold rounded-2xl hover:bg-teal-200 transition cursor-pointer">
                CHỈ ĐẶT BÀN
            </button>
            <button type="button" onClick={handleBookAndOrderFood} className="flex-1 py-4 bg-white border-2 border-[#006a6a] text-[#006a6a] font-bold rounded-2xl hover:bg-teal-200 transition cursor-pointer">
                ĐẶT BÀN KÈM CHỌN MÓN 
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReservationPage;