import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axiosClient from '../../utils/axiosClient';

const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL || 'https://food-order-backend-myjy.onrender.com';

const OrderQueuePage = () => {
    const [orders, setOrders] = useState({
        pending: [],   
        cooking: [],   
        delivering: [] 
    });

    const [dineInOrders, setDineInOrders] = useState({
        pending: [],
        confirmed: [],
        checked_in: []
    });

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const currentBranchId = user ? user.branch_id : null;

    // Reschedule State
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [rescheduleOrderId, setRescheduleOrderId] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [timeSlots, setTimeSlots] = useState([]);
    const [branchInfo, setBranchInfo] = useState(null);

    // Generate Time Slots for Reschedule
    useEffect(() => {
        if (!rescheduleDate) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTimeSlots([]);
            return;
        }
        
        const openTime = branchInfo?.opening_time || '09:00:00';
        const closeTime = branchInfo?.closing_time || '22:00:00';

        const slots = [];
        const start = new Date(`${rescheduleDate}T${openTime}`);
        const end = new Date(`${rescheduleDate}T${closeTime}`);

        let current = start;
        while (current <= end) {
            const timeStr = current.toTimeString().slice(0, 5);
            slots.push(timeStr);
            current = new Date(current.getTime() + 30 * 60 * 1000);
        }
        setTimeSlots(slots);
        if (slots.length > 0 && !rescheduleTime) {
            // we don't aggressively override rescheduleTime if it's already set by openRescheduleModal
        } else if (slots.length > 0 && !slots.includes(rescheduleTime)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRescheduleTime(slots[0]);
        }
    }, [rescheduleDate, branchInfo]);

    const fetchInitialOrders = async () => {
        try {
            const res = await axiosClient.get('/orders/branch/current'); 
            const data = res.data?.data || res.data || res;
            
            if (data && data.branchInfo) {
                setBranchInfo(data.branchInfo);
            }

            let rawOrders = [];
            if (data && data.orders) {
                rawOrders = [
                    ...(data.orders.pending||[]), 
                    ...(data.orders.cooking||[]), 
                    ...(data.orders.delivering||[]),
                    ...(data.orders.confirmed||[]),
                    ...(data.orders.checked_in||[])
                ];
            } else if (Array.isArray(data)) {
                rawOrders = data;
            }

            const deliveryPickup = rawOrders.filter(o => o.order_type !== 'DINE_IN');
            const dineIn = rawOrders.filter(o => o.order_type === 'DINE_IN');

            setOrders({
                pending: deliveryPickup.filter(o => o.status === 'PENDING').sort((a, b) => Number(b.total_amount) - Number(a.total_amount)),
                cooking: deliveryPickup.filter(o => o.status === 'PREPARING' || o.status === 'Đang chuẩn bị'),
                delivering: deliveryPickup.filter(o => o.status === 'DELIVERING' || o.status === 'Đang giao')
            });

            setDineInOrders({
                pending: dineIn.filter(o => o.status === 'PENDING').sort((a, b) => new Date(a.reservation_time) - new Date(b.reservation_time)),
                confirmed: dineIn.filter(o => o.status === 'CONFIRMED').sort((a, b) => new Date(a.reservation_time) - new Date(b.reservation_time)),
                checked_in: dineIn.filter(o => o.status === 'CHECKED_IN')
            });
        } catch (err) {
            console.error("Lỗi tải đơn hàng ban đầu:", err);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchInitialOrders();
        if (!currentBranchId) return;

        const socket = io(SOCKET_SERVER_URL);
        socket.emit('join_branch_room', currentBranchId); 

        socket.on('new_order_admin', (data) => {
            if (Number(data.branchId) === Number(currentBranchId)) {
                const audio = new Audio('/ringtone.mp3'); // Đảm bảo bạn có file này trong thư mục public
                audio.play().catch(e => console.log('Trình duyệt chặn Autoplay âm thanh:', e));
                fetchInitialOrders();
            }
        });

        return () => socket.disconnect();
    }, [currentBranchId]);

    // 1. HÀM TỪ CHỐI ĐƠN HÀNG (Chỉ MANAGER/ADMIN)
    const handleRejectOrder = async (orderId) => {
        const reason = window.prompt("Vui lòng nhập lý do từ chối đơn hàng này (Bắt buộc):");
        if (reason === null) return; // Người dùng bấm Cancel
        if (reason.trim() === "") {
            alert("Bạn phải nhập lý do để từ chối đơn hàng!");
            return;
        }

        try {
            // Gọi đúng API cancelOrderAdmin (verifyAdminOrManagerOnly) — STAFF bị chặn cả backend lẫn frontend
            await axiosClient.put(`/orders/admin/cancel/${orderId}`, { Cancel_Reason: reason });
            
            // Xóa khỏi danh sách chờ
            setOrders(prev => ({
                ...prev,
                pending: prev.pending.filter(o => o.id !== orderId)
            }));
        } catch (error) {
            alert(error.response?.data?.message || 'Lỗi khi từ chối đơn. Vui lòng thử lại.');
        }
    };

    // 2. HÀM TIẾP NHẬN ĐƠN VÀO BẾP
    const handleAcceptOrder = async (orderId) => {
        try {
            await axiosClient.put(`/orders/${orderId}/status`, { status: 'PREPARING' });
            fetchInitialOrders(); // Gọi lại để đồng bộ UI an toàn nhất
        } catch (error) {
            alert('Lỗi khi tiếp nhận đơn. Vui lòng thử lại.');
        }
    };

    // 3. HÀM BÁO NẤU XONG VÀ ĐI GIAO
    const handleDeliveryOrder = async (orderId) => {
        try {
            await axiosClient.put(`/orders/${orderId}/status`, { status: 'DELIVERING' });
            fetchInitialOrders(); 
        } catch (error) {
            alert('Lỗi cập nhật trạng thái.');
        }
    };

    // 4. HÀM XÁC NHẬN GIAO THÀNH CÔNG (KẾT THÚC VÒNG ĐỜI ĐƠN)
    const handleCompleteOrder = async (orderId) => {
        if(!window.confirm("Xác nhận đơn hàng hoàn tất ?")) return;
        try {
            await axiosClient.put(`/orders/${orderId}/status`, { status: 'COMPLETED' });
            fetchInitialOrders(); // Gọi lại hàm lấy dữ liệu, đơn COMPLETED sẽ biến mất khỏi bảng Kanban này
        } catch (error) {
            alert('Lỗi cập nhật trạng thái.');
        }
    };

    // DINE_IN ACTIONS
    const handleConfirmDineIn = async (orderId) => {
        try {
            await axiosClient.put(`/orders/${orderId}/status`, { status: 'CONFIRMED' });
            fetchInitialOrders();
        } catch (error) {
            alert('Lỗi cập nhật trạng thái.');
        }
    };

    const handleCheckIn = async (orderId) => {
        try {
            await axiosClient.put(`/orders/${orderId}/status`, { status: 'CHECKED_IN' });
            fetchInitialOrders();
        } catch (error) {
            alert('Lỗi cập nhật trạng thái.');
        }
    };

    const openRescheduleModal = (orderId, currentReservationTime) => {
        setRescheduleOrderId(orderId);
        setIsRescheduleModalOpen(true);
        if (currentReservationTime) {
            const dateObj = new Date(currentReservationTime);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            setRescheduleDate(`${year}-${month}-${day}`);
            
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            
            // Đợi component render xong date và generate time slots, sau đó setRescheduleTime
            // Nhưng state batching sẽ lo việc này, tuy nhiên options phải chứa time này
            setRescheduleTime(`${hours}:${minutes}`);
        } else {
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            setRescheduleDate(dateStr);
            setRescheduleTime('');
        }
    };

    const submitReschedule = async () => {
        if (!rescheduleDate || !rescheduleTime) {
            alert('Vui lòng chọn ngày và giờ!');
            return;
        }
        const newTimeStr = `${rescheduleDate}T${rescheduleTime}`;
        try {
            const res = await axiosClient.put(`/orders/${rescheduleOrderId}/reschedule`, { newTime: newTimeStr });
            if (res.success) {
                alert("Đã dời lịch thành công!");
                setIsRescheduleModalOpen(false);
                fetchInitialOrders();
            } else {
                alert(res.message || "Không thể dời lịch");
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Lỗi khi dời lịch.');
        }
    };

    const renderToppingNotes = (toppingData) => {
        if (!toppingData || toppingData === '[]' || toppingData === '{}') return null;
        
        try {
            // Nếu là chuỗi JSON thì parse ra object, nếu đã là object thì giữ nguyên
            const parsed = typeof toppingData === 'string' ? JSON.parse(toppingData) : toppingData;
            
            // Xử lý nếu đúng chuẩn Object { note, options } của hệ thống giỏ hàng
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                let textArr = [];
                // 1. In danh sách topping
                if (parsed.options && parsed.options.length > 0) {
                    const opts = parsed.options.map(opt => `${opt.name} (x${opt.quantity || 1})`).join(', ');
                    textArr.push(`Thêm: ${opts}`);
                }
                // 2. In ghi chú riêng của món đó
                if (parsed.note) {
                    textArr.push(`Dặn dò: ${parsed.note}`);
                }
                
                if (textArr.length === 0) return null;
                
                return (
                    <span className="text-gray-600 text-xs ml-4 italic block mt-1">
                        {textArr.join(' | ')}
                    </span>
                );
            }
            
            // Fallback (Dự phòng): Nếu là chuỗi thường hoặc mảng
            return <span className="text-gray-600 text-xs ml-4 italic block mt-1">Ghi chú: {typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}</span>;
        } catch (e) {
            // Nếu parse lỗi, in ra nguyên gốc
            return <span className="text-gray-600 text-xs ml-4 italic block mt-1">Ghi chú: {toppingData}</span>;
        }
    };
    // Component hiển thị thẻ đơn hàng
    const OrderCard = ({ order, statusType }) => (
        <div className={`bg-white p-4 rounded-lg shadow mb-4 border-l-4 ${
            statusType === 'pending' ? 'border-orange-500' : 
            statusType === 'cooking' ? 'border-blue-500' : 'border-green-500'
        }`}>
            <div className="flex justify-between items-start border-b pb-2 mb-2">
                <div>
                    <h4 className="font-black text-gray-800 text-lg">#{order.id}</h4>
                    <span className="text-xs text-gray-500">{new Date(order.created_at || order.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="text-right">
                    <span className="block font-black text-red-500">{Number(order.total_amount || 0).toLocaleString()}đ</span>
                    {Number(order.remaining_amount) > 0 && (
                        <span className="block font-bold text-xs text-orange-600 mt-0.5">Cần thu: {Number(order.remaining_amount).toLocaleString()}đ</span>
                    )}
                    {/* HUY HIỆU LOẠI ĐƠN HÀNG */}
                    {order.order_type === 'DINE_IN' && <span className="inline-block mt-1 bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Bàn {order.guest_count} người</span>}
                    {order.order_type === 'TAKEAWAY' && <span className="inline-block mt-1 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Mang về</span>}
                    {(!order.order_type || order.order_type === 'DELIVERY') && <span className="inline-block mt-1 bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Giao tận nơi</span>}
                </div>
            </div>
            
            {/* Nếu là đặt bàn, nhắc nhở giờ khách tới */}
            {order.order_type === 'DINE_IN' && order.reservation_time && (
                <div className="bg-purple-50 text-purple-700 p-2 rounded mb-2 text-xs flex flex-col gap-1 border border-purple-100">
                    <span className="font-bold flex items-center gap-1">
                        ⏰ Giờ khách đến: {new Date(order.reservation_time).toLocaleString('vi-VN', { hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}
                    </span>
                    <span className={`font-bold flex items-center gap-1 ${
                        (order.deposit_status || '').toUpperCase() === 'PAID' ? 'text-indigo-600' : 
                        (order.deposit_status || '').toUpperCase() === 'REFUNDED' ? 'text-green-600' : 
                        (order.deposit_status || '').toUpperCase() === 'FORFEITED' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                        💵 Tiền cọc: {
                            (order.deposit_status || '').toUpperCase() === 'PAID' ? 'Đã cọc' :
                            (order.deposit_status || '').toUpperCase() === 'REFUNDED' ? 'Đã hoàn cọc' :
                            (order.deposit_status || '').toUpperCase() === 'FORFEITED' ? 'Đã mất cọc' : 'Chưa cọc'
                        }
                    </span>
                </div>
            )}

            <div className="mb-2 text-sm bg-gray-50 p-2 rounded">
                <p><strong>Khách:</strong> {order.name} - {order.phone}</p>
                {order.note && <p className="text-red-600 font-medium mt-1"><strong>Ghi chú:</strong> {order.note}</p>}
            </div>

            <ul className="text-sm mb-4 space-y-2">
                {order.items?.map((item, idx) => (
                    <li key={idx} className="flex flex-col border-b border-gray-100 pb-2">
                        <span className="font-semibold text-base">{item.quantity}x {item.food_name || item.name}</span>
                        {renderToppingNotes(item.topping_notes)}
                    </li>
                ))}
            </ul>
            
            {statusType === 'pending' && order.order_type !== 'DINE_IN' && (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleRejectOrder(order.id)}
                        className="w-1/3 bg-red-100 text-red-600 py-2 rounded font-bold hover:bg-red-200 transition text-sm"
                    >
                        TỪ CHỐI
                    </button>
                    <button
                        onClick={() => handleAcceptOrder(order.id)}
                        className="w-2/3 bg-orange-500 text-white py-2 rounded font-bold hover:bg-orange-600 transition text-sm"
                    >
                        NHẬN ĐƠN
                    </button>
                </div>
            )}
            {statusType === 'cooking' && (
                <button onClick={() => handleDeliveryOrder(order.id)} className="w-full bg-blue-500 text-white py-2 rounded font-bold hover:bg-blue-600 transition">XONG - BẮT ĐẦU GIAO/PHỤC VỤ</button>
            )}
            {statusType === 'delivering' && (
                <button onClick={() => handleCompleteOrder(order.id)} className="w-full bg-green-500 text-white py-2 rounded font-bold hover:bg-green-600 transition">ĐÃ HOÀN TẤT ĐƠN</button>
            )}

            {/* DINE_IN ACTIONS */}
            {statusType === 'pending_dinein' && (
                <div className="flex gap-2 mb-2">
                    <button onClick={() => handleRejectOrder(order.id)} className="w-1/3 bg-red-100 text-red-600 py-2 rounded font-bold hover:bg-red-200 transition text-sm">TỪ CHỐI</button>
                    <button onClick={() => handleConfirmDineIn(order.id)} className="w-2/3 bg-purple-500 text-white py-2 rounded font-bold hover:bg-purple-600 transition text-sm">XÁC NHẬN BÀN</button>
                </div>
            )}
            {statusType === 'confirmed' && (
                <button onClick={() => handleCheckIn(order.id)} className="w-full bg-indigo-500 text-white py-2 rounded font-bold hover:bg-indigo-600 transition mb-2">KHÁCH ĐÃ ĐẾN (CHECK-IN)</button>
            )}
            
            {(statusType === 'pending_dinein' || statusType === 'confirmed') && (
                <button onClick={() => openRescheduleModal(order.id, order.reservation_time)} className="w-full bg-gray-200 text-gray-700 py-1.5 rounded font-bold hover:bg-gray-300 transition text-sm">DỜI LỊCH</button>
            )}

            {statusType === 'checked_in' && (
                <button onClick={() => handleCompleteOrder(order.id)} className="w-full bg-teal-500 text-white py-2 rounded font-bold hover:bg-teal-600 transition">HOÀN TẤT DÙNG BỮA</button>
            )}
        </div>
    );

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">GIAO HÀNG & NHẬN TẠI QUẦY (DELIVERY & PICKUP)</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-gray-200 rounded-lg p-4 min-h-[400px]">
                    <h2 className="font-bold text-lg mb-4 text-orange-600 uppercase">
                        Đơn chờ nhận ({orders.pending.length})
                    </h2>
                    {orders.pending.map(order => (
                        <OrderCard key={order.id} order={order} statusType="pending" />
                    ))}
                </div>

                <div className="bg-gray-200 rounded-lg p-4 min-h-[400px]">
                    <h2 className="font-bold text-lg mb-4 text-blue-600 uppercase">
                        Đang làm bếp ({orders.cooking.length})
                    </h2>
                    {orders.cooking.map(order => (
                        <OrderCard key={order.id} order={order} statusType="cooking" />
                    ))}
                </div>

                <div className="bg-gray-200 rounded-lg p-4 min-h-[400px]">
                    <h2 className="font-bold text-lg mb-4 text-green-600 uppercase">
                        Đang đi giao ({orders.delivering.length})
                    </h2>
                    {orders.delivering.map(order => (
                        <OrderCard key={order.id} order={order} statusType="delivering" />
                    ))}
                </div>
            </div>

            <h1 className="text-2xl font-bold mb-6 text-purple-800 flex items-center gap-2">
                <span className="text-3xl">🍽️</span> ĐẶT BÀN TẠI QUÁN (DINE-IN)
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-purple-100 rounded-lg p-4 min-h-[400px]">
                    <h2 className="font-bold text-lg mb-4 text-purple-600 uppercase">
                        Yêu cầu mới ({dineInOrders.pending.length})
                    </h2>
                    {dineInOrders.pending.map(order => (
                        <OrderCard key={order.id} order={order} statusType="pending_dinein" />
                    ))}
                </div>

                <div className="bg-indigo-100 rounded-lg p-4 min-h-[400px]">
                    <h2 className="font-bold text-lg mb-4 text-indigo-600 uppercase">
                        Đã xác nhận bàn ({dineInOrders.confirmed.length})
                    </h2>
                    {dineInOrders.confirmed.map(order => (
                        <OrderCard key={order.id} order={order} statusType="confirmed" />
                    ))}
                </div>

                <div className="bg-teal-100 rounded-lg p-4 min-h-[400px]">
                    <h2 className="font-bold text-lg mb-4 text-teal-600 uppercase">
                        Khách đang dùng bữa ({dineInOrders.checked_in.length})
                    </h2>
                    {dineInOrders.checked_in.map(order => (
                        <OrderCard key={order.id} order={order} statusType="checked_in" />
                    ))}
                </div>
            </div>

            {/* Reschedule Modal */}
            {isRescheduleModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-gradient-to-r from-[#006a6a] to-teal-500 p-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg">Dời lịch Đặt Bàn (Đơn #{rescheduleOrderId})</h3>
                            <button onClick={() => setIsRescheduleModalOpen(false)} className="text-white hover:text-red-200 text-xl font-bold">
                                &times;
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Chọn ngày:</label>
                                <input 
                                    type="date" 
                                    min={new Date().toISOString().split('T')[0]} 
                                    value={rescheduleDate} 
                                    onChange={e => setRescheduleDate(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-[#006a6a] focus:border-[#006a6a]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Chọn giờ (Theo giờ hoạt động của chi nhánh):</label>
                                {timeSlots.length > 0 ? (
                                    <select 
                                        value={rescheduleTime} 
                                        onChange={e => setRescheduleTime(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-[#006a6a] focus:border-[#006a6a]"
                                    >
                                        <option value="" disabled>-- Chọn giờ --</option>
                                        {timeSlots.map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="p-2 text-sm text-red-500 bg-red-50 rounded font-medium">
                                        Không còn khung giờ trống trong ngày này. Vui lòng chọn ngày khác!
                                    </div>
                                )}
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button onClick={() => setIsRescheduleModalOpen(false)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300">
                                    Hủy
                                </button>
                                <button onClick={submitReschedule} disabled={!rescheduleDate || !rescheduleTime} className="flex-1 py-2 bg-[#006a6a] text-white rounded font-bold hover:bg-teal-700 disabled:opacity-50 transition">
                                    Xác nhận Dời Lịch
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderQueuePage;