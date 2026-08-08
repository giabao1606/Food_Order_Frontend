import React, { useState, useRef } from 'react';
import { MdClose, MdOutlineImage } from 'react-icons/md';
import axiosClient from '../../utils/axiosClient';

const ComplaintModal = ({ isOpen, onClose, order, onSuccess }) => {
    const [reason, setReason] = useState('Thiếu món');
    const [note, setNote] = useState('');
    const [evidenceImage, setEvidenceImage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const imageInputRef = useRef(null);

    if (!isOpen || !order) return null;

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) return alert("Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB!");
            const reader = new FileReader();
            reader.onloadend = () => setEvidenceImage(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!evidenceImage) return alert('Vui lòng tải lên hình ảnh bằng chứng!');

        setIsSubmitting(true);
        try {
            // 1. TỐI ƯU HÓA: Bắt an toàn order_id dù DB viết hoa hay viết thường
            const payload = { 
                order_id: order.id || order.Id_order, 
                reason: reason, 
                note: note, 
                image_evidence: evidenceImage 
            };
            
            // 2. SỬA LỖI 404: Thêm '/create' vào đúng định dạng của Routes
            const res = await axiosClient.post('/complaints/create', payload);
            
            if (res.success || res.message) {
                alert('Gửi yêu cầu hỗ trợ thành công! Bạn sẽ nhận được thông báo khi có kết quả.');
                onSuccess();
                onClose();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi gửi khiếu nại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
                <div className="flex items-center justify-between p-5 border-b bg-gray-50">
                    <h3 className="font-black text-lg text-[#006a6a]">Khiếu nại đơn #{order.id}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 p-1.5 rounded-full"><MdClose size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Vấn đề gặp phải?</label>
                        <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:border-[#006a6a]">
                            <option value="Thiếu món">Giao thiếu món</option>
                            <option value="Sai món">Giao sai món</option>
                            <option value="Đổ vỡ">Thức ăn bị đổ/vỡ hỏng</option>
                            <option value="Chất lượng">Chất lượng món ăn kém</option>
                            <option value="Khác">Lý do khác</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Hình ảnh bằng chứng <span className="text-red-500">*</span></label>
                        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />
                        <div onClick={() => imageInputRef.current.click()} className="flex flex-col h-32 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer overflow-hidden relative">
                            {evidenceImage ? <img src={evidenceImage} className="absolute inset-0 w-full h-full object-cover" alt="Bằng chứng"/> : (
                                <div className="text-gray-400 text-center"><MdOutlineImage size={28} className="mx-auto" /><p className="text-xs font-medium mt-1">Nhấn để tải ảnh lên</p></div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Mô tả thêm</label>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Chi tiết sự cố..." className="w-full border p-3 rounded-xl outline-none focus:border-[#006a6a] resize-none h-20 text-sm"></textarea>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#006a6a] hover:bg-teal-700 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-70 transition">
                        {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ComplaintModal;