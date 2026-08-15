import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import axiosClient from '../../utils/axiosClient';
import { FaPlus, FaSearch, FaArrowRight, FaHistory, FaTimes, FaBoxOpen, FaEdit, FaEye, FaFileInvoice, FaLayerGroup, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { MdInventory } from 'react-icons/md';

const StockManagementPage = () => {
    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [ingredients, setIngredients] = useState([]);
    const [conversions, setConversions] = useState([]); 
    const [activeTab, setActiveTab] = useState('inventory');

    // State xem chi tiết phiếu
    const [viewingTransaction, setViewingTransaction] = useState(null);
    const [transactionDetails, setTransactionDetails] = useState([]);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    // Bộ lọc lịch sử
    const [filterType, setFilterType] = useState('ALL');
    const [searchNote, setSearchNote] = useState('');
    
    // Form tạo phiếu
    const [transactionForm, setTransactionForm] = useState({
        transaction_type: 'IMPORT',
        note: '',
        details: []
    });
    const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);

    // Tính tổng tiền phiếu nhập (chỉ áp dụng IMPORT)
    const computedTotalAmount = transactionForm.details.reduce((sum, d) => {
        return sum + (Number(d.quantity || 0) * Number(d.conversion_rate || 1) * Number(d.unit_price || 0));
    }, 0);

    // Import excel
    const fileInputRef = useRef(null);
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const dataBinary = evt.target.result;
                const workbook = XLSX.read(dataBinary, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                const newDetails = sheetData.map(row => {
                    const ingredientName = row['Tên nguyên liệu']?.toString().trim().toLowerCase();
                    const matchedIngredient = ingredients.find(i => i.name.toLowerCase() === ingredientName);

                    return {
                        ingredient_id: matchedIngredient ? matchedIngredient.id : '', // Gắn ID nếu tìm thấy
                        quantity: row['Số lượng'] || 0,
                        unit_price: row['Đơn giá'] || 0,
                        conversion_rate: 1
                    };
                }).filter(d => d.quantity > 0);

                if (newDetails.length === 0) {
                    alert("File không có dữ liệu hợp lệ (Cần có 'Tên nguyên liệu', 'Số lượng', 'Đơn giá').");
                    e.target.value = null;
                    return;
                }
                setTransactionForm(prev => ({
                    ...prev,
                    details: [...prev.details, ...newDetails]
                }));
                alert(`Đã thêm ${newDetails.length} nguyên liệu từ file Excel vào danh sách chờ.`);
            } catch (error) {
                console.error(error);
                alert("Có lỗi khi upload: " + error.message);
            }
            e.target.value = null; 
        };
        reader.readAsBinaryString(file);
    };
    
    // State cho tính năng sửa Min Stock
    const [editingItem, setEditingItem] = useState(null);
    const [newMinStock, setNewMinStock] = useState('');
    
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = storedUser.role || localStorage.getItem('role') || 'STAFF';
    const rawBranchId = localStorage.getItem('selectedBranchId') || storedUser.branch_id;
    const branchId = (rawBranchId === 'null' || rawBranchId === 'undefined') ? null : rawBranchId; 

    useEffect(() => {
        const controller = new AbortController();
        const sig = controller.signal;
        if (activeTab === 'inventory') {
            fetchInventory(sig);
        } else {
            fetchTransactions(sig);
        }
        fetchIngredients(sig); 
        fetchConversions(sig); 
        return () => controller.abort();
    }, [activeTab]);

    const fetchInventory = async (signal) => {
        try {
            const res = await axiosClient.get(`/stock/inventory/${branchId}`, { signal });
            setInventory(res.data || []);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') console.error(error);
        }
    };

    const fetchTransactions = async (signal) => {
        try {
            const res = await axiosClient.get(`/stock/transaction/${branchId}`, { signal });
            setTransactions(res.data || []);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') console.error(error);
        }
    };

    const fetchIngredients = async (signal) => {
        try {
            const res = await axiosClient.get('/ingredients', { signal });
            setIngredients(res.data || []);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') console.error(error);
        }
    };

    const fetchConversions = async (signal) => {
        try {
            const res = await axiosClient.get('/ingredients/conversions/all', { signal });
            setConversions(res.data || []);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') console.error(error);
        }
    };

    const handleAddDetail = () => {
        setTransactionForm({
            ...transactionForm,
            details: [...transactionForm.details, { ingredient_id: '', quantity: '', unit_price: '', conversion_rate: 1 }]
        });
    };

    // Xem chi tiết phiếu
    const handleViewDetails = async (trans) => {
        setViewingTransaction(trans);
        setIsDetailLoading(true);
        setTransactionDetails([]);
        try {
            const res = await axiosClient.get(`/stock/transaction/details/${trans.id}`);
            setTransactionDetails(res.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsDetailLoading(false);
        }
    };

    const handleDetailChange = (index, field, value) => {
        const newDetails = [...transactionForm.details];
        newDetails[index][field] = value;
        setTransactionForm({ ...transactionForm, details: newDetails });
    };

    const handleRemoveDetail = (index) => {
        const newDetails = [...transactionForm.details];
        newDetails.splice(index, 1);
        setTransactionForm({ ...transactionForm, details: newDetails });
    };

    const handleSubmitTransaction = async (e) => {
        e.preventDefault();
        if (isSubmittingTransaction) return;
        if (!branchId || branchId === 'null') return alert("Lỗi: Không tìm thấy chi nhánh!");
        try {
            setIsSubmittingTransaction(true);
            // TÍNH TOÁN QUY ĐỔI NGAY TẠI FRONTEND TRƯỚC KHI GỬI XUỐNG BACKEND
            const validDetails = transactionForm.details
                .filter(d => d.ingredient_id && Number(d.quantity) > 0)
                .map(d => ({
                    ingredient_id: d.ingredient_id,
                    // Số lượng gửi đi = Số lượng nhập tay * Hệ số quy đổi
                    quantity: Number(d.quantity) * Number(d.conversion_rate || 1), 
                    unit_price: Number(d.unit_price || 0)
                }));

            if (validDetails.length === 0) return alert("Vui lòng thêm ít nhất một nguyên liệu hợp lệ!");

            const payload = {
                branch_id: branchId,
                transaction_type: transactionForm.transaction_type,
                total_amount: transactionForm.transaction_type === 'IMPORT' ? computedTotalAmount : 0,
                note: transactionForm.note,
                details: validDetails
            };

            await axiosClient.post('/stock/transaction', payload);
            alert('Tạo phiếu kho thành công!');
            setIsTransactionModalOpen(false);
            setTransactionForm({ transaction_type: 'IMPORT', note: '', details: [] });
            
            if (activeTab === 'inventory') fetchInventory();
            else fetchTransactions();

        } catch (error) {
            alert(error.response?.data?.message || 'Có lỗi xảy ra khi tạo phiếu!');
        } finally {
            setIsSubmittingTransaction(false);
        }
    };

    const handleUpdateMinStock = async (e) => {
    e.preventDefault();
    if (!branchId || branchId === 'null') {
        return alert("Lỗi: Không tìm thấy chi nhánh! Vui lòng tải lại trang hoặc chọn lại chi nhánh.");
    }
    if (!editingItem || !editingItem.ingredient_id) {
        return alert("Lỗi: Không xác định được nguyên liệu cần sửa!");
    }
    try {
        const payload = {
            branch_id: branchId,
            ingredient_id: editingItem.ingredient_id,
            min_stock_level: Number(newMinStock) || 0 
        };
        const res = await axiosClient.put('/stock/inventory/min-stock', payload);        
        if (res.success) {
            alert('Cập nhật mức cảnh báo thành công!');
            setEditingItem(null);
            fetchInventory(); 
        }
    } catch (error) {
        console.error("Lỗi cập nhật Min Stock:", error);
        alert(error.response?.data?.message || 'Lỗi cập nhật mức tối thiểu!');
    }
};

    const formatType = (type) => {
        const map = {
            'IMPORT':      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-bold text-xs border border-green-100"><FaArrowDown size={10}/>NHẬP KHO</span>,
            'EXPORT':      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg font-bold text-xs border border-red-100"><FaArrowUp size={10}/>XUẤT KHO</span>,
            'DAMAGE':      <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-lg font-bold text-xs border border-yellow-100">⚠ HỎNG/HỦY</span>,
            'RETURN':      <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs border border-blue-100">↩ TRẢ HÀNG</span>,
            'MANUFACTURE': <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-lg font-bold text-xs border border-purple-100">🍳 NẤU MẺ</span>,
        };
        return map[type] || <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg font-bold text-xs">{type}</span>;
    };

    // Lọc lịch sử
    const filteredTransactions = transactions.filter(t => {
        const typeMatch = filterType === 'ALL' || t.transaction_type === filterType;
        const noteMatch = !searchNote || (t.note || '').toLowerCase().includes(searchNote.toLowerCase()) || String(t.id).includes(searchNote);
        return typeMatch && noteMatch;
    });

    // Tổng kết lịch sử đang lọc
    const totalImport = filteredTransactions.filter(t => t.transaction_type === 'IMPORT').reduce((s, t) => s + Number(t.total_amount || 0), 0);
    const totalDamage = filteredTransactions.filter(t => ['DAMAGE','EXPORT'].includes(t.transaction_type)).reduce((s, t) => s + Number(t.total_amount || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Quản lý kho chi nhánh</h1>
                    <p className="text-gray-500 text-sm mt-1">Theo dõi tồn kho và tạo phiếu xuất/nhập/sản xuất</p>
                </div>
                <button onClick={() => setIsTransactionModalOpen(true)} className="bg-[#006a6a] hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap">
                    <FaPlus /> Tạo Phiếu Kho
                </button>
            </div>

            <div className="flex border-b border-gray-200 gap-6">
                <button 
                    onClick={() => setActiveTab('inventory')}
                    className={`pb-3 font-bold flex items-center gap-2 text-sm transition-all ${activeTab === 'inventory' ? 'border-b-2 border-[#006a6a] text-[#006a6a]' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <FaBoxOpen size={16} /> TỒN KHO HIỆN TẠI
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`pb-3 font-bold flex items-center gap-2 text-sm transition-all ${activeTab === 'history' ? 'border-b-2 border-[#006a6a] text-[#006a6a]' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <FaHistory size={16} /> LỊCH SỬ GIAO DỊCH
                </button>
            </div>

            {/* BỘ LỌC - chỉ hiện khi ở tab lịch sử */}
            {activeTab === 'history' && (
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            value={searchNote}
                            onChange={e => setSearchNote(e.target.value)}
                            placeholder="Tìm mã phiếu, ghi chú..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#006a6a]"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {['ALL','IMPORT','EXPORT','DAMAGE','RETURN','MANUFACTURE'].map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${filterType === t ? 'bg-[#006a6a] text-white border-[#006a6a]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#006a6a]'}`}
                            >
                                {t === 'ALL' ? 'Tất cả' : t === 'IMPORT' ? 'Nhập kho' : t === 'EXPORT' ? 'Xuất kho' : t === 'DAMAGE' ? 'Hỏng/Hủy' : t === 'RETURN' ? 'Trả hàng' : 'Nấu mẻ'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* THỐNG KÊ NHANH - chỉ Manager xem tab lịch sử */}
            {activeTab === 'history' && userRole === 'MANAGER' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 shrink-0">
                            <FaArrowDown />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Tổng tiền nhập kho</p>
                            <p className="text-xl font-black text-green-900">{totalImport.toLocaleString('vi-VN')}đ</p>
                            <p className="text-xs text-green-600">{filteredTransactions.filter(t => t.transaction_type === 'IMPORT').length} phiếu nhập</p>
                        </div>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-700 shrink-0">
                            <FaArrowUp />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Xuất / Hỏng hàng</p>
                            <p className="text-xl font-black text-red-900">{totalDamage.toLocaleString('vi-VN')}đ</p>
                            <p className="text-xs text-red-600">{filteredTransactions.filter(t => ['DAMAGE','EXPORT'].includes(t.transaction_type)).length} phiếu xuất/hỏng</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        {activeTab === 'inventory' ? (
                            <>
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                        <th className="p-4 font-bold">Mã NL</th>
                                        <th className="p-4 font-bold">Tên Vật Tư / Nguyên Liệu</th>
                                        <th className="p-4 font-bold text-right">Tồn Kho</th>
                                        <th className="p-4 font-bold text-right">Mức Tối Thiểu</th>
                                        <th className="p-4 font-bold text-center">Trạng Thái</th>
                                        <th className="p-4 font-bold">ĐVT</th>
                                        <th className="p-4 font-bold text-right">Cập nhật cuối</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-100">
                                    {inventory.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                                            <td className="p-4 font-semibold text-gray-500">#{item.ingredient_id}</td>
                                            <td className="p-4 font-bold text-gray-800 flex items-center gap-2 flex-wrap">
                                                {item.name}
                                                {item.type === 'SEMI_FINISHED' ? (
                                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] uppercase font-black tracking-wide border border-emerald-100">Bán thành phẩm</span>
                                                ) : (
                                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] uppercase font-black tracking-wide border border-gray-200">Thô</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`font-black text-lg ${item.status === 'OUT_OF_STOCK' ? 'text-red-600' : 'text-[#006a6a]'}`}>
                                                    {Number(item.stock_quantity).toLocaleString()}
                                                </span>
                                            </td>
                                            {/* CỘT MỨC TỐI THIỂU KÈM NÚT SỬA */}
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2 group">
                                                    <span className="font-medium text-gray-500">
                                                        {item.final_min_stock ? Number(item.final_min_stock).toLocaleString() : 0}
                                                    </span>
                                                    {/* KIỂM TRA QUYỀN: Chỉ Manager mới thấy nút này */}
                                                    {userRole === 'MANAGER' && (
                                                        <button 
                                                            onClick={() => {
                                                                setEditingItem(item);
                                                                setNewMinStock(item.final_min_stock || 0);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition"
                                                            title="Chỉ Quản lý được phép sửa"
                                                        >
                                                            <FaEdit size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {item.status === 'OUT_OF_STOCK' ? (
                                                    <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">Hết hàng!</span>
                                                ) : item.status === 'LOW_STOCK' ? (
                                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-300">Sắp hết</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Ổn định</span>
                                                )}
                                            </td>
                                            <td className="p-4"><span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium text-xs">{item.unit}</span></td>
                                            <td className="p-4 text-right text-gray-500">{new Date(item.last_updated).toLocaleString('vi-VN')}</td>
                                        </tr>
                                    ))}
                                    {inventory.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-400">Kho đang trống.</td></tr>}
                                </tbody>
                            </>
                        ) : (
                            <>
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                        <th className="p-4 font-bold">Mã Phiếu</th>
                                        <th className="p-4 font-bold">Loại Giao Dịch</th>
                                        <th className="p-4 font-bold">Nhân Viên</th>
                                        <th className="p-4 font-bold">Ghi chú</th>
                                        <th className="p-4 font-bold text-right">Tổng tiền</th>
                                        <th className="p-4 font-bold text-right">Thời gian</th>
                                        <th className="p-4 font-bold text-center">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-100">
                                    {filteredTransactions.map((trans, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                                            <td className="p-4 font-black text-gray-800">#{trans.id}</td>
                                            <td className="p-4">{formatType(trans.transaction_type)}</td>
                                            <td className="p-4 font-medium text-gray-600">{trans.user_email}</td>
                                            <td className="p-4 text-gray-500 max-w-[180px] truncate" title={trans.note}>{trans.note || '-'}</td>
                                            <td className="p-4 text-right font-bold text-[#006a6a]">
                                                {trans.total_amount > 0 ? Number(trans.total_amount).toLocaleString('vi-VN') + 'đ' : '-'}
                                            </td>
                                            <td className="p-4 text-right text-gray-500 whitespace-nowrap">{new Date(trans.created_at).toLocaleString('vi-VN')}</td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleViewDetails(trans)}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006a6a] border border-teal-200 bg-teal-50 hover:bg-[#006a6a] hover:text-white px-3 py-1.5 rounded-lg transition"
                                                    title="Xem chi tiết phiếu"
                                                >
                                                    <FaEye size={12} /> Xem
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <tr><td colSpan="7" className="p-8 text-center text-gray-400">Không có phiếu nào phù hợp.</td></tr>
                                    )}
                                </tbody>
                            </>
                        )}
                    </table>
                </div>
            </div>

            {/* =====================================================================
                MODAL XEM CHI TIẾT PHIẾU GIAO DỊCH
            ===================================================================== */}
            {viewingTransaction && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewingTransaction(null)}>
                    <div
                        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* HEADER */}
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white rounded-t-3xl flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-[#006a6a] flex items-center justify-center text-white">
                                        <FaFileInvoice size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-gray-800">Chi tiết Phiếu #{viewingTransaction.id}</h2>
                                        <p className="text-xs text-gray-500">{new Date(viewingTransaction.created_at).toLocaleString('vi-VN')}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formatType(viewingTransaction.transaction_type)}
                                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg font-medium text-xs">👤 {viewingTransaction.user_email}</span>
                                    {viewingTransaction.note && (
                                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium text-xs">📝 {viewingTransaction.note}</span>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setViewingTransaction(null)} className="text-gray-400 hover:text-red-500 p-2 bg-white rounded-full shadow-sm transition hover:bg-red-50">
                                <FaTimes size={18} />
                            </button>
                        </div>

                        {/* BODY: BẢNG NGUYÊN LIỆU */}
                        <div className="overflow-y-auto flex-1 p-6">
                            {isDetailLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-4">
                                    <div className="w-10 h-10 border-4 border-[#006a6a] border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-gray-500 font-medium">Đang tải chi tiết...</p>
                                </div>
                            ) : transactionDetails.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <FaLayerGroup size={40} className="mx-auto mb-3 opacity-30" />
                                    <p>Phiếu này không có chi tiết nguyên liệu.</p>
                                </div>
                            ) : (
                                <>
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                                <th className="p-3 text-left font-bold rounded-tl-xl">Nguyên liệu</th>
                                                <th className="p-3 text-right font-bold">ĐVT</th>
                                                <th className="p-3 text-right font-bold">Số lượng</th>
                                                {viewingTransaction.transaction_type === 'IMPORT' && (
                                                    <>
                                                        <th className="p-3 text-right font-bold">Đơn giá</th>
                                                        <th className="p-3 text-right font-bold rounded-tr-xl">Thành tiền</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {transactionDetails.map((d, i) => (
                                                <tr key={i} className="hover:bg-teal-50/30 transition">
                                                    <td className="p-3 font-bold text-gray-800">{d.ingredient_name}</td>
                                                    <td className="p-3 text-right">
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">{d.unit}</span>
                                                    </td>
                                                    <td className="p-3 text-right font-black text-[#006a6a] text-base">{Number(d.quantity).toLocaleString('vi-VN')}</td>
                                                    {viewingTransaction.transaction_type === 'IMPORT' && (
                                                        <>
                                                            <td className="p-3 text-right text-gray-600">
                                                                {d.unit_price > 0 ? Number(d.unit_price).toLocaleString('vi-VN') + 'đ' : '-'}
                                                            </td>
                                                            <td className="p-3 text-right font-bold text-amber-700">
                                                                {d.unit_price > 0 ? (Number(d.quantity) * Number(d.unit_price)).toLocaleString('vi-VN') + 'đ' : '-'}
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* TỔNG TIỀN (chỉ khi IMPORT) */}
                                    {viewingTransaction.transaction_type === 'IMPORT' && viewingTransaction.total_amount > 0 && (
                                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex justify-between items-center">
                                            <span className="font-bold text-amber-800 flex items-center gap-2">
                                                <MdInventory /> Tổng giá trị phiếu nhập:
                                            </span>
                                            <span className="text-2xl font-black text-amber-900">
                                                {Number(viewingTransaction.total_amount).toLocaleString('vi-VN')}đ
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-3xl">
                            <button
                                onClick={() => setViewingTransaction(null)}
                                className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CẬP NHẬT MIN STOCK (CHỈ MANAGER MỚI ĐƯỢC RENDER) */}
            {editingItem && userRole === 'MANAGER' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setEditingItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><FaTimes /></button>
                        <h3 className="font-bold text-lg text-gray-800 mb-1">Định mức cảnh báo</h3>
                        <p className="text-sm text-gray-500 mb-5">NL: <span className="font-bold text-[#006a6a]">{editingItem.name} ({editingItem.unit})</span></p>
                        
                        <form onSubmit={handleUpdateMinStock}>
                            <div className="mb-5">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tồn kho tối thiểu an toàn</label>
                                <input 
                                    type="number"
                                    step = "any" 
                                    min="0"
                                    value={newMinStock}
                                    onChange={(e) => setNewMinStock(e.target.value)}
                                    className="w-full p-3 border rounded-xl outline-none focus:border-[#006a6a] font-black text-gray-800 bg-gray-50 text-center text-lg"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2 text-center">Nếu tồn kho dưới mức này, hệ thống sẽ báo <b>(Sắp hết)</b></p>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setEditingItem(null)} className="flex-1 p-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Hủy</button>
                                <button type="submit" className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md">Lưu cập nhật</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL TẠO PHIẾU GIAO DỊCH */}
            {isTransactionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <button onClick={() => setIsTransactionModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-2 bg-white rounded-full shadow-sm z-10"><FaTimes size={20} /></button>
                        <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-3xl">
                            <h2 className="text-2xl font-black text-[#006a6a]">Tạo Phiếu Xuất / Nhập Kho</h2>
                        </div>
                        
                        <div className="overflow-y-auto p-6 flex-grow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Loại giao dịch <span className="text-red-500">*</span></label>
                                    <select 
                                        value={transactionForm.transaction_type}
                                        onChange={(e) => setTransactionForm({...transactionForm, transaction_type: e.target.value})}
                                        className="w-full p-3 border rounded-xl outline-none focus:border-[#006a6a] font-bold text-[#006a6a] bg-teal-50"
                                    >
                                        <option value="IMPORT">NHẬP KHO</option>
                                        <option value="EXPORT">XUẤT KHO</option>
                                        <option value="DAMAGE">HỎNG/HỦY</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Ghi chú phiếu</label>
                                    <input 
                                        type="text" 
                                        value={transactionForm.note}
                                        onChange={(e) => setTransactionForm({...transactionForm, note: e.target.value})}
                                        className="w-full p-3 border rounded-xl outline-none focus:border-[#006a6a]" 
                                        placeholder="VD: Nhập hàng sáng, ..." 
                                    />
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-2xl overflow-hidden">
                                <div className="bg-gray-100 p-3 flex justify-between items-center border-b border-gray-200">
                                    <h3 className="font-bold text-gray-700">Chi tiết nguyên liệu</h3>
                                    <div className="flex gap-2">
                                        <input 
                                            type="file" 
                                            accept=".xlsx, .xls, .csv" 
                                            ref={fileInputRef} 
                                            onChange={handleFileUpload} 
                                            className="hidden" 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current.click()} 
                                            className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-green-200 shadow-sm hover:bg-green-200 transition"
                                        >
                                            Nhập từ Excel
                                        </button>
                                        <button type="button" onClick={handleAddDetail} className="bg-white text-[#006a6a] px-3 py-1.5 rounded-lg text-sm font-bold border border-teal-100 shadow-sm hover:bg-teal-50 transition">
                                            + Thêm dòng
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2 space-y-2">
                                    {transactionForm.details.map((detail, index) => {
                                        // Tìm danh sách quy đổi tương ứng với nguyên liệu đang chọn
                                        const availableConversions = conversions.filter(c => c.ingredient_id === Number(detail.ingredient_id));
                                        // Tìm thông tin gốc của nguyên liệu để lấy Đơn vị tính (unit)
                                        const currentIng = ingredients.find(i => i.id === Number(detail.ingredient_id));

                                        return (
                                        <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl flex-wrap md:flex-nowrap">
                                            
                                            {/* Ô CHỌN NGUYÊN LIỆU (CÓ PHÂN LOẠI) */}
                                            <div className="flex-grow w-full md:w-auto">
                                                <select 
                                                    value={detail.ingredient_id}
                                                    onChange={(e) => handleDetailChange(index, 'ingredient_id', e.target.value)}
                                                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-[#006a6a] text-sm font-medium"
                                                >
                                                    <option value="">-- Chọn nguyên liệu --</option>
                                                    <optgroup label="Bán thành phẩm">
                                                        {ingredients.filter(i => i.type === 'SEMI_FINISHED').map(i => (
                                                            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label="Nguyên liệu thô">
                                                        {ingredients.filter(i => i.type !== 'SEMI_FINISHED').map(i => (
                                                            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                                        ))}
                                                    </optgroup>
                                                </select>
                                            </div>

                                            {/* Ô NHẬP SỐ LƯỢNG */}
                                            <div className="w-full md:w-28">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="any"
                                                    value={detail.quantity}
                                                    onChange={(e) => handleDetailChange(index, 'quantity', e.target.value)}
                                                    placeholder="Số lượng"
                                                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-[#006a6a] text-sm text-center font-bold"
                                                />
                                            </div>

                                            {/* Ô NHẬP ĐƠN GIÁ (chỉ hiện khi IMPORT) */}
                                            {transactionForm.transaction_type === 'IMPORT' && (
                                            <div className="w-full md:w-36">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="any"
                                                    value={detail.unit_price || ''}
                                                    onChange={(e) => handleDetailChange(index, 'unit_price', e.target.value)}
                                                    placeholder="Đơn giá"
                                                    className="w-full p-2 border border-amber-200 bg-amber-50 rounded-lg outline-none focus:border-amber-500 text-sm text-right font-bold text-amber-800"
                                                />
                                            </div>
                                            )}

                                            {/* Ô CHỌN QUY ĐỔI ĐƠN VỊ (TÍNH NĂNG MỚI) */}
                                            <div className="w-full md:w-48">
                                                <select 
                                                    value={detail.conversion_rate} 
                                                    onChange={(e) => handleDetailChange(index, 'conversion_rate', e.target.value)} 
                                                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-[#006a6a] text-sm text-blue-700 font-medium bg-blue-50"
                                                    disabled={!detail.ingredient_id}
                                                >
                                                    <option value="1">Đơn vị gốc ({currentIng?.unit || '...'})</option>
                                                    {availableConversions.map(c => (
                                                        <option key={c.id} value={c.conversion_rate}>{c.unit_name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button type="button" onClick={() => handleRemoveDetail(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition w-full md:w-auto flex justify-center"><FaTimes /></button>
                                        </div>
                                    )})}
                                    {transactionForm.details.length === 0 && (
                                        <div className="p-8 text-center text-gray-400 text-sm">Chưa có nguyên liệu nào. Hãy bấm "Thêm dòng".</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex flex-col gap-4 bg-white rounded-b-3xl">
                            {/* Hiển thị tổng tiền nhập */}
                            {transactionForm.transaction_type === 'IMPORT' && computedTotalAmount > 0 && (
                                <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <span className="font-bold text-amber-800">💰 Tổng tiền phiếu nhập:</span>
                                    <span className="text-xl font-black text-amber-900">{computedTotalAmount.toLocaleString('vi-VN')}đ</span>
                                </div>
                            )}
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsTransactionModalOpen(false)} className="flex-1 p-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Hủy bỏ</button>
                                <button disabled={isSubmittingTransaction} onClick={handleSubmitTransaction} type="button" className={`flex-1 p-3.5 font-bold rounded-xl transition text-white ${isSubmittingTransaction ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#006a6a] hover:bg-teal-700'}`}>
                                    {isSubmittingTransaction ? 'Đang xử lý...' : 'Xác nhận Lưu Phiếu'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockManagementPage;