import React, { useState, useEffect } from 'react';
import axiosClient from '../../../utils/axiosClient';
import toast from 'react-hot-toast';
import { MdMonetizationOn, MdShoppingCart, MdCardGiftcard, MdThumbUp } from 'react-icons/md';

const CampaignReportPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch COMPLETED & RUNNING campaigns
        const fetchCamps = async () => {
            try {
                const res = await axiosClient.get('/admin/campaigns?status=ALL');
                if (res.success) {
                    const filtered = res.data.filter(c => c.status === 'RUNNING' || c.status === 'COMPLETED');
                    setCampaigns(filtered);
                    if (filtered.length > 0) setSelectedId(filtered[0].id);
                }
            } catch (error) { toast.error('Lỗi tải danh sách'); }
        };
        fetchCamps();
    }, []);

    useEffect(() => {
        if (!selectedId) return;
        const fetchReport = async () => {
            setLoading(true);
            try {
                const res = await axiosClient.get(`/admin/campaigns/${selectedId}/report`);
                if (res.success) setReport(res.data);
            } catch (error) {
                toast.error('Lỗi tải báo cáo');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [selectedId]);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Báo cáo Chiến dịch</h1>
                    <p className="text-sm text-gray-500 mt-1">Phân tích hiệu quả các chiến dịch đang chạy hoặc đã kết thúc</p>
                </div>
                <select 
                    className="border border-gray-200 rounded-xl px-4 py-2 font-semibold text-gray-700 bg-white min-w-[250px] shadow-sm"
                    value={selectedId} onChange={e => setSelectedId(e.target.value)}
                >
                    <option value="" disabled>-- Chọn chiến dịch --</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
                </select>
            </div>

            {loading ? (
                <div className="p-20 text-center text-gray-500 font-semibold">Đang tổng hợp dữ liệu...</div>
            ) : !report ? (
                <div className="p-20 text-center text-gray-400">Vui lòng chọn một chiến dịch để xem báo cáo</div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-[10px] font-bold">{report.campaign.status}</span>
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">{report.campaign.type}</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">{report.campaign.name}</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {new Date(report.campaign.start_time).toLocaleString('vi-VN')} - {new Date(report.campaign.end_time).toLocaleString('vi-VN')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center"><MdMonetizationOn size={24}/></div>
                            <div>
                                <p className="text-sm text-gray-500 font-semibold">Doanh thu</p>
                                <h3 className="text-xl font-black text-gray-800">{parseInt(report.metrics.total_revenue).toLocaleString('vi-VN')}đ</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><MdShoppingCart size={24}/></div>
                            <div>
                                <p className="text-sm text-gray-500 font-semibold">Đơn hàng</p>
                                <h3 className="text-xl font-black text-gray-800">{report.metrics.total_orders}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><MdCardGiftcard size={24}/></div>
                            <div>
                                <p className="text-sm text-gray-500 font-semibold">Voucher sử dụng</p>
                                <h3 className="text-xl font-black text-gray-800">{report.metrics.voucher_uses}</h3>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center"><MdThumbUp size={24}/></div>
                            <div>
                                <p className="text-sm text-gray-500 font-semibold">Tương tác Feed</p>
                                <h3 className="text-xl font-black text-gray-800">{report.metrics.feed_likes} likes</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4">Biểu đồ doanh thu theo ngày</h3>
                        {report.daily && report.daily.length > 0 ? (
                            <div className="flex h-64 items-end gap-2">
                                {report.daily.map((d, i) => {
                                    const maxRev = Math.max(...report.daily.map(x => x.revenue)) || 1;
                                    const height = `${(d.revenue / maxRev) * 100}%`;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
                                            <div className="w-full bg-[#006a6a] rounded-t hover:bg-teal-500 transition-all" style={{ height }}></div>
                                            <div className="text-[10px] text-gray-400 mt-2 truncate w-full text-center">
                                                {new Date(d.date).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}
                                            </div>
                                            
                                            {/* Tooltip */}
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-12 bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10 transition-opacity">
                                                {parseInt(d.revenue).toLocaleString('vi-VN')}đ ({d.orders} đơn)
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-gray-400">Chưa có dữ liệu giao dịch trong chiến dịch này.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignReportPage;
