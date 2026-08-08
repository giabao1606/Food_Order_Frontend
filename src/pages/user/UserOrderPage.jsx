import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import ComplaintModal from '../../components/user/ComplaintModal';
import OrderReviewModal from '../../components/user/OrderReviewModal';

const VNPayCountdown = ({ createdAt }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        const calculateTime = () => {
            // Fix Safari/iOS issue with MySQL datetime string
            // Fix Safari/iOS issue and ensure timezone is Vietnam time (+07:00)
            let safeDate = createdAt;
            if (typeof createdAt === 'string' && createdAt.includes(' ') && !createdAt.includes('T')) {
                safeDate = createdAt.replace(' ', 'T') + '+07:00';
            }
            const orderTime = new Date(safeDate).getTime();
            const now = new Date().getTime();
            const diff = (orderTime + 15 * 60 * 1000) - now;

            if (diff <= 0) {
                setExpired(true);
                setTimeLeft('00:00');
                return false;
            }

            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            return true;
        };

        if (calculateTime()) {
            const timer = setInterval(calculateTime, 1000);
            return () => clearInterval(timer);
        }
    }, [createdAt]);

    if (expired) {
        return <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded text-xs border border-red-100">Đã hết hạn thanh toán</span>;
    }

    return (
        <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded text-xs border border-orange-100 flex items-center gap-1">
            <span className="animate-pulse">⏳</span> Còn {timeLeft}
        </span>
    );
};

const UserOrderPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState(null);
    
    // TÍNH NĂNG MỚI: State cho Tabs lọc trạng thái
    const [activeTab, setActiveTab] = useState('ALL');

    // State cho Modal chi tiết đơn hàng
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // State cho Modal khiếu nại
    const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
    const [orderToComplain, setOrderToComplain] = useState(null);

    // State cho Modal đánh giá
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [orderToReview, setOrderToReview] = useState(null);

    const fetchMyOrders = async (signal) => {
        try {
            const data = await axiosClient.get('/orders/my-orders', { signal });
            setOrders(data);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error('Lỗi lấy đơn hàng:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.title = "Đơn hàng của tôi";
        const controller = new AbortController();
        fetchMyOrders(controller.signal);
        
        const handleOrderUpdated = () => {
            fetchMyOrders(controller.signal);
        };
        window.addEventListener("orderUpdated", handleOrderUpdated);
        
        return () => {
            controller.abort();
            window.removeEventListener("orderUpdated", handleOrderUpdated);
        };
    }, []);

    const handleViewDetails = async (order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
        setLoadingDetails(true);
        try {
            const orderId = order.id || order.Id_order;
            const res = await axiosClient.get(`/orders/${orderId}`);
            if (res.success) {
                setOrderItems(res.items);
                if (res.order) setSelectedOrder(res.order);
            }
        } catch (error) {
            console.error('Lỗi lấy chi tiết đơn:', error);
            alert("Không thể tải chi tiết đơn hàng. Vui lòng thử lại sau.");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleCancelOrder = async (order) => {
        let confirmMessage = 'Bạn có chắc chắn muốn hủy đơn hàng này không?';
        
        const currentStatus = String(order.status || order.Status || '').toUpperCase();
        const paymentMethod = String(order.payment_method || order.Payment_method || '').toUpperCase();

        if ((currentStatus === 'PREPARING' || currentStatus === 'DELIVERING') && paymentMethod === 'VNPAY') {
            confirmMessage = 'Đơn hàng đang được chuẩn bị. Nếu hủy bây giờ, bạn sẽ không được hoàn tiền. Bạn vẫn muốn tiếp tục hủy?';
        }

        if (window.confirm(confirmMessage)) {
            try {
                const orderId = order.id || order.Id_order;
                const res = await axiosClient.post(`/orders/${orderId}/cancel`);
                if (res.success) {
                    alert('Hủy đơn hàng thành công!');
                    setOrders(orders.map(o => 
                        (o.id === orderId || o.Id_order === orderId) ? { ...o, status: 'CANCELLED' } : o
                    ));
                }
            } catch (error) {
                console.error('Lỗi khi hủy đơn:', error);
                alert(error.response?.data?.message || 'Không thể hủy đơn hàng lúc này.');
            }
        }
    };

    const handleRetryPayment = async (orderId) => {
        try {
            const res = await axiosClient.post(`/orders/${orderId}/retry-payment`);
            if (res.success && res.paymentUrl) {
                window.location.href = res.paymentUrl;
            }
        } catch (error) {
            console.error('Lỗi khi gọi API thanh toán lại:', error);
            alert(error.response?.data?.message || 'Không thể thanh toán lại lúc này. Đơn hàng có thể đã quá hạn.');
            const controller = new AbortController();
            fetchMyOrders(controller.signal);
        }
    };

    const handleOpenComplaint = (order) => {
        const completedTime = new Date(order.Completed_time || order.updated_at).getTime();
        const now = new Date().getTime();
        const diffHours = (now - completedTime) / (1000 * 60 * 60);
        
        if (diffHours > 24) {
            alert("Đã quá 24 giờ kể từ khi đơn hàng hoàn thành. Bạn không thể gửi khiếu nại nữa.");
            return;
        }
        setOrderToComplain(order);
        setIsComplaintModalOpen(true);
    };

    const handleOpenReview = async (order) => {
        setLoadingDetails(true);
        try {
            const orderId = order.id || order.Id_order;
            const res = await axiosClient.get(`/orders/${orderId}`);
            if (res.success) {
                setOrderToReview({ ...order, items: res.items });
                setIsReviewModalOpen(true);
            }
        } catch (error) {
            console.error('Lỗi lấy chi tiết đơn để đánh giá:', error);
            alert("Không thể tải thông tin đơn hàng để đánh giá. Vui lòng thử lại.");
        } finally {
            setLoadingDetails(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
        setOrderItems([]);
    };

    const getStatusTextAndColor = (status) => {
        const safeStatus = String(status || '').toUpperCase();
        switch (safeStatus) {
            case 'PENDING': return { text: 'Chờ xác nhận', color: 'text-yellow-600', bg: 'bg-yellow-50' };
            case 'PREPARING': return { text: 'Đang chuẩn bị', color: 'text-blue-600', bg: 'bg-blue-50' };
            case 'CONFIRMED': return { text: 'Đã xác nhận', color: 'text-green-600', bg: 'bg-green-50' }; 
            case 'CHECKED_IN': return { text: 'Đã nhận bàn', color: 'text-green-600', bg: 'bg-green-50'};
            case 'DELIVERING': return { text: 'Đang giao hàng', color: 'text-purple-600', bg: 'bg-purple-50' };
            case 'COMPLETED': return { text: 'Đã hoàn thành', color: 'text-green-600', bg: 'bg-green-50' };
            case 'CANCELLED': return { text: 'Đã hủy', color: 'text-red-600', bg: 'bg-red-50' };
            default: return { text: safeStatus, color: 'text-gray-600', bg: 'bg-gray-50' };
        }
    };

    const getPaymentStatusText = (status) => {
        const safeStatus = String(status || '').toUpperCase();
        if (safeStatus === 'PAID') return 'Đã thanh toán';
        if (safeStatus === 'REFUNDED') return 'Đã hoàn tiền';
        return 'Chưa thanh toán';
    };

    const getDepositStatusText = (depositStatus, paymentStatus) => {
        if (String(paymentStatus || '').toUpperCase() === 'PAID') return 'Đã thanh toán 100%';
        const safeStatus = String(depositStatus || '').toUpperCase();
        if (safeStatus === 'PAID') return 'Đã cọc';
        if (safeStatus === 'REFUNDED') return 'Đã hoàn cọc';
        if (safeStatus === 'FORFEITED') return 'Đã mất cọc';
        return 'Chưa cọc';
    };

    // LOGIC LỌC ĐƠN HÀNG THEO TAB
    const filteredOrders = orders.filter(order => {
        const status = String(order.status || order.Status || '').toUpperCase();
        if (activeTab === 'ALL') return true;
        if (activeTab === 'PROCESSING') return status === 'PENDING' || status === 'PREPARING';
        if (activeTab === 'DELIVERING') return status === 'DELIVERING';
        if (activeTab === 'COMPLETED') return status === 'COMPLETED';
        if (activeTab === 'CANCELLED') return status === 'CANCELLED';
        return true;
    });

    const TABS = [
        { id: 'ALL', label: 'Tất cả' },
        { id: 'PROCESSING', label: 'Đang xử lý' },
        { id: 'DELIVERING', label: 'Đang giao' },
        { id: 'COMPLETED', label: 'Hoàn thành' },
        { id: 'CANCELLED', label: 'Đã hủy' }
    ];

    if (loading) return <div className="min-h-screen flex items-center justify-center font-medium text-gray-500">Đang tải dữ liệu đơn hàng...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Thanh Tabs */}
            <div className="bg-white sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto flex overflow-x-auto hide-scrollbar">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 px-6 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                                activeTab === tab.id 
                                    ? 'border-[#006a6a] text-[#006a6a]' 
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-4xl mx-auto mt-6 px-4 md:px-0">
                {filteredOrders.length === 0 ? (
                    <div className="bg-white p-10 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center border border-gray-100">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-4xl">📦</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Chưa có đơn hàng nào</h3>
                        <p className="text-gray-500 text-sm">Bạn chưa có đơn hàng nào trong trạng thái này.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => {
                            const orderId = order.id || order.Id_order;
                            const status = String(order.status || order.Status || '').toUpperCase();
                            const createdAt = order.created_at || order.Create_time;
                            const estimatedTime = order.estimated_arrival_time || order.Estimated_arrival_time;
                            const address = order.shipping_address || order.Address;
                            const totalPrice = order.total_amount || order.Total_price;
                            const complaintStatus = String(order.ComplaintStatus || order.complaint_status || '').toUpperCase();
                            const paymentMethod = String(order.payment_method || order.Payment_method || '').toUpperCase();
                            const isReviewed = order.is_reviewed || order.Is_reviewed || false;
                            
                            const statusDisplay = getStatusTextAndColor(status);

                            return (
                                <div key={orderId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                    {/* Header Đơn hàng */}
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-800">Đơn hàng #{orderId}</span>
                                            <span className="text-gray-400 text-xs hidden md:inline">• {new Date(createdAt).toLocaleString('vi-VN')}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {complaintStatus && (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    complaintStatus === 'PENDING' ? 'bg-orange-100 text-orange-600' :
                                                    complaintStatus === 'RESOLVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                    {complaintStatus === 'PENDING' ? 'Đang khiếu nại' : 
                                                     complaintStatus === 'RESOLVED' ? 'Đã xử lý khiếu nại' : 'Khiếu nại bị từ chối'}
                                                </span>
                                            )}
                                            <span className={`text-sm font-bold uppercase tracking-wide ${statusDisplay.color}`}>
                                                {statusDisplay.text}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Body Đơn hàng */}
                                    <div className="p-4 md:p-5 flex flex-col md:flex-row justify-between items-start gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-start gap-2 text-sm">
                                                <span className="text-gray-400 mt-0.5">📍</span>
                                                <span className="text-gray-600 line-clamp-2">{address}</span>
                                            </div>
                                            
                                            {status !== 'COMPLETED' && status !== 'CANCELLED' && (
                                                order.order_type === 'DINE_IN' ? (order.reservation_time && (
                                                    <div className="flex items-center gap-2 text-sm mt-2">
                                                        <span className="text-orange-500">⏱️</span>
                                                        <span className="text-gray-600">Thời gian đặt bàn: </span>
                                                        <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                                            {new Date(order.reservation_time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    )
                                                ) : (estimatedTime && (
                                                <div className="flex items-center gap-2 text-sm mt-2">
                                                    <span className="text-orange-500">⏱️</span>
                                                    <span className="text-gray-600">Dự kiến nhận: </span>                                                    
                                                    <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                                        {new Date(estimatedTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                        )
                                                    )
                                                )
                                            }
                                        </div>
                                        
                                        {/* Tổng tiền bên phải */}
                                        <div className="text-right w-full md:w-auto border-t md:border-t-0 border-gray-100 pt-3 md:pt-0 pl-0 md:pl-4">
                                            <p className="text-sm text-gray-500 mb-0.5">Thành tiền</p>
                                            <p className="text-xl font-black text-[#006a6a]">{Number(totalPrice).toLocaleString()}đ</p>
                                        </div>
                                    </div>

                                    {/* Footer Nút thao tác */}
                                    <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                        
                                        {/* Cột trái: Nút hủy & Countdown VNPay */}
                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                const paymentMethodStatus = String(order.payment_status || order.Payment_Status || '').toUpperCase();
                                                const depositMethodStatus = String(order.deposit_status || '').toUpperCase();
                                                const isVNPayPending = status === 'PENDING' && (paymentMethod === 'VNPAY' || paymentMethod === 'VNPAY_DEPOSIT') && (paymentMethodStatus === 'UNPAID' && depositMethodStatus === 'UNPAID' || !order.payment_status && !order.deposit_status);

                                                return (
                                                    <>
                                                        {isVNPayPending && <VNPayCountdown createdAt={createdAt} />}
                                                        {(status === 'PENDING' || ((status === 'PREPARING' || status === 'DELIVERING') && paymentMethod === 'VNPAY')) && (
                                                            <button 
                                                                onClick={() => handleCancelOrder(order)}
                                                                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                Hủy đơn
                                                            </button>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* Cột phải: Các nút thao tác chính */}
                                        <div className="flex flex-wrap items-center gap-3">
                                            {(() => {
                                                const paymentMethodStatus = String(order.payment_status || order.Payment_Status || '').toUpperCase();
                                                const depositMethodStatus = String(order.deposit_status || '').toUpperCase();
                                                // Adjusting condition for missing payment_status in frontend data mapping if it's undefined
                                                const isUnpaid = (paymentMethodStatus === 'UNPAID' || !order.payment_status) && (depositMethodStatus === 'UNPAID' || !order.deposit_status);
                                                const isVNPayPending = status === 'PENDING' && (paymentMethod === 'VNPAY' || paymentMethod === 'VNPAY_DEPOSIT') && isUnpaid;
                                                
                                                return isVNPayPending && (
                                                    <button 
                                                        onClick={() => handleRetryPayment(orderId)}
                                                        className="px-6 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm transition-colors"
                                                    >
                                                        Thanh toán lại
                                                    </button>
                                                );
                                            })()}

                                            <button 
                                                onClick={() => handleViewDetails(order)}
                                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg shadow-sm transition-colors"
                                            >
                                                Xem chi tiết
                                            </button>

                                            {status === 'COMPLETED' && !complaintStatus && (
                                                <button 
                                                    onClick={() => handleOpenComplaint(order)}
                                                    className="px-4 py-2 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                                                >
                                                    Hỗ trợ / Khiếu nại
                                                </button>
                                            )}

                                            {status === 'COMPLETED' && (
                                                !isReviewed ? (
                                                    <button 
                                                        onClick={() => handleOpenReview(order)}
                                                        className="px-6 py-2 text-sm font-bold text-white bg-[#006a6a] hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
                                                    >
                                                        Đánh giá ngay
                                                    </button>
                                                ) : (
                                                    <span className="px-4 py-2 text-sm font-medium text-gray-400 border border-gray-200 bg-gray-100 rounded-lg">
                                                        Đã đánh giá
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* CÁC MODAL GIỮ NGUYÊN (Chỉ tinh chỉnh UI nhẹ) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-xl font-black text-[#006a6a]">Chi tiết đơn hàng #{selectedOrder?.id || selectedOrder?.Id_order}</h2>
                            <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-red-500 hover:text-white transition-colors font-bold text-lg">&times;</button>
                        </div>
                        
                        <div className="p-5 overflow-y-auto flex-1 bg-gray-100/50">
                            {loadingDetails ? (
                                <div className="flex justify-center items-center py-10">
                                    <div className="w-8 h-8 border-4 border-gray-300 border-t-[#006a6a] rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    
                                    {(selectedOrder?.cancel_reason || selectedOrder?.Cancel_reason) && (
                                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm text-red-700">
                                            <span className="font-bold">Lý do hủy đơn: </span> 
                                            {selectedOrder.cancel_reason || selectedOrder.Cancel_reason}
                                        </div>
                                    )}

                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 text-base mb-3 border-b pb-2">📍 Thông tin nhận hàng</h3>
                                        <div className="space-y-2 text-sm text-gray-700">
                                            <p><span className="font-semibold text-gray-500 w-20 inline-block">Người nhận:</span> {selectedOrder?.User_name || 'Tài khoản khách'}</p>
                                            <p><span className="font-semibold text-gray-500 w-20 inline-block">Điện thoại:</span> {selectedOrder?.User_phone || 'Không có'}</p>
                                            <p><span className="font-semibold text-gray-500 w-20 inline-block">Giao đến:</span> {selectedOrder?.shipping_address || selectedOrder?.Address}</p>
                                            <p><span className="font-semibold text-gray-500 w-20 inline-block">Ghi chú:</span> <span className="italic">{selectedOrder?.note || selectedOrder?.Note || 'Không có ghi chú'}</span></p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 text-base mb-3 border-b pb-2">🛍️ Món ăn đã đặt</h3>
                                        <div className="space-y-4">
                                            {orderItems.map((item, index) => {
                                                const qty = item.quantity || item.Quantity;
                                                const price = item.price || item.Total_item_price;
                                                const itemNote = item.note || item.Note; 
                                                const itemName = item.food_name || item.Food_name;
                                                const img = item.food_img || item.Image_url;

                                                return (
                                                    <div key={item.Id_order_item || item.id || index} className="flex gap-4 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                                        <img src={img || 'https://via.placeholder.com/150'} alt={itemName} className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="font-bold text-gray-800 text-sm leading-tight">{qty}x {itemName}</h4>
                                                                <p className="font-bold text-[#006a6a] shrink-0 ml-2">{Number(price).toLocaleString()}đ</p>
                                                            </div>
                                                            
                                                            {item.options && item.options.length > 0 && (
                                                                <ul className="text-xs text-gray-500 mt-1.5 space-y-0.5 ml-1">
                                                                    {item.options.map((opt, idx) => {
                                                                        const optName = opt.option_name || opt.name || opt.Name;
                                                                        const optQty = opt.quantity || opt.Quantity || 1;
                                                                        const optPrice = opt.price || opt.Price || 0;
                                                                        return (
                                                                            <li key={idx} className="flex items-center gap-1">
                                                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                                                {optName} {optQty > 1 ? `(x${optQty})` : ''} 
                                                                                {Number(optPrice) > 0 && ` (+${Number(optPrice).toLocaleString()}đ)`}
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            )}
                                                            
                                                            {itemNote && (
                                                                <div className="mt-2 inline-block bg-orange-50 border border-orange-100 px-2 py-1 rounded text-xs text-orange-600 font-medium italic">
                                                                    ✏️ Ghi chú: {itemNote}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
                                        <h3 className="font-bold text-gray-800 text-base mb-2 border-b pb-2">💳 Tổng quan thanh toán</h3>
                                        <div className="flex justify-between text-gray-600 text-sm">
                                            <span>Phí vận chuyển:</span>
                                            <span className="font-medium">{Number(selectedOrder?.shipping_fee || selectedOrder?.Shipping_fee || 0).toLocaleString()}đ</span>
                                        </div>
                                        <div className="flex justify-between text-green-600 text-sm">
                                            <span>Giảm giá (Voucher):</span>
                                            <span className="font-medium">-{Number(selectedOrder?.discount_amount || selectedOrder?.Discount_amount || 0).toLocaleString()}đ</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-200 mt-2">
                                            <span className="font-bold text-gray-800">Tổng thanh toán:</span>
                                            <span className="text-xl font-black text-[#006a6a]">{Number(selectedOrder?.total_amount || selectedOrder?.Total_price).toLocaleString()}đ</span>
                                        </div>
                                        
                                        <div className="bg-gray-50 p-3 rounded-lg mt-3 text-xs text-gray-600 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                            <div>
                                                <span className="font-medium">Phương thức: </span> 
                                                <span className="font-bold text-gray-800">
                                                    {String(selectedOrder?.payment_method || selectedOrder?.Payment_method || '').toUpperCase() === 'VNPAY' ? 'Ví VNPay' : 
                                                     String(selectedOrder?.payment_method || selectedOrder?.Payment_method || '').toUpperCase() === 'VNPAY_DEPOSIT' ? 'Ví VNPay (Đặt cọc)' : 'Thanh toán khi nhận hàng (COD)'}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <div>
                                                    <span className="font-medium">Trạng thái: </span> 
                                                    <span className={`font-bold px-2 py-1 rounded ${
                                                        String(selectedOrder?.payment_status || selectedOrder?.Payment_Status || '').toUpperCase() === 'PAID' ? 'bg-green-100 text-green-700' : 
                                                        String(selectedOrder?.payment_status || selectedOrder?.Payment_Status || '').toUpperCase() === 'REFUNDED' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {getPaymentStatusText(selectedOrder?.payment_status || selectedOrder?.Payment_Status)}
                                                    </span>
                                                </div>
                                                {(selectedOrder?.order_type === 'DINE_IN') && (
                                                    <div>
                                                        <span className="font-medium">Tiền cọc: </span>
                                                        <span className={`font-bold px-2 py-1 rounded ${
                                                            String(selectedOrder?.payment_status || selectedOrder?.Payment_Status || '').toUpperCase() === 'PAID' ? 'bg-indigo-100 text-indigo-700' : 
                                                            String(selectedOrder?.deposit_status || '').toUpperCase() === 'PAID' ? 'bg-indigo-100 text-indigo-700' : 
                                                            String(selectedOrder?.deposit_status || '').toUpperCase() === 'REFUNDED' ? 'bg-purple-100 text-purple-700' : 
                                                            String(selectedOrder?.deposit_status || '').toUpperCase() === 'FORFEITED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {getDepositStatusText(selectedOrder?.deposit_status, selectedOrder?.payment_status || selectedOrder?.Payment_Status)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {(selectedOrder?.refund_evidence_image || selectedOrder?.Refund_evidence_image) && (
                                        <div className="bg-green-50 p-5 rounded-xl shadow-sm border border-green-200">
                                            <h3 className="font-bold text-green-800 text-sm mb-3">📸 Biên lai hoàn tiền từ hệ thống</h3>
                                            <div className="cursor-pointer overflow-hidden rounded-xl border-2 border-green-100 hover:border-green-300 transition bg-white"
                                                onClick={() => setPreviewImage(selectedOrder?.refund_evidence_image || selectedOrder?.Refund_evidence_image)}>
                                                <img 
                                                    src={selectedOrder?.refund_evidence_image || selectedOrder?.Refund_evidence_image} 
                                                    alt="Biên lai hoàn tiền" 
                                                    className="w-full h-40 object-cover opacity-90 hover:opacity-100 transition-opacity"
                                                />
                                                <p className="text-[11px] text-center py-2 bg-green-100 text-green-800 font-bold uppercase tracking-wider">Nhấn vào ảnh để xem kích thước đầy đủ</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {previewImage && (
                <div 
                    className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
                    onClick={() => setPreviewImage(null)} 
                >
                    <div className="relative max-w-5xl max-h-[95vh]">
                        <img 
                            src={previewImage} 
                            alt="Phóng to biên lai" 
                            className="max-w-full max-h-[95vh] object-contain rounded-xl shadow-2xl" 
                        />
                        <button 
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-5 -right-5 w-10 h-10 bg-white hover:bg-red-500 text-gray-800 hover:text-white rounded-full font-bold shadow-xl flex items-center justify-center text-xl transition-colors"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}

            <ComplaintModal 
                isOpen={isComplaintModalOpen} 
                onClose={() => setIsComplaintModalOpen(false)} 
                order={orderToComplain}
                onSuccess={() => fetchMyOrders()} 
            />

            {isReviewModalOpen && orderToReview && (
                <OrderReviewModal 
                    isOpen={isReviewModalOpen} 
                    onClose={() => setIsReviewModalOpen(false)} 
                    order={orderToReview}
                    onSuccess={() => fetchMyOrders()} 
                />
            )}
        </div>
    );
};

export default UserOrderPage;