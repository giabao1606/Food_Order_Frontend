import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import { FaFire, FaCheckCircle, FaExclamationTriangle, FaBoxOpen } from 'react-icons/fa';

const ManufacturePage = () => {
    const [semiFinishedItems, setSemiFinishedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        ingredient_id: '',
        quantity: ''
    });

    // Tự động lấy branch_id của nhân viên đang đăng nhập
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const rawBranchId = localStorage.getItem('selectedBranchId') || storedUser.branch_id;
    const branchId = (rawBranchId === 'null' || rawBranchId === 'undefined') ? null : rawBranchId;

    useEffect(() => {
        const controller = new AbortController();
        const fetchSemiFinishedIngredients = async () => {
            try {
                const res = await axiosClient.get('/ingredients', { signal: controller.signal });
                const semiFinished = (res.data || []).filter(item => item.type === 'SEMI_FINISHED');
                setSemiFinishedItems(semiFinished);
            } catch (error) {
                if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                    console.error("Lỗi tải danh sách nguyên liệu:", error);
            }
        };
        fetchSemiFinishedIngredients();
        return () => controller.abort();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!branchId) return alert("Lỗi: Không xác định được chi nhánh của bạn!");
        if (!formData.ingredient_id || Number(formData.quantity) <= 0) {
            return alert("Vui lòng chọn món và nhập số lượng hợp lệ (> 0)!");
        }

        setIsLoading(true);
        try {
            const payload = {
                branch_id: branchId,
                transaction_type: 'MANUFACTURE', // Mã giao dịch báo cho hệ thống biết để tự động trừ cốt liệu thô
                note: 'Nhân viên bếp báo cáo nấu mẻ',
                details: [{
                    ingredient_id: formData.ingredient_id,
                    quantity: Number(formData.quantity),
                    unit_price: 0
                }]
            };

            await axiosClient.post('/stock/transaction', payload);
            
            alert('Đã ghi nhận thành phẩm nấu thành công! Kho đã tự động trừ nguyên liệu thô.');
            // Reset form sau khi gửi
            setFormData({ ingredient_id: '', quantity: '' });
        } catch (error) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi ghi nhận!');
        } finally {
            setIsLoading(false);
        }
    };

    // Tìm đơn vị tính để hiển thị cho trực quan
    const selectedItemInfo = semiFinishedItems.find(i => String(i.id) === String(formData.ingredient_id));

    return (
        <div className="p-6 md:p-10 bg-gray-50 min-h-screen font-sans flex justify-center items-start">
            <div className="w-full max-w-2xl">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 mt-6">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                        <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                            <FaFire />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800">Khai Báo Chế Biến</h1>
                            <p className="text-sm text-gray-500 font-medium mt-1">Cập nhật số lượng Bán thành phẩm vừa nấu xong</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-8 flex items-start gap-3">
                        <FaExclamationTriangle className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-800 font-medium">
                            Khi bạn xác nhận nấu xong, hệ thống sẽ <b>tự động cộng thêm</b> thành phẩm vào kho và <b>tự động trừ đi</b> lượng nguyên liệu thô cấu thành (Xương, Trà, Đường...) theo công thức.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Thành phẩm vừa nấu <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <FaBoxOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                                <select 
                                    required
                                    value={formData.ingredient_id}
                                    onChange={(e) => setFormData({...formData, ingredient_id: e.target.value})}
                                    className="w-full p-4 pl-12 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 font-bold text-gray-800 text-lg appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>-- Chọn Bán thành phẩm --</option>
                                    {semiFinishedItems.map(item => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Số lượng thu được <span className="text-red-500">*</span></label>
                            <div className="flex gap-4">
                                <input 
                                    type="number" 
                                    required 
                                    min="0"
                                    step="any"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                                    placeholder="Nhập số lượng..." 
                                    className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 font-black text-2xl text-orange-600 text-center"
                                />
                                <div className="w-32 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center font-bold text-gray-500 text-lg">
                                    {selectedItemInfo ? selectedItemInfo.unit : 'ĐVT'}
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading || !formData.ingredient_id}
                            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-xl shadow-lg shadow-orange-500/30 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
                        >
                            <FaCheckCircle /> {isLoading ? 'ĐANG LƯU DỮ LIỆU...' : 'XÁC NHẬN NẤU XONG'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ManufacturePage;