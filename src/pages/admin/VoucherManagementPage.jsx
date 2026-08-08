import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import { MdEdit, MdAdd, MdClose, MdBlock } from 'react-icons/md';

const VoucherManagementPage = () => {
    const [vouchers, setVouchers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // ĐÃ FIX: Đổi toàn bộ key về snake_case (chữ thường) để khớp hoàn toàn với Backend
    const initialForm = {
        code: '', name: '', discount_type: 'AMOUNT', discount_value: 0,
        min_order_value: 0, max_discount_amount: 0, required_points: 0,
        quantity: 100, start_date: '', end_date: '', is_active: true, is_compensation: false, is_rank_up: false, is_campaign_only: false
    };
    const [formData, setFormData] = useState(initialForm);

    const fetchVouchers = async (signal) => {
        try {
            const data = await axiosClient.get('/vouchers/admin/all', { signal });
            if (Array.isArray(data)) setVouchers(data);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi khi lấy danh sách voucher:", error);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchVouchers(controller.signal);
        return () => controller.abort();
    }, []);

    const handleFormChange = (field) => (event) => {
        const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const openAddModal = () => {
        setEditingVoucher(null);
        setFormData(initialForm);
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        if (new Date(formData.end_date) <= new Date(formData.start_date)) {
            return alert("Ngày kết thúc phải lớn hơn ngày bắt đầu!");
        }
        
        setIsSaving(true);
        try {
            if (editingVoucher) {
                // ĐÃ FIX: Khớp endpoint PUT /vouchers/admin/update/:id
                await axiosClient.put(`/vouchers/admin/update/${editingVoucher.id}`, formData);
            } else {
                // ĐÃ FIX: Khớp endpoint POST /vouchers/admin/create
                await axiosClient.post('/vouchers/admin/create', formData);
            }
            alert(editingVoucher ? "Cập nhật voucher thành công!" : "Tạo voucher mới thành công!");
            setIsModalOpen(false);
            fetchVouchers();
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi khi lưu Voucher");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeactivate = async (id) => {
        if (window.confirm("Bạn có chắc muốn vô hiệu hóa Voucher này? (Không thể hoàn tác)")) {
            try {
                // Khớp endpoint DELETE /vouchers/admin/delete/:id (Backend thiết kế là vô hiệu hóa)
                await axiosClient.delete(`/vouchers/admin/delete/${id}`);
                alert("Đã vô hiệu hóa voucher thành công!");
                fetchVouchers();
            } catch (error) {
                alert("Lỗi khi vô hiệu hóa Voucher");
            }
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto relative bg-[#f8f9fa] min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#006a6a] tracking-tight">Quản lý Khuyến mãi</h1>
                    <p className="text-gray-500 text-sm mt-1">Mã giảm giá (Voucher)</p>
                </div>
                <button onClick={openAddModal} className="bg-[linear-gradient(160deg,rgba(0,106,106,1)_0%,rgba(101,221,221,1)_100%)] text-white px-6 py-3 rounded-full shadow-lg font-bold transition-all flex items-center gap-2">
                    <MdAdd size={22} /> Thêm Voucher
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vouchers.map((item) => (
                    <div key={item.id} className={`bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 ${!item.is_active ? 'opacity-50' : 'hover:shadow-md transition'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className={`font-black px-3 py-1 rounded-md text-sm ${item.is_active ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                {item.code}
                            </span>
                            <span className="text-xs text-gray-500 font-medium">Lượt còn: {item.quantity}</span>
                        </div>
                        {item.is_compensation ? (
                            <div className="mb-2 mr-1 inline-block bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded">ĐỀN BÙ</div>
                        ) : item.is_rank_up ? (
                            <div className="mb-2 mr-1 inline-block bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded">THĂNG HẠNG</div>
                        ) : item.is_campaign_only ? (
                            <div className="mb-2 mr-1 inline-block bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">CHIẾN DỊCH</div>
                        ) : null}
                        <h3 className="font-bold text-gray-800 text-lg mb-1 truncate">{item.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                            Giảm {item.discount_type === 'PERCENT' ? `${item.discount_value}%` : `${Number(item.discount_value).toLocaleString()}đ`} 
                            <br/><span className="text-xs italic text-gray-500">(Tối thiểu {Number(item.min_order_value).toLocaleString()}đ)</span>
                        </p>
                        
                        <div className="text-[11px] text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">
                            <p>HSD: {item.end_date ? new Date(item.end_date).toLocaleDateString('vi-VN') : 'Không giới hạn'}</p>
                            <p>Cần đổi: {item.required_points} điểm</p>
                        </div>
                        
                        <div className="flex gap-2">
                            <button onClick={() => { setEditingVoucher(item); setFormData(item); setIsModalOpen(true); }} className="flex-1 py-2 bg-teal-50 text-[#006a6a] rounded-xl text-sm font-bold flex justify-center gap-1 hover:bg-teal-100 transition">
                                <MdEdit size={18} /> Sửa
                            </button>
                            {item.is_active === 1 && (
                                <button onClick={() => handleDeactivate(item.id)} className="py-2 px-3 bg-red-50 text-red-500 rounded-xl text-sm font-bold flex justify-center gap-1 hover:bg-red-100 transition">
                                    <MdBlock size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] w-full max-w-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="font-black text-xl text-[#006a6a]">{editingVoucher ? 'Cập nhật Voucher' : 'Tạo Voucher mới'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 bg-gray-100 p-2 rounded-full"><MdClose size={20}/></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold mb-1 block">Mã Code (In hoa) <span className="text-red-500">*</span></label>
                                    <input required type="text" value={formData.code} onChange={handleFormChange('code')} className="w-full border border-gray-300 rounded-xl p-3 uppercase outline-none focus:border-[#006a6a]" placeholder="VD: GIAN20K" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold mb-1 block">Tên chiến dịch <span className="text-red-500">*</span></label>
                                    <input required type="text" value={formData.name} onChange={handleFormChange('name')} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#006a6a]" placeholder="Tên hiển thị..." />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <label className="text-sm font-bold mb-1 block">Loại giảm giá</label>
                                    <select value={formData.discount_type} onChange={handleFormChange('discount_type')} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#006a6a]">
                                        <option value="AMOUNT">Giảm số tiền cố định (VNĐ)</option>
                                        <option value="PERCENT">Giảm phần trăm (%)</option>
                                        <option value="FREE_SHIPPING">Miễn phí vận chuyển</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-bold mb-1 block">Mức giảm <span className="text-red-500">*</span></label>
                                    <input required type="number" min="1" value={formData.discount_value} onChange={handleFormChange('discount_value')} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#006a6a]" placeholder="Nhập mức giảm..." />
                                </div>
                                
                                {formData.discount_type === 'PERCENT' && (
                                    <div className="col-span-2 mt-2">
                                        <label className="text-sm font-bold mb-1 block text-orange-600">Giảm tối đa (VNĐ) - Bỏ trống nếu không giới hạn</label>
                                        <input type="number" min="0" value={formData.max_discount_amount || ''} onChange={handleFormChange('max_discount_amount')} className="w-full border border-orange-200 rounded-xl p-3 outline-none focus:border-orange-500" placeholder="VD: 50000" />
                                    </div>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold mb-1 block">Giá trị đơn tối thiểu (VNĐ)</label>
                                    <input type="number" min="0" value={formData.min_order_value} onChange={handleFormChange('min_order_value')} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#006a6a]" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold mb-1 block">Số lượt sử dụng</label>
                                    <input type="number" min="1" value={formData.quantity} onChange={handleFormChange('quantity')} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#006a6a]" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold mb-1 block">Yêu cầu điểm thưởng (để đổi)</label>
                                    <input type="number" min="0" value={formData.required_points} onChange={handleFormChange('required_points')} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#006a6a]" placeholder="0 = Phát miễn phí" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold mb-1 block">Ngày hiệu lực</label>
                                    <input type="date" value={formData.start_date ? formData.start_date.substring(0,10) : ''} onChange={handleFormChange('start_date')} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#006a6a]" required />
                                </div>
                                <div>
                                    <label className="text-sm font-bold mb-1 block">Ngày kết thúc</label>
                                    <input type="date" value={formData.end_date ? formData.end_date.substring(0,10) : ''} onChange={handleFormChange('end_date')} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-[#006a6a]" required />
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="is_compensation"
                                        checked={formData.is_compensation} 
                                        onChange={handleFormChange('is_compensation')} 
                                        className="w-5 h-5 accent-red-600 rounded cursor-pointer" 
                                    />
                                    <label htmlFor="is_compensation" className="font-bold text-red-600 cursor-pointer select-none">
                                        Là Voucher đền bù rủi ro (Ẩn khỏi trang chủ)
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="is_rank_up"
                                        checked={formData.is_rank_up} 
                                        onChange={handleFormChange('is_rank_up')} 
                                        className="w-5 h-5 accent-yellow-600 rounded cursor-pointer" 
                                    />
                                    <label htmlFor="is_rank_up" className="font-bold text-yellow-600 cursor-pointer select-none">
                                        Là Voucher thưởng Thăng Hạng (Ẩn khỏi trang chủ)
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="is_campaign_only"
                                        checked={formData.is_campaign_only} 
                                        onChange={handleFormChange('is_campaign_only')} 
                                        className="w-5 h-5 accent-purple-600 rounded cursor-pointer" 
                                    />
                                    <label htmlFor="is_campaign_only" className="font-bold text-purple-600 cursor-pointer select-none">
                                        Chỉ dành cho Chiến dịch (Ẩn khỏi trang chủ)
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border border-gray-300 font-bold text-gray-600 rounded-xl hover:bg-gray-100 transition">Hủy bỏ</button>
                                <button type="submit" disabled={isSaving} className="px-8 py-3 bg-[#006a6a] text-white font-black rounded-xl hover:bg-teal-700 shadow-md transition disabled:opacity-70">
                                    {isSaving ? 'Đang lưu...' : 'Lưu Voucher'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoucherManagementPage;