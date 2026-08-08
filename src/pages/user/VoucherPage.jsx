import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import { FaTicketAlt, FaClock, FaCoins, FaGift } from 'react-icons/fa';

const VoucherPage = () => {
    const [myVouchers, setMyVouchers] = useState([]);
    const [publicVouchers, setPublicVouchers] = useState([]);
    const [userPoints, setUserPoints] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        document.title = "Trung tâm ưu đãi";
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            try {
                // 1. Lấy điểm thưởng của user
                const profileRes = await axiosClient.get('/users/profile', { signal });
                if (profileRes.success) setUserPoints(profileRes.user.reward_points || 0);

                // 2. Lấy Ví Voucher của tôi
                const myRes = await axiosClient.get('/vouchers/my-vouchers', { signal });
                let myVoucherList = Array.isArray(myRes) ? myRes : [];
                setMyVouchers(myVoucherList);

                // 3. Lấy kho Voucher đang phát hành (Chỉ lọc các mã khách chưa sở hữu)
                const publicRes = await axiosClient.get('/vouchers/active', { signal });
                if (Array.isArray(publicRes)) {
                    const myVoucherIds = myVoucherList.map(v => v.id);
                    setPublicVouchers(publicRes.filter(v => !myVoucherIds.includes(v.id)));
                }
            } catch (error) {
                if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                    console.error("Lỗi tải trang Voucher:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [refreshTrigger]);

    const handleClaimVoucher = async (voucher) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Vui lòng đăng nhập để lưu mã!");
            window.dispatchEvent(new Event("openAuthModal"));
            return;
        }

        if (voucher.required_points > 0 && userPoints < voucher.required_points) {
            return alert("Bạn không đủ điểm thưởng để đổi mã này!");
        }

        if (voucher.required_points > 0) {
            if (!window.confirm(`Xác nhận sử dụng ${voucher.required_points} điểm để đổi Voucher này?`)) return;
        }

        try {
            const res = await axiosClient.post('/vouchers/claim', { voucher_id: voucher.id });
            if (res.success) {
                alert(voucher.required_points > 0 ? "Đổi mã thành công! Đã thêm vào ví của bạn." : "Lưu mã thành công!");
                setRefreshTrigger(prev => prev + 1); // Cập nhật lại dữ liệu
            }
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi khi lưu mã.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                
                {/* Header Tổng quan */}
                <div className="bg-gradient-to-r from-[#006a6a] to-teal-600 rounded-3xl p-6 text-white mb-8 flex flex-col md:flex-row justify-between items-center shadow-lg">
                    <div className="mb-4 md:mb-0 text-center md:text-left">
                        <h1 className="text-3xl font-black uppercase tracking-tight">Trung tâm Ưu đãi</h1>
                        <p className="opacity-80 mt-1">Quản lý ví và đổi điểm lấy mã giảm giá</p>
                    </div>
                    <div className="text-center bg-white/20 px-8 py-3 rounded-2xl backdrop-blur-sm">
                        <p className="text-sm font-semibold opacity-90 uppercase tracking-widest">Điểm thưởng</p>
                        <p className="text-4xl font-black flex items-center justify-center gap-2 mt-1">
                            <FaCoins className="text-yellow-300" /> {userPoints}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-10"><div className="w-8 h-8 border-4 border-[#006a6a] border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                ) : (
                    <>
                        {/* KHỐI 1: VÍ VOUCHER CỦA TÔI */}
                        <div className="mb-12">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FaTicketAlt className="text-[#006a6a]" /> Ví Voucher của tôi
                            </h2>
                            {myVouchers.length === 0 ? (
                                <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-500">
                                    Ví của bạn đang trống. Hãy lưu thêm mã ở bên dưới hoặc đặt hàng để tích điểm nhé!
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {myVouchers.map((voucher) => {
                                        const isExpired = voucher.end_date && new Date(voucher.end_date) < new Date();
                                        const isDisabled = voucher.is_used || isExpired;
                                        return (
                                        <div key={voucher.user_voucher_id} className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex h-32 transition ${isDisabled ? 'opacity-50 grayscale' : 'hover:shadow-md'}`}>
                                            <div className={`w-28 text-white flex flex-col items-center justify-center p-2 border-r-2 border-dashed border-white shrink-0 relative ${isDisabled ? 'bg-gray-500' : 'bg-[#006a6a]'}`}>
                                                <FaTicketAlt size={24} className="mb-1 opacity-80" />
                                                <span className="font-black text-xl leading-none text-center">
                                                    {voucher.discount_type === 'PERCENT' ? `${voucher.discount_value}%` : `${(voucher.discount_value / 1000)}K`}
                                                </span>
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{voucher.name}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">Đơn tối thiểu: {Number(voucher.min_order_value).toLocaleString()}đ</p>
                                                </div>
                                                <div className="flex items-end justify-between mt-2">
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                                        <FaClock />
                                                        {voucher.end_date ? `HSD: ${voucher.end_date.split('T')[0]}` : 'Không thời hạn'}
                                                    </div>
                                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDisabled ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                                        {voucher.is_used ? 'Đã dùng' : (isExpired ? 'Hết hạn' : 'Sẵn sàng')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* KHỐI 2: KHO VOUCHER / QUÀ TẶNG */}
                        <div className="mb-10">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FaGift className="text-orange-500" /> Săn Mã Giảm Giá & Đổi Điểm
                            </h2>
                            {publicVouchers.filter(v => !(v.end_date && new Date(v.end_date) < new Date())).length === 0 ? (
                                <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-500">
                                    Hiện tại chưa có sự kiện khuyến mãi mới nào.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {publicVouchers.filter(v => !(v.end_date && new Date(v.end_date) < new Date())).map((voucher) => {
                                        const isExpired = voucher.end_date && new Date(voucher.end_date) < new Date();
                                        return (
                                        <div key={voucher.id} className={`bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden flex h-32 transition ${isExpired ? 'opacity-50 grayscale' : 'hover:shadow-md'}`}>
                                            <div className={`w-28 text-white flex flex-col items-center justify-center p-2 border-r-2 border-dashed border-white shrink-0 relative ${isExpired ? 'bg-gray-500' : 'bg-[#F25C05]'}`}>
                                                <FaTicketAlt size={24} className="mb-1 opacity-80" />
                                                <span className="font-black text-xl leading-none text-center">
                                                    {voucher.discount_type === 'PERCENT' ? `${voucher.discount_value}%` : `${(voucher.discount_value / 1000)}K`}
                                                </span>
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{voucher.name}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">Đơn tối thiểu: {Number(voucher.min_order_value).toLocaleString()}đ</p>
                                                </div>
                                                <div className="flex items-end justify-between mt-2">
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                                        <FaClock /> {voucher.end_date ? voucher.end_date.split('T')[0] : 'Vĩnh viễn'}
                                                    </div>
                                                    <button 
                                                        onClick={() => handleClaimVoucher(voucher)}
                                                        disabled={isExpired || (voucher.required_points > 0 && userPoints < voucher.required_points)}
                                                        className={`text-xs font-bold px-4 py-1.5 rounded-full transition ${
                                                            isExpired || (voucher.required_points > 0 && userPoints < voucher.required_points) 
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                                : 'bg-[#F25C05] hover:bg-orange-600 text-white shadow-sm'
                                                        }`}
                                                    >
                                                        {isExpired ? 'Hết hạn' : (voucher.required_points > 0 ? `Đổi ${voucher.required_points} điểm` : 'Lưu Mã')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VoucherPage;