import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import toast from 'react-hot-toast';
import { MdFlashOn, MdSchedule, MdSend, MdCampaign } from 'react-icons/md';

const ManagerCampaignPage = () => {
    const [running, setRunning] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        title: '', description: '', suggested_type: 'CUSTOM',
        suggested_discount_type: 'PERCENT', suggested_discount_value: '',
        suggested_start: '', suggested_end: '', reason: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [runRes, upRes] = await Promise.all([
                    axiosClient.get('/manager/campaigns'),
                    axiosClient.get('/manager/campaigns/upcoming')
                ]);
                if (runRes.success) setRunning(runRes.data);
                if (upRes.success) setUpcoming(upRes.data);
            } catch (error) { toast.error('Lỗi tải chiến dịch'); }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const submitProposal = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.reason) return toast.error('Vui lòng nhập tên và lý do');
        try {
            const res = await axiosClient.post('/manager/campaigns/proposals', formData);
            if (res.success) {
                toast.success('Gửi đề xuất thành công!');
                setFormData({ title: '', description: '', suggested_type: 'CUSTOM', suggested_discount_type: 'PERCENT', suggested_discount_value: '', suggested_start: '', suggested_end: '', reason: '' });
            }
        } catch (error) { toast.error('Lỗi gửi đề xuất'); }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                <MdCampaign className="text-teal-600" /> Chiến dịch Chi nhánh
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Campaigns List */}
                <div className="space-y-6">
                    {/* Đang chạy */}
                    <div className="bg-white rounded-2xl shadow-sm border border-teal-100 overflow-hidden">
                        <div className="p-4 bg-teal-50 border-b border-teal-100 flex items-center gap-2 text-teal-800 font-bold">
                            <MdFlashOn size={20} /> Đang chạy ({running.length})
                        </div>
                        <div className="p-4">
                            {loading ? <div className="text-gray-400">Đang tải...</div> : running.length === 0 ? <div className="text-gray-400 text-sm">Không có chiến dịch nào đang chạy.</div> : (
                                <div className="space-y-3">
                                    {running.map(c => (
                                        <div key={c.id} className="p-3 border border-teal-100 rounded-xl bg-gradient-to-r from-teal-500/5 to-transparent">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-teal-800">{c.name}</h4>
                                                <span className="text-[10px] bg-teal-500 text-white px-2 py-0.5 rounded-full font-bold">{c.type}</span>
                                            </div>
                                            <p className="text-xs text-gray-600">
                                                Từ: {new Date(c.start_time).toLocaleString('vi-VN')} <br/>
                                                Đến: {new Date(c.end_time).toLocaleString('vi-VN')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sắp tới */}
                    <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 overflow-hidden">
                        <div className="p-4 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2 text-yellow-800 font-bold">
                            <MdSchedule size={20} /> Sắp diễn ra ({upcoming.length})
                        </div>
                        <div className="p-4">
                            {loading ? <div className="text-gray-400">Đang tải...</div> : upcoming.length === 0 ? <div className="text-gray-400 text-sm">Không có chiến dịch nào sắp tới.</div> : (
                                <div className="space-y-3">
                                    {upcoming.map(c => (
                                        <div key={c.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-gray-800">{c.name}</h4>
                                                <span className="text-[10px] bg-yellow-400 text-white px-2 py-0.5 rounded-full font-bold">{c.type}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Bắt đầu lúc: <span className="font-semibold text-gray-700">{new Date(c.start_time).toLocaleString('vi-VN')}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Proposal Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-fit">
                    <div className="p-5 border-b border-gray-100 bg-gray-50">
                        <h2 className="font-bold text-gray-800 text-lg">Gửi Đề xuất Campaign</h2>
                        <p className="text-xs text-gray-500 mt-1">Đề xuất này sẽ được gửi đến Admin để xem xét và tạo campaign chính thức.</p>
                    </div>
                    <form onSubmit={submitProposal} className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tên đề xuất *</label>
                            <input type="text" className="w-full border rounded-xl px-4 py-2 bg-gray-50 focus:bg-white" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Vd: Tặng voucher cuối tuần" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Loại chiến dịch</label>
                                <select className="w-full border rounded-xl px-4 py-2 bg-gray-50 focus:bg-white" value={formData.suggested_type} onChange={e => setFormData({...formData, suggested_type: e.target.value})}>
                                    <option value="CUSTOM">Khác (Custom)</option>
                                    <option value="FLASH_SALE">Flash Sale</option>
                                    <option value="HAPPY_HOUR">Happy Hour</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Loại giảm giá</label>
                                <select className="w-full border rounded-xl px-4 py-2 bg-gray-50 focus:bg-white" value={formData.suggested_discount_type} onChange={e => setFormData({...formData, suggested_discount_type: e.target.value})}>
                                    <option value="PERCENT">Giảm phần trăm (%)</option>
                                    <option value="AMOUNT">Giảm trực tiếp (VNĐ)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Mức giảm</label>
                                <input type="number" min="0" className="w-full border rounded-xl px-4 py-2 bg-gray-50 focus:bg-white" value={formData.suggested_discount_value} onChange={e => setFormData({...formData, suggested_discount_value: e.target.value})} placeholder={formData.suggested_discount_type === 'PERCENT' ? "Ví dụ: 10" : "Ví dụ: 20000"} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Bắt đầu (dự kiến)</label>
                                <input type="datetime-local" className="w-full border rounded-xl px-4 py-2 bg-gray-50 focus:bg-white" value={formData.suggested_start} onChange={e => setFormData({...formData, suggested_start: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Kết thúc (dự kiến)</label>
                                <input type="datetime-local" className="w-full border rounded-xl px-4 py-2 bg-gray-50 focus:bg-white" value={formData.suggested_end} onChange={e => setFormData({...formData, suggested_end: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Lý do đề xuất *</label>
                            <textarea className="w-full border rounded-xl px-4 py-2 bg-gray-50 focus:bg-white" rows="2" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Vd: Chi nhánh đang vắng khách buổi chiều..." required></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú thêm</label>
                            <textarea className="w-full border rounded-xl px-4 py-2 bg-gray-50 focus:bg-white" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                        </div>
                        <button type="submit" className="w-full bg-[#006a6a] hover:bg-teal-700 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-teal-500/30">
                            <MdSend /> Gửi đề xuất cho Admin
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ManagerCampaignPage;
