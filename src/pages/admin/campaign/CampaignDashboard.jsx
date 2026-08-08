import React, { useState, useEffect } from 'react';
import axiosClient from '../../../utils/axiosClient';
import { MdFlashOn, MdSchedule, MdCheckCircle, MdCancel, MdArrowForward } from 'react-icons/md';
import { Link } from 'react-router-dom';

const CampaignDashboard = () => {
    const [stats, setStats] = useState({ RUNNING: 0, SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0 });
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [runRes, schRes] = await Promise.all([
                axiosClient.get('/admin/campaigns?status=RUNNING'),
                axiosClient.get('/admin/campaigns?status=SCHEDULED')
            ]);
            
            let combined = [];
            let s = { RUNNING: 0, SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0 };
            
            if (runRes.success) {
                combined = [...combined, ...runRes.data];
                s = { ...s, ...runRes.summary };
            }
            if (schRes.success) {
                combined = [...combined, ...schRes.data];
                s = { ...s, ...schRes.summary };
            }
            
            setCampaigns(combined.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
            setStats(s);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6">Đang tải...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-black text-gray-800 mb-6">Campaign Dashboard</h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-teal-500 to-teal-700 p-5 rounded-2xl text-white shadow-lg shadow-teal-500/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-teal-100 text-sm font-semibold mb-1">Đang chạy</p>
                            <h3 className="text-4xl font-black">{stats.RUNNING || 0}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><MdFlashOn size={24} /></div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-5 rounded-2xl text-white shadow-lg shadow-orange-500/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-yellow-100 text-sm font-semibold mb-1">Sắp bắt đầu</p>
                            <h3 className="text-4xl font-black">{stats.SCHEDULED || 0}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><MdSchedule size={24} /></div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-semibold mb-1">Đã kết thúc</p>
                            <h3 className="text-4xl font-black text-gray-800">{stats.COMPLETED || 0}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"><MdCheckCircle size={24} /></div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-semibold mb-1">Đã hủy</p>
                            <h3 className="text-4xl font-black text-gray-800">{stats.CANCELLED || 0}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><MdCancel size={24} /></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-gray-800">Campaigns đang hoạt động</h2>
                    <Link to="/admin/campaigns" className="text-sm font-bold text-teal-600 hover:underline flex items-center gap-1">
                        Xem tất cả <MdArrowForward />
                    </Link>
                </div>
                <div className="p-5">
                    {campaigns.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">Không có campaign nào đang chạy hoặc sắp diễn ra.</div>
                    ) : (
                        <div className="space-y-4">
                            {campaigns.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'RUNNING' ? 'bg-teal-100 text-teal-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {c.status === 'RUNNING' ? 'ĐANG CHẠY' : (c.status === 'SCHEDULED' ? 'SẮP DIỄN RA' : c.status)}
                                            </span>
                                            <span className="text-xs text-gray-500 font-semibold">{c.type}</span>
                                        </div>
                                        <h4 className="font-bold text-gray-800">{c.name}</h4>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(c.start_time).toLocaleString('vi-VN')} - {new Date(c.end_time).toLocaleString('vi-VN')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Link to={`/admin/campaigns/${c.id}`} className="text-sm font-bold text-teal-600 hover:underline">Chi tiết</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CampaignDashboard;
