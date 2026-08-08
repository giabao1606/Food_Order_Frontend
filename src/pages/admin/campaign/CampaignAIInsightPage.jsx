import React, { useState, useEffect } from 'react';
import axiosClient from '../../../utils/axiosClient';
import toast from 'react-hot-toast';
import { MdSmartToy, MdAutoAwesome } from 'react-icons/md';

const CampaignAIInsightPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [insightData, setInsightData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCamps = async () => {
            try {
                const res = await axiosClient.get('/admin/campaigns?status=COMPLETED');
                if (res.success) {
                    setCampaigns(res.data);
                    if (res.data.length > 0) setSelectedId(res.data[0].id);
                }
            } catch (error) {}
        };
        fetchCamps();
    }, []);

    const handleAnalyze = async () => {
        if (!selectedId) return toast.error('Vui lòng chọn chiến dịch');
        setLoading(true);
        setInsightData(null);
        try {
            const res = await axiosClient.get(`/admin/campaigns/ai-insight/${selectedId}`);
            if (res.success) {
                setInsightData(res);
                toast.success('Phân tích hoàn tất!');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi gọi AI phân tích');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        <MdSmartToy className="text-[#006a6a]" /> AI đánh giá chiến dịch
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Sử dụng AI để phân tích và đánh giá chiến dịch</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6 flex items-end gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn chiến dịch đã kết thúc để phân tích</label>
                    <select 
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 font-semibold text-gray-700 bg-gray-50 focus:bg-white transition"
                        value={selectedId} onChange={e => setSelectedId(e.target.value)}
                    >
                        <option value="" disabled>-- Chọn chiến dịch --</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <button 
                    onClick={handleAnalyze} disabled={loading}
                    className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-teal-500/30 disabled:opacity-50"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : <MdAutoAwesome size={20} />}
                    {loading ? 'Đang phân tích...' : 'Phân tích AI'}
                </button>
            </div>

            {insightData && (
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-[2px] rounded-2xl shadow-sm">
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl min-h-[300px]">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-teal-100">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 text-white flex items-center justify-center shadow-inner">
                                <MdSmartToy size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-800">Đánh giá từ Trợ lý AI</h2>
                                <p className="text-xs text-teal-600 font-bold">Dựa trên dữ liệu thực tế của chiến dịch</p>
                            </div>
                        </div>
                        
                        <div className="prose prose-sm prose-teal max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {insightData.insight.replace(/\*\*/g, '')}
                        </div>
                        
                        <div className="mt-8 pt-4 border-t border-teal-100 flex gap-4 text-sm">
                            <div className="bg-white px-4 py-2 rounded-lg border border-teal-50 shadow-sm flex-1">
                                <span className="text-gray-500 font-semibold block mb-1">Doanh thu đạt được</span>
                                <span className="text-lg font-black text-teal-700">{parseInt(insightData.metrics.total_revenue).toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div className="bg-white px-4 py-2 rounded-lg border border-teal-50 shadow-sm flex-1">
                                <span className="text-gray-500 font-semibold block mb-1">Tổng đơn hàng</span>
                                <span className="text-lg font-black text-teal-700">{insightData.metrics.total_orders}</span>
                            </div>
                            <div className="bg-white px-4 py-2 rounded-lg border border-teal-50 shadow-sm flex-1">
                                <span className="text-gray-500 font-semibold block mb-1">Voucher sử dụng</span>
                                <span className="text-lg font-black text-teal-700">{insightData.metrics.voucher_uses}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignAIInsightPage;
