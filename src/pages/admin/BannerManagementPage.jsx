import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../../utils/axiosClient';
import { uploadImageToServer } from '../../utils/uploadHelper';
import { MdEdit, MdAdd, MdClose, MdOutlineImage, MdVisibility, MdVisibilityOff } from 'react-icons/md';

const BannerManagementPage = () => {
    const [banners, setBanners] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const imageInputRef = useRef(null);

    const [targetOptions, setTargetOptions] = useState({
        Food: [],
        Category: [],
        Voucher: []
    });

    const [formData, setFormData] = useState({
        title: '',
        image_url: '', 
        imageFile: null,
        target_type: 'FOOD', 
        target_id: '',
        redirect_link: '',
        start_date: '',
        end_date: '',
        is_active: true
    });

    const fetchBanners = async (signal) => {
        try {
            const data = await axiosClient.get('/banners', { signal });
            if (Array.isArray(data)) setBanners(data);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi tải banner:", error);
        }
    };

    const fetchTargetOptions = async (signal) => {
        try {
            const [foodRes, catRes, voucherRes] = await Promise.allSettled([
                axiosClient.get('/products', { signal }),
                axiosClient.get('/categories', { signal }),
                axiosClient.get('/vouchers/admin/all', { signal })
            ]);

            setTargetOptions({
                Food: foodRes.status === 'fulfilled' && Array.isArray(foodRes.value) ? foodRes.value : [],
                Category: catRes.status === 'fulfilled' && Array.isArray(catRes.value) ? catRes.value : [],
                Voucher: voucherRes.status === 'fulfilled' && Array.isArray(voucherRes.value) ? voucherRes.value : []
            });
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi lấy dữ liệu tham chiếu Target:", error);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchBanners(controller.signal);
        fetchTargetOptions(controller.signal);
        
        return () => controller.abort();
    }, []);

    const handleFormChange = (field) => (event) => {
        const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleTargetTypeChange = (e) => {
        const newType = e.target.value;
        setFormData(prev => ({
            ...prev,
            target_type: newType,
            target_id: '', 
            redirect_link: ''
        }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB!");
                return;
            }
            const previewUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, image_url: previewUrl, imageFile: file }));
        }
    };

    const openAddModal = () => {
        setEditingBanner(null);
        setFormData({
            title: '', image_url: '', target_type: 'FOOD', target_id: '', redirect_link: '',
            start_date: '', end_date: '', is_active: true
        });
        setIsModalOpen(true);
    };

    const openEditModal = (banner) => {
        setEditingBanner(banner);
        setFormData({
            title: banner.title || '',
            image_url: banner.image_url || '',
            target_type: banner.target_type || 'FOOD',
            target_id: banner.target_id || '',
            redirect_link: banner.redirect_link || '',
            start_date: banner.start_date ? banner.start_date.substring(0, 10) : '',
            end_date: banner.end_date ? banner.end_date.substring(0, 10) : '',
            is_active: banner.is_active === 1 || banner.is_active === true
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.image_url) return alert("Vui lòng tải lên hình ảnh Banner!");
        
        // ĐÃ FIX LỖI: Chỉ báo lỗi khi Admin có điền cả 2 ngày
        if (formData.start_date && formData.end_date) {
            if (new Date(formData.end_date) <= new Date(formData.start_date)) {
                return alert("Ngày kết thúc phải lớn hơn ngày bắt đầu!");
            }
        }
        
        if(formData.target_type !== 'EXTERNAL_URL' && !formData.target_id) {
             return alert("Vui lòng chọn đối tượng tham chiếu!");
        }

        setIsSaving(true);
        try {
            let finalImageUrl = formData.image_url;
            if (formData.imageFile) {
                finalImageUrl = await uploadImageToServer(formData.imageFile, 'banners');
            }
            const payload = {
                ...formData,
                image_url: finalImageUrl,
                is_active: formData.is_active ? 1 : 0
            };
            delete payload.imageFile;
            
            if (editingBanner) {
                await axiosClient.put(`/banners/update/${editingBanner.id}`, payload);
            } else {
                await axiosClient.post('/banners/create', payload);
            }
            setIsModalOpen(false);
            fetchBanners();
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi khi lưu Banner");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (banner) => {
        try {
            await axiosClient.patch(`/banners/toggle-status/${banner.id}`); 
            fetchBanners();
        } catch (error) {
            alert("Lỗi cập nhật trạng thái");
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto relative bg-[#f8f9fa] min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#006a6a] tracking-tight">Quản lý Banner</h1>
                    <p className="text-gray-500 text-sm mt-1">Quản lý các chiến dịch quảng cáo trên Trang chủ</p>
                </div>
                <button onClick={openAddModal} className="bg-[linear-gradient(160deg,rgba(0,106,106,1)_0%,rgba(101,221,221,1)_100%)] text-white px-6 py-3 rounded-full shadow-lg font-bold transition-all flex items-center gap-2">
                    <MdAdd size={22} /> Thêm Banner
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map((item) => (
                    <div key={item.id} className={`bg-white rounded-[28px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col ${!item.is_active ? 'opacity-60 grayscale-[20%]' : ''}`}>
                        <div className="relative h-40 overflow-hidden bg-gray-100">
                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute top-3 right-3 z-10">
                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${item.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                                    {item.is_active ? 'Đang chạy' : 'Đã ẩn'}
                                </span>
                            </div>
                        </div>
                        <div className="p-5 flex flex-col flex-grow">
                            <h3 className="font-bold text-[#3d4949] text-lg leading-tight mb-1 truncate">{item.title}</h3>
                            <p className="text-xs text-gray-500 mb-4">Loại: <span className="font-semibold">{item.target_type}</span></p>
                            <p className="text-xs text-gray-500 mb-4">Hạn: {item.start_date ? item.start_date.split('T')[0] : 'Không giới hạn'} - {item.end_date ? item.end_date.split('T')[0] : 'Không giới hạn'}</p>
                            <div className="flex gap-2 mt-auto">
                                <button onClick={() => handleToggleStatus(item)} className="flex-1 py-2 bg-gray-50 rounded-xl text-xs font-bold flex justify-center gap-1 hover:bg-gray-100">
                                    {item.is_active ? <><MdVisibilityOff size={16}/> Ẩn</> : <><MdVisibility size={16}/> Hiện</>}
                                </button>
                                <button onClick={() => openEditModal(item)} className="flex-1 py-2 bg-teal-50 text-[#006a6a] rounded-xl text-xs font-bold flex justify-center gap-1 hover:bg-teal-100">
                                    <MdEdit size={16} /> Sửa
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] w-full max-w-2xl shadow-2xl overflow-hidden my-4 flex flex-col relative max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="font-black text-xl text-gray-800">{editingBanner ? 'Cập nhật Banner' : 'Thêm Banner mới'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition"><MdClose size={24} /></button>
                        </div>
                        <div className="overflow-y-auto p-6 space-y-6">
                            <div className="flex flex-col gap-2">
                                <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />
                                <div onClick={() => imageInputRef.current.click()} className="flex flex-col min-h-[160px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer overflow-hidden relative group">
                                    {formData.image_url ? (
                                        <>
                                            <img src={formData.image_url} className="absolute inset-0 w-full h-full object-cover" alt="Preview"/>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                <span className="text-white font-medium text-sm">Đổi ảnh khác</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-400">
                                            <MdOutlineImage size={32} />
                                            <p className="font-medium text-sm">Nhấn để chọn ảnh</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tiêu đề</label>
                                    <input type="text" value={formData.title} onChange={handleFormChange("title")} className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:border-[#006a6a]" />
                                </div>
                                <div className="flex items-center justify-between bg-gray-50 p-2 px-4 rounded-xl border border-gray-200 mt-6 md:mt-0">
                                    <span className="text-sm font-bold text-gray-700">Trạng thái hiển thị</span>
                                    <label className="relative cursor-pointer">
                                        <input type="checkbox" checked={formData.is_active} onChange={handleFormChange("is_active")} className="sr-only" />
                                        <div className={`w-11 h-6 rounded-full transition-colors ${formData.is_active ? "bg-[#006a6a]" : "bg-gray-300"}`}></div>
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.is_active ? "translate-x-5" : ""}`}></div>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Mục tiêu (Target Type)</label>
                                    <select value={formData.target_type} onChange={handleTargetTypeChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:border-[#006a6a] bg-white">
                                        <option value="FOOD">Món ăn (Food)</option>
                                        <option value="CATEGORY">Danh mục (Category)</option>
                                        <option value="VOUCHER">Tặng Voucher (Voucher)</option>
                                        {/* ĐÃ FIX: Cho phép chọn loại Link */}
                                        <option value="EXTERNAL_URL">Đường dẫn / Chuyển trang (Link)</option>
                                    </select>
                                </div>
                                
                                {formData.target_type === 'EXTERNAL_URL' ? (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Đường dẫn (Redirect Link)</label>
                                        {/* ĐÃ FIX: Thêm placeholder cho dễ hiểu */}
                                        <input type="text" value={formData.redirect_link} onChange={handleFormChange("redirect_link")} placeholder="VD: https://fb.com... HOẶC /uu-dai" className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:border-[#006a6a]" />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Tham chiếu ({formData.target_type})</label>
                                        <select 
                                            value={formData.target_id} 
                                            onChange={handleFormChange("target_id")} 
                                            className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:border-[#006a6a] bg-white"
                                        >
                                            <option value="">-- Chọn một đối tượng --</option>
                                            
                                            {formData.target_type === 'FOOD' && targetOptions.Food.map(item => (
                                                <option key={item.id} value={item.id}>{item.name}</option>
                                            ))}
                                            
                                            {formData.target_type === 'CATEGORY' && targetOptions.Category.map(item => (
                                                <option key={item.id} value={item.id}>{item.name}</option>
                                            ))}
                                            
                                            {formData.target_type === 'VOUCHER' && targetOptions.Voucher.map(item => (
                                                <option key={item.id} value={item.id}>{item.code} - {item.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Ngày bắt đầu (Để trống nếu chạy mãi)</label>
                                    <input type="date" value={formData.start_date} onChange={handleFormChange("start_date")} className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:border-[#006a6a]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Ngày kết thúc (Để trống nếu chạy mãi)</label>
                                    <input type="date" value={formData.end_date} onChange={handleFormChange("end_date")} className="w-full border border-gray-300 rounded-xl px-4 py-2 outline-none focus:border-[#006a6a]" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-full font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 transition">Hủy</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 rounded-full font-bold text-white bg-[#006a6a] hover:bg-teal-700 transition disabled:opacity-70 shadow-md">
                                {isSaving ? 'Đang lưu...' : 'Lưu Banner'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BannerManagementPage;