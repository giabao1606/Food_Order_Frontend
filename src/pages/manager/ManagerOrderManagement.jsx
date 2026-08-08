import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import { MdClose } from 'react-icons/md';

const AdminOrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State cho Modal Hủy đơn
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    
    // State cho Modal Chi tiết
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);    

    const paymentStatusMap = {
        'PAID': 'Đã thanh toán',
        'UNPAID': 'Chưa thanh toán',
        'REFUNDED': 'Đã hoàn tiền'
    };
    
    const statusMap = {
        'PENDING': 'Chờ xác nhận',
        'PREPARING': 'Đang chuẩn bị',
        'DELIVERING': 'Đang giao',
        'COMPLETED': 'Hoàn thành',
        'CANCELLED': 'Đã hủy'
    };

    const fetchOrders = async (signal) => {
        try {
            const res = await axiosClient.get('/orders/admin/all', { signal });
            const data = res.data?.data || res.data || res;
            setOrders(Array.isArray(data) ? data : []);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error('Lỗi lấy danh sách đơn hàng:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchOrders(controller.signal);
        return () => controller.abort();
    }, []);     

    // Hàm gọi API lấy chi tiết đơn hàng
    const handleViewDetails = async (order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
        setLoadingDetails(true);
        try {
            const orderId = order.id || order.Id_order;
            const res = await axiosClient.get(`/orders/admin/${orderId}`);
            const data = res.data?.data || res.data || res;
            
            if (Array.isArray(data)) {
                setOrderItems(data);
            } else if (data && data.items) {
                setOrderItems(data.items);
            } else if (data && data.orderItems) {
                setOrderItems(data.orderItems);
            } else {
                setOrderItems([]);
            }
        } catch (error) {
            console.error('Lỗi lấy chi tiết đơn:', error);
            alert("Không thể tải chi tiết đơn hàng.");
        } finally {
            setLoadingDetails(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
        setOrderItems([]);
    };

    // FIX LỖI: Bổ sung hàm xử lý Hủy đơn bị thiếu gây sập trang
    const openCancelModal = (orderId) => {
        setOrderToCancel(orderId);
        setCancelReason('');
        setIsCancelModalOpen(true);
    };

    const handleCancelConfirm = async () => {
        if (!cancelReason.trim()) {
            alert('Vui lòng nhập lý do hủy đơn!');
            return;
        }
        try {
            // Lưu ý: Đảm bảo endpoint này khớp với route cancelOrderAdmin ở backend của bạn
            await axiosClient.put(`/orders/admin/cancel/${orderToCancel}`, { Cancel_Reason: cancelReason });
            alert('Hủy đơn hàng thành công!');
            setIsCancelModalOpen(false);
            fetchOrders(); // Load lại danh sách
        } catch (error) {
            console.error('Lỗi khi hủy đơn:', error);
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi hủy đơn.');
        }
    };

    const getStatusColor = (status) => {
        const s = (status || '').toUpperCase();
        switch (s) {
            case 'PENDING': return 'text-yellow-600 bg-yellow-50';
            case 'PREPARING': return 'text-blue-600 bg-blue-50';
            case 'DELIVERING': return 'text-purple-600 bg-purple-50';
            case 'COMPLETED': return 'text-green-600 bg-green-50';
            case 'CANCELLED': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    if (loading) return <div className="p-6 text-center">Đang tải danh sách...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen relative">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý Đơn hàng</h1>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 text-sm uppercase">
                                <th className="p-4 border-b ">Mã ĐH</th>
                                <th className="p-4 border-b ">Loại đơn</th>
                                <th className="p-4 border-b ">Khách hàng</th>
                                <th className="p-4 border-b ">Ngày đặt</th>
                                <th className="p-4 border-b ">Tổng tiền</th>
                                <th className="p-4 border-b ">Thanh toán</th>
                                <th className="p-4 border-b ">Trạng thái</th>
                                <th className="p-4 border-b text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => {
                                const orderId = order.id || order.Id_order;
                                // FIX LỖI: Lấy đúng cột 'name' và 'phone' từ DB
                                const customerName = order.name || order.User_name || order.recipient_name || 'Khách';
                                const customerPhone = order.phone || order.User_phone || order.recipient_phone || 'Không có';
                                const createdAt = order.created_at || order.Create_time;
                                const totalAmount = order.total_amount || order.Total_price;
                                const payStatus = (order.payment_status || order.Payment_Status || '').toUpperCase();
                                const payMethod = (order.payment_method || order.Payment_method || '').toUpperCase();
                                const status = (order.status || order.Status || '').toUpperCase();
                                const cancelReasonText = order.cancel_reason || order.Cancel_reason || '';
                                
                                return (
                                    <tr key={orderId} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-bold text-[#006a6a]">#{orderId}</td>
                                        <td className="p-4">
                                            {order.order_type === 'DINE_IN' ? (
                                                <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">ĐẶT BÀN</span>
                                            ) : (
                                                <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-bold">GIAO HÀNG</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-semibold text-gray-800">{customerName}</p>
                                            <p className="text-xs text-gray-500">{customerPhone}</p>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {createdAt ? new Date(createdAt).toLocaleString('vi-VN') : ''}
                                        </td>
                                        <td className="p-4 font-bold text-red-600">
                                            {Number(totalAmount).toLocaleString()}đ
                                        </td>
                                        <td className="p-4 text-sm">
                                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${payStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                                                {payMethod} - {paymentStatusMap[payStatus] || payStatus}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(status)}`}>
                                                {statusMap[status] || status}
                                            </span>
                                            {status === 'CANCELLED' && cancelReasonText && (
                                                <p className="text-[10px] text-red-500 mt-1 italic max-w-[120px] truncate" title={cancelReasonText}>
                                                    Lý do: {cancelReasonText}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4 text-center space-x-3">
                                            <button 
                                                onClick={() => handleViewDetails(order)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm cursor-pointer underline"
                                            >
                                                Xem
                                            </button>                                            
                                        </td>
                                    </tr>
                                );
                            })}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="p-6 text-center text-gray-500">Chưa có đơn hàng nào trên hệ thống.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Nhập Lý do Hủy Đơn */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 transition-all">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Hủy đơn hàng #{orderToCancel}</h2>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Lý do hủy đơn:</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                            rows="4"
                            placeholder="Nhập lý do hủy (Vd: Khách yêu cầu, Nhà hàng hết món...)"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                        ></textarea>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => {
                                    setIsCancelModalOpen(false);
                                    setCancelReason('');
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition"
                            >
                                Đóng
                            </button>
                            <button 
                                onClick={handleCancelConfirm}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition shadow-md"
                            >
                                Xác nhận hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Chi tiết đơn hàng cho Admin */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 transition-all">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-xl font-bold text-[#006a6a]">
                                Chi tiết Đơn hàng #{selectedOrder?.id || selectedOrder?.Id_order}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:bg-red-50 hover:text-red-500 p-2 rounded-full transition cursor-pointer">
                                <MdClose size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingDetails ? (
                                <div className="flex justify-center items-center h-32">
                                    <p className="text-gray-500 font-medium">Đang tải chi tiết...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Cột trái: Danh sách món */}
                                    <div className="lg:col-span-2 space-y-4">
                                        <h3 className="font-bold text-gray-800 border-b pb-2">Danh sách món ăn</h3>
                                        <div className="space-y-3">
                                            {orderItems.length > 0 ? orderItems.map((item, index) => {
                                                const qty = item.quantity || item.Quantity;
                                                const price = item.price || item.Total_item_price;
                                                const note = item.note || item.Note;

                                                return (
                                                    <div key={item.id || item.Id_order_item || index} className="flex gap-4 p-3 border border-gray-100 rounded-lg shadow-sm bg-gray-50/50">
                                                        <img src={item.food_img} alt={item.food_name} className="w-16 h-16 object-cover rounded-md" />
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="font-bold text-sm text-gray-800">{qty}x {item.food_name}</h4>
                                                                <p className="font-bold text-[#006a6a]">{Number(price).toLocaleString()}đ</p>
                                                            </div>
                                                            {item.options && item.options.length > 0 && (
                                                                <ul className="text-xs text-gray-500 mt-1 list-disc list-inside ml-2">
                                                                    {item.options.map((opt, idx) => {
                                                                        const optName = opt.option_name || opt.name || opt.Name;
                                                                        const optQty = opt.quantity || opt.Quantity || 1;
                                                                        return (
                                                                            <li key={opt.Id_order_item_option || idx}>
                                                                                {optName} {optQty > 1 ? `(x${optQty})` : ''}
                                                                            </li>
                                                                        )
                                                                    })}
                                                                </ul>
                                                            )}
                                                            {note && <p className="text-xs text-orange-600 mt-1.5 font-medium bg-orange-50 inline-block px-2 py-0.5 rounded">Ghi chú: {note}</p>}
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <div className="text-gray-500 text-sm italic">
                                                    (Đơn hàng này không có món ăn - Yêu cầu đặt bàn trống)
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cột phải: Thông tin giao hàng & Tóm tắt */}
                                    <div className="space-y-6">
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase">Khách hàng</h3>
                                            <div className="space-y-2 text-sm text-gray-600">
                                                {/* FIX LỖI: Cập nhật đúng trường thông tin User name và phone */}
                                                <p><span className="font-medium text-gray-800">Tên:</span> {selectedOrder?.name || selectedOrder?.User_name || 'Khách'}</p>
                                                <p><span className="font-medium text-gray-800">SĐT:</span> {selectedOrder?.phone || selectedOrder?.User_phone || 'Không có'}</p>
                                                
                                                {selectedOrder?.order_type === 'DELIVERY' && (
                                                    <p><span className="font-medium text-gray-800">Địa chỉ:</span> {selectedOrder?.shipping_address || selectedOrder?.Address}</p>
                                                )}
                                                
                                                {(selectedOrder?.note || selectedOrder?.Note) && (
                                                    <p><span className="font-medium text-gray-800">Lưu ý:</span> {selectedOrder?.note || selectedOrder?.Note}</p>
                                                )}
                                            </div>
                                        </div>

                                        {selectedOrder?.order_type === 'DINE_IN' && (
                                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                                <h3 className="font-bold text-indigo-800 mb-3 text-sm uppercase">Chi tiết đặt bàn</h3>
                                                <div className="space-y-2 text-sm text-gray-700">
                                                    <p><span className="font-medium text-gray-800">Thời gian:</span> {selectedOrder.reservation_time}</p>
                                                    <p><span className="font-medium text-gray-800">Số người:</span> {selectedOrder.guest_count} người</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-[#006a6a]/5 p-4 rounded-xl border border-[#006a6a]/20">
                                            <h3 className="font-bold text-[#006a6a] mb-3 text-sm uppercase">Thanh toán</h3>
                                            <div className="space-y-2 text-sm">
                                                {selectedOrder?.order_type === 'DELIVERY' && (
                                                    <div className="flex justify-between text-gray-600">
                                                        <span>Phí ship:</span>
                                                        <span>{Number(selectedOrder?.shipping_fee || selectedOrder?.Shipping_fee || 0).toLocaleString()}đ</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-green-600">
                                                    <span>Giảm giá:</span>
                                                    <span>-{Number(selectedOrder?.discount_amount || selectedOrder?.Discount_amount || 0).toLocaleString()}đ</span>
                                                </div>
                                                <div className="border-t border-[#006a6a]/20 my-2 pt-2 flex justify-between items-center">
                                                    <span className="font-bold text-gray-800">TỔNG:</span>
                                                    <span className="text-xl font-black text-red-600">{Number(selectedOrder?.total_amount || selectedOrder?.Total_price).toLocaleString()}đ</span>
                                                </div>
                                                {Number(selectedOrder?.remaining_amount || 0) > 0 && (
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="font-bold text-orange-600">CÒN NỢ:</span>
                                                        <span className="text-xl font-black text-orange-600">{Number(selectedOrder?.remaining_amount).toLocaleString()}đ</span>
                                                    </div>
                                                )}
                                                <div className="mt-3 text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${(selectedOrder?.payment_status || selectedOrder?.Payment_Status || '').toUpperCase() === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {(selectedOrder?.payment_method || selectedOrder?.Payment_method || '').toUpperCase()} - {paymentStatusMap[(selectedOrder?.payment_status || selectedOrder?.Payment_Status || '').toUpperCase()] || selectedOrder?.payment_status || selectedOrder?.Payment_Status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrderManagement;