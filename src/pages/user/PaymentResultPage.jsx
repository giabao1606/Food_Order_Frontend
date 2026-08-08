import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import axiosClient from '../../utils/axiosClient';
import { toast } from 'react-hot-toast';

const PaymentResultPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('Đang xử lý kết quả thanh toán...');

    useEffect(() => {
        const controller = new AbortController();

        const verifyPayment = async () => {
            try {
                if (!location.search) {
                    setStatus('error');
                    setMessage('Không tìm thấy thông tin giao dịch.');
                    return;
                }
                
                // Gọi API để cập nhật trạng thái đơn hàng
                const response = await axiosClient.get(`/orders/vnpay_return${location.search}`, { signal: controller.signal });

                if (response.success) {
                    setStatus('success');
                    setMessage('Thanh toán thành công! Cảm ơn bạn đã đặt hàng.');
                    window.dispatchEvent(new Event("cartUpdated")); // Reset giỏ hàng nếu cần
                } else {
                    setStatus('error');
                    setMessage(response.message || 'Thanh toán thất bại hoặc đã bị hủy.');
                }
            } catch (error) {
                if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
                    console.error("Lỗi xác thực thanh toán:", error);
                    setStatus('error');
                    setMessage(error.response?.data?.message || 'Giao dịch bị hủy hoặc thanh toán không thành công.');
                }
            }
        };

        verifyPayment();
        return () => controller.abort();
    }, [location.search]);

    return (
        <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <FaSpinner className="animate-spin text-5xl text-blue-500 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-700">{message}</h2>
                        <p className="text-gray-500 mt-2">Vui lòng không đóng trình duyệt...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <FaCheckCircle className="text-6xl text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Thanh toán thành công!</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <div className="flex gap-4 w-full">
                            <Link to="/" className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition">
                                Về trang chủ
                            </Link>
                            <Link to="/don-hang" className="flex-1 py-3 px-4 bg-[#006a6a] text-white font-semibold rounded-lg hover:bg-teal-700 transition">
                                Xem đơn hàng
                            </Link>
                        </div>
                    </div>
                )}
                
                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <FaTimesCircle className="text-6xl text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Thanh toán không thành công</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <div className="flex gap-4 w-full">
                            <Link to="/don-hang" className="flex-1 py-3 px-4 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition shadow-md">
                                Về lịch sử đơn hàng
                            </Link>
                        </div>
                        <p className="text-sm text-gray-400 mt-4">
                            Đơn hàng của bạn đã được tạo. Bạn có thể thanh toán lại trong vòng 15 phút tại Lịch sử đơn hàng.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentResultPage;