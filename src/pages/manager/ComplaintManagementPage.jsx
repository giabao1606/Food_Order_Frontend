import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import { uploadImageToServer } from '../../utils/uploadHelper';
import { MdClose, MdVisibility, MdCheckCircle, MdCancel } from 'react-icons/md';

const ComplaintManagementPage = () => {
    const [complaints, setComplaints] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // State cho tính năng chọn món bị lỗi
    const [orderItems, setOrderItems] = useState([]);
    const [faultyItemIds, setFaultyItemIds] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    
    // Form xử lý
    const [resolutions, setResolutions] = useState({
        Refund: false,
        Voucher: false,
        NewOrder: false,
        AddPoints: false
    });
    const [refundAmount, setRefundAmount] = useState(''); 
    const [rewardPoints, setRewardPoints] = useState(''); 
    const [refundEvidence, setRefundEvidence] = useState('');
    const [evidenceFile, setEvidenceFile] = useState(null);
    const [adminNote, setAdminNote] = useState('');
    const [selectedVoucherId, setSelectedVoucherId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchAll = async (signal) => {
        try {
            const [complaintsRes, vouchersRes] = await Promise.all([
                axiosClient.get('/complaints/admin/all', { signal }),
                axiosClient.get('/vouchers/admin/compensation', { signal }),
            ]);
            if (complaintsRes.success) setComplaints(complaintsRes.data);
            if (vouchersRes.success && Array.isArray(vouchersRes.data)) setVouchers(vouchersRes.data);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error('Lỗi tải dữ liệu khiếu nại:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchAll(controller.signal);
        return () => controller.abort();
    }, []);


    const handleOpenModal = async (complaint) => {
        setSelectedComplaint(complaint);
        // Reset toàn bộ state
        setResolutions({ Refund: false, Voucher: false, NewOrder: false, AddPoints: false });
        setRefundEvidence('');
        setAdminNote('');
        setSelectedVoucherId('');
        setRefundAmount('');
        setRewardPoints('');
        setRefundEvidence('');
        setEvidenceFile(null);
        setFaultyItemIds([]);
        
        // Reset danh sách món
        setOrderItems([]);
        setIsModalOpen(true);

        // Fetch danh sách món ăn của đơn hàng này
        setLoadingItems(true);
        try {
            const orderIdToFetch = complaint.order_id || complaint.Id_order;            
            if (!orderIdToFetch) {
                alert("Lỗi: Dữ liệu khiếu nại bị thiếu ID Đơn hàng!");
                setLoadingItems(false);
                return;
            }
            const res = await axiosClient.get(`/orders/admin/${orderIdToFetch}`);
            if (res.success && res.items) {
                setOrderItems(res.items);
            } else if (res.data && res.data.success && res.data.items) {
                setOrderItems(res.data.items);
            } else if (Array.isArray(res)) {
                setOrderItems(res);
            } else if (Array.isArray(res.data)) {
                setOrderItems(res.data);
            } else {
                setOrderItems([]);
            }
        } catch (error) {
            console.error('Lỗi tải món ăn:', error);
            alert(error.response?.data?.message || "Không thể tải danh sách món ăn của đơn hàng này.");
        } finally {
            setLoadingItems(false);
        }
    };

    const handleEvidenceUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) return alert("Kích thước ảnh không vượt quá 5MB!");
            const previewUrl = URL.createObjectURL(file);
            setRefundEvidence(previewUrl);
            setEvidenceFile(file);
        }
    };

    // Hàm tự động tính tổng tiền của các món ăn đang được tích lỗi
    const getFaultyItemsTotal = () => {
        return orderItems
            .filter(item => faultyItemIds.includes(item.id || item.Id_order_item))
            .reduce((sum, item) => sum + (Number(item.price || item.Total_item_price || item.Price || 0)), 0);
    };

    const handleResolve = async (status) => {
        if (!adminNote.trim()) return alert("Vui lòng nhập phản hồi cho khách hàng!");
        
        const selectedResolutions = Object.keys(resolutions).filter(k => resolutions[k]);
        
        if (status === 'RESOLVED') {
            if (selectedResolutions.length === 0) return alert("Vui lòng tick chọn ít nhất một hình thức đền bù!");
            if (resolutions.Voucher && !selectedVoucherId) return alert("Vui lòng chọn Voucher đền bù!");
            if (resolutions.AddPoints && (!rewardPoints || Number(rewardPoints) <= 0)) return alert("Vui lòng nhập số điểm tặng đền bù lớn hơn 0!");
            if (resolutions.Refund && refundAmount && Number(refundAmount) <= 0) return alert("Số tiền hoàn phải lớn hơn 0!");
            if (resolutions.Refund && (selectedComplaint?.payment_method || '').toUpperCase() === 'COD' && !refundEvidence) {
                return alert("Vui lòng tải lên ảnh biên lai chuyển khoản hoàn tiền!");
            }
            if ((resolutions.NewOrder) && faultyItemIds.length === 0) {
                return alert("Vui lòng tick chọn ít nhất 1 món ăn bị lỗi ở bảng bên dưới để tạo đơn làm lại!");
            }
        }

        setIsSubmitting(true);
        try {
            let finalEvidenceUrl = refundEvidence;
            if (evidenceFile) {
                finalEvidenceUrl = await uploadImageToServer(evidenceFile, 'complaints');
            }
            
            const payload = {
                status: status,
                resolutions: status === 'RESOLVED' ? selectedResolutions : [],
                adminNote: adminNote,
                voucherId: resolutions.Voucher ? selectedVoucherId : null,
                refundEvidence: (resolutions.Refund && (selectedComplaint?.payment_method || '').toUpperCase() === 'COD') ? finalEvidenceUrl : null,
                faultyItemIds: faultyItemIds,
                refundAmount: resolutions.Refund && refundAmount ? Number(refundAmount) : null,
                rewardPoints: resolutions.AddPoints && rewardPoints ? Number(rewardPoints) : null,
                compensation_voucher_id: resolutions.Voucher ? selectedVoucherId : null
            };

            const res = await axiosClient.put(`/complaints/admin/resolve/${selectedComplaint.id}`, payload);
            if (res.success) {
                alert('Xử lý khiếu nại thành công!');
                setIsModalOpen(false);
                fetchAll();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi xử lý!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getResolutionTags = (resolutionStr) => {
        try {
            const arr = JSON.parse(resolutionStr);
            if (!Array.isArray(arr) || arr.length === 0) return 'Không có';
            return arr.join(', ');
        } catch (e) { return 'Không có'; }
    };

    if (loading) return <div className="p-6 text-center">Đang tải danh sách khiếu nại...</div>;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto relative min-h-screen bg-gray-50">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#006a6a] tracking-tight">Quản lý Khiếu nại</h1>
                    <p className="text-gray-500 text-sm mt-1">Tiếp nhận và xử lý sự cố đơn hàng tại chi nhánh</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 text-sm uppercase">
                                <th className="p-4 border-b">Mã KN</th>
                                <th className="p-4 border-b">Chi nhánh</th>
                                <th className="p-4 border-b">Đơn hàng</th>
                                <th className="p-4 border-b">Lý do</th>
                                <th className="p-4 border-b">Thời gian</th>
                                <th className="p-4 border-b">Trạng thái</th>
                                <th className="p-4 border-b text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {complaints.map((item) => (
                                <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold text-gray-800">#{item.id}</td>
                                    <td className="p-4 text-sm font-medium text-[#F25C05]">{item.branch_name || 'Hệ thống'}</td>
                                    <td className="p-4 font-bold text-[#006a6a]">#{item.order_id}</td>
                                    <td className="p-4 text-sm text-gray-800 font-medium">{item.complaint_text}</td>
                                    <td className="p-4 text-sm text-gray-600">{new Date(item.created_at).toLocaleString('vi-VN')}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                            item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                            item.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {item.status === 'PENDING' ? 'Chờ xử lý' : item.status === 'RESOLVED' ? 'Đã giải quyết' : 'Đã từ chối'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => handleOpenModal(item)}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 mx-auto"
                                        >
                                            <MdVisibility size={18} /> Xem & Xử lý
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && selectedComplaint && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col max-h-[95vh]">
                        <div className="flex justify-between items-center p-5 border-b bg-gray-50">
                            <h2 className="text-xl font-bold text-[#006a6a]">Xử lý Khiếu nại #{selectedComplaint.id}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><MdClose size={24} /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Cột trái: Bằng chứng & Chọn món lỗi */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-bold text-gray-700 text-sm mb-2">Hình ảnh bằng chứng từ Khách hàng</h3>
                                    {selectedComplaint.image_evidence ? (
                                        <div className="border rounded-lg overflow-hidden h-48 bg-gray-100">
                                            <img src={selectedComplaint.image_evidence} alt="Bằng chứng" className="w-full h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="border border-dashed rounded-lg flex items-center justify-center h-48 bg-gray-50 text-gray-400 text-sm">
                                            Không có ảnh đính kèm
                                        </div>
                                    )}
                                </div>
                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                    <p className="text-sm font-bold text-orange-800 mb-1">Lý do: {selectedComplaint.complaint_text}</p>
                                    <p className="text-sm text-gray-700 italic">"{selectedComplaint.user_note || 'Không có mô tả chi tiết'}"</p>
                                </div>

                                {selectedComplaint.status === 'PENDING' && (
                                    <div className="bg-white border p-4 rounded-xl shadow-sm border-gray-200">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Chi tiết đơn hàng - Tick món lỗi để giao lại 
                                        </label>
                                        {loadingItems ? (
                                            <p className="text-sm text-gray-500">Đang tải danh sách món...</p>
                                        ) : (
                                            <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                                                {orderItems.map((item, index) => {
                                                    const itemId = item.id || item.Id_order_item || index;
                                                    const qty = item.quantity || item.Quantity || 1;
                                                    const foodName = item.food_name || item.Food_name || item.name || 'Món ăn';
                                                    const price = item.price || item.Total_item_price || item.Price || 0;

                                                    return (
                                                        <label key={itemId} className="flex items-start gap-3 p-2.5 hover:bg-teal-50 rounded-lg cursor-pointer border border-transparent hover:border-teal-100 transition bg-gray-50">
                                                            <input 
                                                                type="checkbox" 
                                                                className="mt-0.5 w-4 h-4 accent-[#006a6a]"
                                                                checked={faultyItemIds.includes(itemId)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setFaultyItemIds([...faultyItemIds, itemId]);
                                                                    else setFaultyItemIds(faultyItemIds.filter(id => id !== itemId));
                                                                }}
                                                            />
                                                            <div>
                                                                <p className="font-semibold text-gray-800 text-sm leading-tight">{qty}x {foodName}</p>
                                                                <p className="text-xs font-bold text-red-500 mt-0.5">{Number(price).toLocaleString()}đ</p>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Cột phải: Form Xử lý Đã Cập Nhật */}
                            <div className="space-y-5">
                                {selectedComplaint.status === 'PENDING' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Tick chọn hình thức đền bù</label>
                                            <div className="flex flex-wrap gap-4 p-3 bg-gray-50 border rounded-xl">
                                                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-700">
                                                    <input type="checkbox" checked={resolutions.Refund} onChange={(e) => setResolutions({...resolutions, Refund: e.target.checked})} className="w-4 h-4 accent-[#006a6a]" /> Hoàn tiền
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-700">
                                                    <input type="checkbox" checked={resolutions.NewOrder} onChange={(e) => setResolutions({...resolutions, NewOrder: e.target.checked})} className="w-4 h-4 accent-[#006a6a]" /> Giao lại món
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-700">
                                                    <input type="checkbox" checked={resolutions.Voucher} onChange={(e) => setResolutions({...resolutions, Voucher: e.target.checked})} className="w-4 h-4 accent-[#006a6a]" /> Tặng Voucher
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-gray-700">
                                                    <input type="checkbox" checked={resolutions.AddPoints} onChange={(e) => setResolutions({...resolutions, AddPoints: e.target.checked})} className="w-4 h-4 accent-[#006a6a]" /> Tặng Điểm
                                                </label>
                                            </div>
                                        </div>

                                        {/* Các field động dựa vào tuỳ chọn */}
                                        <div className="space-y-3 bg-white">
                                            {resolutions.Refund && (
                                                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <label className="block text-sm font-bold text-gray-700">Số tiền hoàn (VNĐ)</label>
                                                        {/* Bộ nút hỗ trợ tính nhanh */}
                                                        <div className="flex gap-2">
                                                            <button 
                                                                type="button"
                                                                onClick={() => setRefundAmount(getFaultyItemsTotal())}
                                                                className="text-xs bg-teal-50 text-[#006a6a] hover:bg-teal-100 font-bold px-2 py-1 rounded border border-teal-200"
                                                            >
                                                                Tính theo món lỗi ({getFaultyItemsTotal().toLocaleString()}đ)
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    alert("Hệ thống sẽ tự hoàn 100% hóa đơn nếu bạn để trống ô này.");
                                                                }}
                                                                className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium px-2 py-1 rounded"
                                                            >
                                                                Hoàn full đơn
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input 
                                                        type="number" 
                                                        value={refundAmount} 
                                                        onChange={(e) => setRefundAmount(e.target.value)} 
                                                        placeholder="Bỏ trống nếu hoàn toàn bộ đơn hàng" 
                                                        className="w-full border p-2.5 rounded-xl outline-none focus:border-[#006a6a] text-sm" 
                                                    />
                                                </div>
                                            )}

                                            {resolutions.Refund && (selectedComplaint?.payment_method || '').toUpperCase() === 'COD' && (
                                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                                                    <label className="block text-sm font-bold text-blue-800 mb-1">Ảnh biên lai hoàn tiền (Cho đơn COD) <span className="text-red-500">*</span></label>
                                                    <input type="file" accept="image/*" onChange={handleEvidenceUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
                                                    {refundEvidence && <img src={refundEvidence} alt="Biên lai" className="mt-3 h-24 rounded-lg border object-cover shadow-sm"/>}
                                                </div>
                                            )}

                                            {resolutions.Voucher && (
                                                <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Chọn Voucher <span className="text-red-500">*</span></label>
                                                    <select value={selectedVoucherId} onChange={(e) => setSelectedVoucherId(e.target.value)} className="w-full border p-2.5 rounded-xl outline-none focus:border-[#006a6a] text-sm">
                                                        <option value="">-- Chọn Voucher gửi tặng --</option>
                                                        {vouchers.map(v => <option key={v.id || v.Id_voucher} value={v.id || v.Id_voucher}>{v.code || v.Code} - {v.name || v.Name}</option>)}
                                                    </select>
                                                </div>
                                            )}

                                            {resolutions.AddPoints && (
                                                <div className="bg-yellow-50/50 p-3 rounded-lg border border-yellow-100">
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Số điểm tặng <span className="text-red-500">*</span></label>
                                                    <input type="number" value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} placeholder="Nhập số điểm..." className="w-full border p-2.5 rounded-xl outline-none focus:border-[#006a6a] text-sm" />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Phản hồi của Admin (Gửi cho khách) <span className="text-red-500">*</span></label>
                                            <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Nhập lời xin lỗi hoặc lý do từ chối..." className="w-full border p-3 rounded-xl outline-none h-20 text-sm resize-none focus:border-[#006a6a]"></textarea>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button onClick={() => handleResolve('REJECTED')} disabled={isSubmitting} className="flex-1 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl flex items-center justify-center gap-1 transition">
                                                <MdCancel size={18} /> Từ chối
                                            </button>
                                            <button onClick={() => handleResolve('RESOLVED')} disabled={isSubmitting} className="flex-1 py-3 bg-[#006a6a] hover:bg-teal-700 text-white font-bold rounded-xl flex items-center justify-center gap-1 transition shadow-md">
                                                <MdCheckCircle size={18} /> Phê duyệt đền bù
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-gray-100 p-5 rounded-xl text-center flex flex-col justify-center h-full">
                                        <MdCheckCircle size={40} className={`mx-auto mb-2 ${selectedComplaint.status === 'RESOLVED' ? 'text-green-500' : 'text-red-500'}`} />
                                        <h3 className="font-bold text-gray-800 text-lg mb-1">{selectedComplaint.status === 'RESOLVED' ? 'Đã giải quyết' : 'Đã từ chối'}</h3>
                                        {selectedComplaint.resolution_type && <p className="text-sm font-semibold text-[#006a6a] mt-2">Hình thức: {getResolutionTags(selectedComplaint.resolution_type)}</p>}
                                        <p className="text-sm text-gray-600 mt-2 italic border-t pt-2 border-gray-300">Phản hồi của Admin: "{selectedComplaint.admin_note}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplaintManagementPage;