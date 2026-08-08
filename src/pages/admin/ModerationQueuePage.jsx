import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../utils/axiosClient';
import toast from 'react-hot-toast';
import { MdCheckCircle, MdWarning, MdBlock, MdSentimentSatisfied, MdSentimentDissatisfied, MdHelpOutline, MdRefresh, MdOpenInNew } from 'react-icons/md';

const PRIORITY_CONFIG = {
    CRITICAL: { label: 'Cực cao', color: 'bg-red-600 text-white', dot: 'bg-red-600' },
    HIGH:     { label: 'Cao',     color: 'bg-orange-500 text-white', dot: 'bg-orange-500' },
    MEDIUM:   { label: 'TB',      color: 'bg-yellow-400 text-gray-800', dot: 'bg-yellow-400' },
    LOW:      { label: 'Thấp',    color: 'bg-gray-200 text-gray-600', dot: 'bg-gray-300' },
};
const REASON_CONFIG = {
    COMPLAINT:  { label: 'Khiếu nại',     icon: <MdWarning />,              bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700' },
    NEGATIVE:   { label: 'Tiêu cực',      icon: <MdSentimentDissatisfied />, bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
    OFFENSIVE:  { label: 'Vi phạm',       icon: <MdBlock />,                bg: 'bg-red-50 border-red-200',      badge: 'bg-red-100 text-red-700' },
    SPAM:       { label: 'Spam',          icon: <MdBlock />,                bg: 'bg-gray-50 border-gray-200',    badge: 'bg-gray-100 text-gray-600' },
    POSITIVE:   { label: 'Tích cực',      icon: <MdSentimentSatisfied />,   bg: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-700' },
};

const STATUS_TABS = [
    { key: 'PENDING',     label: 'Chờ xử lý' },
    { key: 'IN_PROGRESS', label: 'Đang xử lý' },
    { key: 'RESOLVED',    label: 'Đã xử lý' },
    { key: 'ALL',         label: 'Tất cả' },
];

const ModerationQueuePage = () => {
    const [escalations, setEscalations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('PENDING');
    const [pendingCount, setPendingCount] = useState(0);
    const [sentimentStats, setSentimentStats] = useState([]);
    const [sentimentTotals, setSentimentTotals] = useState([]);

    const fetchEscalations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/feed/escalations?status=${activeTab}`);
            if (res.success) {
                setEscalations(res.data);
                setPendingCount(res.pending_count || 0);
            }
        } catch (e) {
            toast.error('Lỗi tải hàng đợi kiểm duyệt');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    const fetchSentimentStats = async () => {
        try {
            const res = await axiosClient.get('/admin/feed/sentiment-stats');
            if (res.success) {
                setSentimentTotals(res.totals || []);
            }
        } catch {}
    };

    useEffect(() => {
        fetchEscalations();
        fetchSentimentStats();
    }, [fetchEscalations]);

    const handleResolve = async (id, status = 'RESOLVED') => {
        try {
            await axiosClient.patch(`/admin/feed/escalations/${id}/resolve`, { status });
            toast.success('Đã cập nhật trạng thái!');
            fetchEscalations();
        } catch { toast.error('Lỗi cập nhật'); }
    };

    const handleUnhide = async (commentId, escalationId) => {
        try {
            await axiosClient.patch(`/admin/feed/comments/${commentId}/unhide`);
            await handleResolve(escalationId, 'RESOLVED');
            toast.success('Đã bỏ ẩn bình luận!');
        } catch { toast.error('Lỗi bỏ ẩn'); }
    };

    const getSentimentTotal = (sentiment) => {
        const found = sentimentTotals.find(t => t.sentiment === sentiment);
        return found ? found.count : 0;
    };

    const totalSentimentCount = sentimentTotals.reduce((sum, t) => sum + t.count, 0);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Hàng đợi Kiểm duyệt</h1>
                    <p className="text-gray-500 text-sm mt-1">AI phân loại và chuyển các bình luận cần xử lý đến đây</p>
                </div>
                <button onClick={fetchEscalations} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm transition">
                    <MdRefresh size={18} /> Làm mới
                </button>
            </div>

            {/* Sentiment Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                {[
                    { key: 'POSITIVE',  label: 'Tích cực',  color: 'bg-green-500',  textColor: 'text-green-600' },
                    { key: 'NEUTRAL',   label: 'Trung lập', color: 'bg-blue-400',   textColor: 'text-blue-600' },
                    { key: 'NEGATIVE',  label: 'Tiêu cực',  color: 'bg-yellow-400', textColor: 'text-yellow-600' },
                    { key: 'COMPLAINT', label: 'Khiếu nại', color: 'bg-orange-500', textColor: 'text-orange-600' },
                    { key: 'SPAM',      label: 'Spam',      color: 'bg-gray-400',   textColor: 'text-gray-600' },
                    { key: 'OFFENSIVE', label: 'Vi phạm',   color: 'bg-red-500',    textColor: 'text-red-600' },
                ].map(s => (
                    <div key={s.key} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
                        <div className={`text-2xl font-black ${s.textColor}`}>{getSentimentTotal(s.key)}</div>
                        <div className="text-xs text-gray-500 mt-1 font-medium">{s.label}</div>
                        <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full ${s.color} rounded-full`} style={{ width: totalSentimentCount ? `${(getSentimentTotal(s.key)/totalSentimentCount)*100}%` : '0%' }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-5 border-b border-gray-200">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition relative ${
                            activeTab === tab.key
                                ? 'bg-[#006a6a] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        {tab.label}
                        {tab.key === 'PENDING' && pendingCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingCount > 9 ? '9+' : pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Escalation List */}
            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-[#006a6a] border-t-transparent rounded-full animate-spin"></div></div>
            ) : escalations.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <MdCheckCircle size={48} className="mx-auto mb-3 text-green-300" />
                    <p className="font-semibold">Không có mục nào cần xử lý</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {escalations.map(item => {
                        const reason = REASON_CONFIG[item.reason] || REASON_CONFIG['NEGATIVE'];
                        const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG['LOW'];
                        return (
                            <div key={item.id} className={`rounded-2xl border p-5 ${reason.bg} shadow-sm`}>
                                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                    <div className="flex-1">
                                        {/* Meta row */}
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${reason.badge}`}>
                                                {reason.icon} {reason.label}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priority.color}`}>
                                                {priority.label}
                                            </span>
                                            {item.ai_confidence && (
                                                <span className="text-xs text-gray-400">Độ tin cậy: {(item.ai_confidence * 100).toFixed(0)}%</span>
                                            )}
                                            <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString('vi-VN')}</span>
                                        </div>

                                        {/* Post title */}
                                        <p className="text-xs text-gray-500 mb-1">Bài viết: <span className="font-semibold text-gray-700">{item.post_title}</span></p>
                                        
                                        {/* Comment content */}
                                        <div className="bg-white/70 rounded-xl px-4 py-3 border border-white shadow-sm mb-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-gray-700">{item.user_name} {item.user_phone && <span className="text-gray-400 font-normal">• {item.user_phone}</span>}</span>
                                            </div>
                                            <p className="text-sm text-gray-800">{item.comment_content}</p>
                                        </div>

                                        {/* Suggested reply */}
                                        {item.suggested_reply && (
                                            <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2 mb-3">
                                                <p className="text-xs font-semibold text-teal-700 mb-1">💡 AI gợi ý phản hồi:</p>
                                                <p className="text-sm text-teal-800 italic">"{item.suggested_reply}"</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {item.status === 'PENDING' || item.status === 'IN_PROGRESS' ? (
                                        <div className="flex flex-col gap-2 min-w-[140px]">
                                            <button onClick={() => handleResolve(item.id, 'RESOLVED')} className="flex items-center justify-center gap-1.5 bg-[#006a6a] hover:bg-teal-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition">
                                                <MdCheckCircle size={16} /> Đã xử lý
                                            </button>
                                            {(item.reason === 'SPAM' || item.reason === 'OFFENSIVE') && (
                                                <button onClick={() => handleUnhide(item.comment_id, item.id)} className="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 px-3 py-2 rounded-xl text-sm font-semibold transition">
                                                    Bỏ ẩn & Duyệt
                                                </button>
                                            )}
                                            <button onClick={() => handleResolve(item.id, 'IN_PROGRESS')} className="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 px-3 py-2 rounded-xl text-sm font-semibold transition">
                                                Đang xử lý
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-400 font-semibold bg-white/60 px-3 py-2 rounded-xl border border-gray-200 flex items-center gap-1.5">
                                            <MdCheckCircle className="text-green-400" size={16} />
                                            {item.status === 'RESOLVED' ? 'Đã giải quyết' : item.status}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ModerationQueuePage;
