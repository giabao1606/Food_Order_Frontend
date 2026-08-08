import React, { useState, useEffect } from 'react';
import axiosClient from '../../../utils/axiosClient';
import toast from 'react-hot-toast';
import { MdCheckCircle, MdCancel, MdStore } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

const CampaignProposalPage = () => {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProposals = async () => {
            setLoading(true);
            try {
                const res = await axiosClient.get(`/admin/campaigns/proposals?status=${statusFilter}`);
                if (res.success) setProposals(res.data);
            } catch (error) { toast.error('Lỗi tải danh sách đề xuất'); }
            finally { setLoading(false); }
        };
        fetchProposals();
    }, [statusFilter]);

    const handleReview = async (proposal, status) => {
        const id = proposal.id;
        const note = status === 'REJECTED' ? prompt('Lý do từ chối (tùy chọn):') : '';
        if (status === 'REJECTED' && note === null) return; // user cancelled prompt

        try {
            const res = await axiosClient.patch(`/admin/campaigns/proposals/${id}`, { status, review_note: note });
            if (res.success) {
                toast.success(status === 'APPROVED' ? 'Đã duyệt đề xuất!' : 'Đã từ chối đề xuất');
                setProposals(proposals.filter(p => p.id !== id));
                if (status === 'APPROVED') {
                    if (window.confirm('Bạn có muốn tạo Campaign từ đề xuất này ngay bây giờ?')) {
                        navigate('/admin/campaigns/create', { state: { proposal } });
                    }
                }
            }
        } catch (error) { toast.error('Lỗi xử lý đề xuất'); }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-black text-gray-800 mb-6">Đề xuất chiến dịch</h1>

            <div className="flex gap-2 mb-6">
                {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition ${statusFilter === s ? 'bg-[#006a6a] text-white shadow-sm' : 'bg-white text-gray-500 border hover:bg-gray-50'}`}
                    >
                        {s === 'PENDING' ? 'Chờ duyệt' : s === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="p-10 text-center text-gray-400">Đang tải...</div>
            ) : proposals.length === 0 ? (
                <div className="p-20 text-center text-gray-400 font-semibold bg-white rounded-2xl border border-gray-100">Không có đề xuất nào.</div>
            ) : (
                <div className="grid gap-4">
                    {proposals.map(p => (
                        <div key={p.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                        <MdStore /> {p.branch_name}
                                    </span>
                                    <span className="text-xs text-gray-400 font-semibold">{new Date(p.created_at).toLocaleString('vi-VN')}</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">{p.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{p.description}</p>
                                
                                <div className="mt-3 bg-gray-50 p-3 rounded-xl text-xs text-gray-600 grid grid-cols-2 gap-2 border border-gray-100">
                                    <div><span className="font-semibold">Người đề xuất:</span> {p.proposer_name}</div>
                                    <div><span className="font-semibold">Loại chiến dịch:</span> {p.suggested_type || 'Khác'}</div>
                                    <div><span className="font-semibold">Mức giảm giá:</span> {p.suggested_discount_type === 'PERCENT' ? `Giảm ${p.suggested_discount_value}%` : p.suggested_discount_type === 'AMOUNT' ? `Giảm ${Number(p.suggested_discount_value).toLocaleString()}đ` : 'Không có'}</div>
                                    <div><span className="font-semibold">Bắt đầu (dự kiến):</span> {p.suggested_start ? new Date(p.suggested_start).toLocaleString('vi-VN') : 'Không rõ'}</div>
                                    <div><span className="font-semibold">Kết thúc (dự kiến):</span> {p.suggested_end ? new Date(p.suggested_end).toLocaleString('vi-VN') : 'Không rõ'}</div>
                                </div>
                                
                                {p.reason && (
                                    <div className="mt-3 text-sm text-orange-700 bg-orange-50 p-3 rounded-xl border border-orange-100">
                                        <span className="font-bold">Lý do đề xuất:</span> {p.reason}
                                    </div>
                                )}
                            </div>
                            
                            {statusFilter === 'PENDING' && (
                                <div className="flex flex-col gap-2 min-w-[120px]">
                                    <button onClick={() => handleReview(p, 'APPROVED')} className="flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition">
                                        <MdCheckCircle size={18}/> Duyệt
                                    </button>
                                    <button onClick={() => handleReview(p, 'REJECTED')} className="flex items-center justify-center gap-1 bg-white hover:bg-red-50 text-red-500 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold transition">
                                        <MdCancel size={18}/> Từ chối
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CampaignProposalPage;
