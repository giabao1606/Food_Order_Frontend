import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../../utils/axiosClient';
import toast from 'react-hot-toast';
import { MdAdd, MdDelete, MdEdit } from 'react-icons/md';

const STATUS_BADGE = {
    DRAFT: 'bg-gray-100 text-gray-600',
    SCHEDULED: 'bg-yellow-100 text-yellow-700',
    RUNNING: 'bg-teal-100 text-teal-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700'
};

const STATUS_TEXT = {
    DRAFT: 'Bản nháp',
    SCHEDULED: 'Sắp diễn ra',
    RUNNING: 'Đang chạy',
    COMPLETED: 'Đã kết thúc',
    CANCELLED: 'Đã hủy'
};

const CampaignListPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const navigate = useNavigate();

    useEffect(() => {
        fetchCampaigns();
    }, [statusFilter]);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/admin/campaigns?status=${statusFilter}`);
            if (res.success) setCampaigns(res.data);
        } catch (error) {
            toast.error('Lỗi tải danh sách chiến dịch');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy chiến dịch này?')) return;
        try {
            const res = await axiosClient.post(`/admin/campaigns/${id}/cancel`);
            if (res.success) {
                toast.success('Hủy chiến dịch thành công');
                fetchCampaigns();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi hủy');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Danh sách Chiến dịch</h1>
                    <p className="text-sm text-gray-500 mt-1">Quản lý và theo dõi tất cả campaign</p>
                </div>
                <button onClick={() => navigate('/admin/campaigns/create')} className="bg-[#006a6a] hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-sm">
                    <MdAdd size={20} /> Tạo Campaign
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-2">
                    {['ALL', 'DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${statusFilter === s ? 'bg-[#006a6a] text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
                        >
                            {s === 'ALL' ? 'Tất cả' : STATUS_TEXT[s]}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="p-10 text-center">Đang tải...</div>
                ) : (
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                            <tr>
                                <th className="p-4 font-semibold w-1/3">Tên & Phân loại</th>
                                <th className="p-4 font-semibold">Thời gian áp dụng</th>
                                <th className="p-4 font-semibold">Trạng thái</th>
                                <th className="p-4 font-semibold">Phạm vi / Nội dung</th>
                                <th className="p-4 font-semibold text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-400">Không tìm thấy campaign nào.</td></tr>
                            ) : campaigns.map(c => (
                                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{c.name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Loại: {c.type} {c.discount_percent ? `(-${c.discount_percent}%)` : ''}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-xs">
                                            <span className="text-green-600 font-bold">Từ: </span>{new Date(c.start_time).toLocaleString('vi-VN')}<br/>
                                            <span className="text-red-500 font-bold">Đến: </span>{new Date(c.end_time).toLocaleString('vi-VN')}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_BADGE[c.status]}`}>
                                            {STATUS_TEXT[c.status] || c.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-0.5 text-xs">
                                            {c.target_scope === 'BRANCH' ? <span className="text-teal-600 font-semibold mb-1">📍 {c.branch_count} chi nhánh</span> : <span className="text-blue-600 font-semibold mb-1">📍 Toàn hệ thống</span>}
                                            {c.min_tier ? <span className="text-orange-600 font-semibold mb-1">⭐ Từ hạng: {c.min_tier}</span> : <span className="text-gray-500 font-medium mb-1">⭐ Áp dụng: Mọi hạng</span>}
                                            <span className="bg-gray-100 px-2 py-0.5 rounded w-fit text-gray-500">{c.item_count} items đính kèm</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link to={`/admin/campaigns/${c.id}`} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Xem chi tiết">
                                                <MdEdit size={20} />
                                            </Link>
                                            {(c.status === 'DRAFT' || c.status === 'SCHEDULED' || c.status === 'RUNNING') && (
                                                <button onClick={() => handleCancel(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Hủy campaign">
                                                    <MdDelete size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default CampaignListPage;
