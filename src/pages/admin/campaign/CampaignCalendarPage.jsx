import React, { useState, useEffect } from 'react';
import axiosClient from '../../../utils/axiosClient';
import toast from 'react-hot-toast';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

const COLORS = {
    FLASH_SALE: 'bg-red-500', HAPPY_HOUR: 'bg-orange-400',
    SEASONAL: 'bg-green-500', LOYALTY: 'bg-purple-500', CUSTOM: 'bg-teal-500'
};

const CampaignCalendarPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);

    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    useEffect(() => {
        const fetchCalendar = async () => {
            setLoading(true);
            try {
                const res = await axiosClient.get(`/admin/campaigns/calendar?month=${month}&year=${year}`);
                if (res.success) setCampaigns(res.data);
            } catch (error) {
                toast.error('Lỗi tải dữ liệu lịch');
            } finally {
                setLoading(false);
            }
        };
        fetchCalendar();
    }, [month, year]);

    const handlePrev = () => setCurrentDate(new Date(year, month - 2, 1));
    const handleNext = () => setCurrentDate(new Date(year, month, 1));

    // Lấy ngày trong tháng
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const startingDay = firstDay === 0 ? 6 : firstDay - 1; // 0=Mon, 6=Sun

    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-gray-800">Lịch Chiến dịch</h1>
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border">
                    <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded-lg"><MdChevronLeft size={24}/></button>
                    <span className="font-bold text-lg min-w-[120px] text-center">Tháng {month}/{year}</span>
                    <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded-lg"><MdChevronRight size={24}/></button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-50 border-b">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                        <div key={d} className="p-3 text-center font-bold text-gray-500 text-sm border-r last:border-r-0">{d}</div>
                    ))}
                </div>
                {loading ? (
                    <div className="p-20 text-center text-gray-400">Đang tải...</div>
                ) : (
                    <div className="grid grid-cols-7 border-b last:border-b-0 auto-rows-[120px]">
                        {days.map((d, i) => (
                            <div key={i} className={`p-2 border-r border-b relative ${d ? 'bg-white hover:bg-gray-50 transition' : 'bg-gray-50'}`}>
                                {d && <div className="text-right text-sm font-semibold text-gray-400 mb-1">{d}</div>}
                                {d && campaigns.map(c => {
                                    const s = new Date(c.start_time);
                                    const e = new Date(c.end_time);
                                    const current = new Date(year, month - 1, d);
                                    const s0 = new Date(s.getFullYear(), s.getMonth(), s.getDate());
                                    const e0 = new Date(e.getFullYear(), e.getMonth(), e.getDate());

                                    if (current >= s0 && current <= e0) {
                                        return (
                                            <div key={c.id} className={`${COLORS[c.type]} text-white text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 truncate cursor-pointer shadow-sm`} title={`${c.name} (${c.type})`}>
                                                {c.name}
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-gray-600">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500"></div> Flash Sale</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-400"></div> Happy Hour</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-500"></div> Sự kiện mùa</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-500"></div> Tích điểm</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-teal-500"></div> Khác</div>
            </div>
        </div>
    );
};

export default CampaignCalendarPage;
