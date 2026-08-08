import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import axiosClient from '../../utils/axiosClient';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSearch, FaCogs, FaBoxOpen, FaCalculator } from 'react-icons/fa';

const IngredientManagementPage = () => {
    const [ingredients, setIngredients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State dùng khi Sửa (Chỉ 1 món)
    const [formData, setFormData] = useState({ name: '', unit: '', description: '', type: 'RAW' });
    
    // TÍNH NĂNG MỚI: State dùng khi Thêm (Nhiều món cùng lúc dưới dạng mảng)
    const [addList, setAddList] = useState([{ name: '', unit: '', description: '', type: 'RAW' }]);

    // STATE BOM
    const [isBomModalOpen, setIsBomModalOpen] = useState(false);
    const [currentBomItem, setCurrentBomItem] = useState(null);
    const [bomDetails, setBomDetails] = useState([]);
    const [batchSize, setBatchSize] = useState(1); 

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
                const mappedIngredients = sheetData.map(row => ({
                    name: row['Tên nguyên liệu'],
                    unit: row['Đơn vị'] || row['Đơn vị tính'] || row['ĐVT'],
                    type: row['Loại'] === 'Bán thành phẩm' ? 'SEMI_FINISHED' : 'RAW',
                    description: row['Ghi chú'] || row['Mô tả'] || ''
                })).filter(i => i.name && i.unit);

                if (mappedIngredients.length === 0) {
                    alert("File không có dữ liệu hoặc sai định dạng cột!");
                    e.target.value = null;
                    return;
                }
                const response = await axiosClient.post('/ingredients/bulk', { ingredients: mappedIngredients });
                if (response.success) {
                    alert(`Import thành công! Đã thêm ${mappedIngredients.length} nguyên liệu.`);
                    fetchIngredients(); 
                }
            } catch (error) {
                console.error(error);
                alert("Có lỗi khi upload: " + (error.response?.data?.message || error.message));
            }
            e.target.value = null; 
        };
        reader.readAsBinaryString(file);
    };

    // STATE CONVERSIONS
    const [isConvModalOpen, setIsConvModalOpen] = useState(false);
    const [currentConvItem, setCurrentConvItem] = useState(null);
    const [convDetails, setConvDetails] = useState([]);

    const fetchIngredients = async (signal) => {
        try {
            const res = await axiosClient.get('/ingredients', { signal });
            setIngredients(res.data || []);
        } catch (error) { 
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi:", error); 
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchIngredients(controller.signal);
        return () => controller.abort();
    }, []);

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, unit: item.unit, description: item.description || '', type: item.type || 'RAW' });
        } else {
            setEditingItem(null);
            setAddList([{ name: '', unit: '', description: '', type: 'RAW' }]);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    // --- Các hàm xử lý cho danh sách Thêm Hàng Loạt ---
    const handleAddListRow = () => {
        setAddList([...addList, { name: '', unit: '', description: '', type: 'RAW' }]);
    };

    const handleAddListChange = (index, field, value) => {
        const newList = [...addList];
        newList[index][field] = value;
        setAddList(newList);
    };

    const handleRemoveListRow = (index) => {
        const newList = [...addList];
        newList.splice(index, 1);
        setAddList(newList);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        try {
            if (editingItem) {
                await axiosClient.put(`/ingredients/${editingItem.id}`, formData);
                alert("Cập nhật thông tin thành công!");
                handleCloseModal();
                fetchIngredients();
            } else {
                const isAnyEmpty = addList.some(item => !item.name.trim() || !item.unit.trim());
                if (isAnyEmpty) return alert("Vui lòng nhập đầy đủ Tên và Đơn vị tính (ĐVT) cho tất cả các dòng!");
                if (addList.length === 0) return alert("Vui lòng thêm ít nhất 1 nguyên liệu!");
                await axiosClient.post('/ingredients/bulk', { ingredients: addList });                
                alert(`Đã thêm thành công ${addList.length} nguyên liệu vào hệ thống!`);
                handleCloseModal();
                fetchIngredients();
            }
        } catch (error) { 
            alert(error.response?.data?.message || "Có lỗi xảy ra!"); 
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa nguyên liệu này?")) {
            try {
                await axiosClient.delete(`/ingredients/${id}`);
                alert("Xóa thành công!");
                fetchIngredients();
            } catch (error) { alert(error.response?.data?.message || "Lỗi xóa nguyên liệu"); }
        }
    };

    // ==========================================
    // XỬ LÝ BOM & CONVERSIONS (Giữ nguyên)
    // ==========================================
    const handleOpenBomModal = async (item) => {
        setCurrentBomItem(item);
        setBatchSize(1);
        try {
            const res = await axiosClient.get(`/ingredients/bom/${item.id}`);
            setBomDetails(res.data || []);
            setIsBomModalOpen(true);
        } catch (error) { alert("Không thể tải công thức định lượng!"); }
    };
    const handleCloseBomModal = () => { setIsBomModalOpen(false); setCurrentBomItem(null); setBomDetails([]); setBatchSize(1); };
    const handleAddBomRow = () => setBomDetails([...bomDetails, { ingredient_id: '', quantity_required: '' }]);
    const handleBomChange = (index, field, value) => {
        const newBom = [...bomDetails];
        if (field === 'quantity_required') newBom[index][field] = Number(value) / Number(batchSize || 1);
        else newBom[index][field] = value;
        setBomDetails(newBom);
    };
    const handleRemoveBomRow = (index) => { const newBom = [...bomDetails]; newBom.splice(index, 1); setBomDetails(newBom); };
    const handleSaveBom = async (e) => {
        e.preventDefault();
        try {
            const validBoms = bomDetails.filter(b => b.ingredient_id && Number(b.quantity_required) > 0);
            await axiosClient.put(`/ingredients/bom/${currentBomItem.id}`, { boms: validBoms });
            alert("Lưu công thức định lượng thành công!");
            handleCloseBomModal();
        } catch (error) { alert(error.response?.data?.message || "Có lỗi xảy ra khi lưu định lượng!"); }
    };

    const handleOpenConvModal = async (item) => {
        setCurrentConvItem(item);
        try {
            const res = await axiosClient.get(`/ingredients/conversions/${item.id}`);
            setConvDetails(res.data || []);
            setIsConvModalOpen(true);
        } catch (error) { alert("Không thể tải dữ liệu quy đổi!"); }
    };
    const handleCloseConvModal = () => { setIsConvModalOpen(false); setCurrentConvItem(null); setConvDetails([]); };
    const handleAddConvRow = () => setConvDetails([...convDetails, { unit_name: '', conversion_rate: '' }]);
    const handleConvChange = (index, field, value) => { const newConv = [...convDetails]; newConv[index][field] = value; setConvDetails(newConv); };
    const handleRemoveConvRow = (index) => { const newConv = [...convDetails]; newConv.splice(index, 1); setConvDetails(newConv); };
    const handleSaveConv = async (e) => {
        e.preventDefault();
        try {
            const validConvs = convDetails.filter(c => c.unit_name.trim() !== '' && Number(c.conversion_rate) > 0);
            await axiosClient.put(`/ingredients/conversions/${currentConvItem.id}`, { conversions: validConvs });
            alert("Lưu quy cách đóng gói thành công!");
            handleCloseConvModal();
        } catch (error) { alert(error.response?.data?.message || "Lỗi khi lưu quy đổi!"); }
    };

    const filteredList = ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Kho Nguyên Liệu Tổng</h1>
                    <p className="text-gray-500 text-sm mt-1">Quản lý danh mục nguyên liệu, định mức (BOM) và quy đổi bao bì</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-grow md:w-64">
                        <input type="text" placeholder="Tìm tên nguyên liệu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006a6a]/20 focus:border-[#006a6a] transition" />
                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                        />
                        <button 
                            onClick={() => fileInputRef.current.click()} 
                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap shadow-sm"
                        >
                            Nhập từ Excel
                        </button>
                        <button onClick={() => handleOpenModal()} className="bg-[#006a6a] hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap shadow-sm">
                            <FaPlus /> Thêm mới
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                <th className="p-4 font-bold">Mã</th>
                                <th className="p-4 font-bold">Tên nguyên liệu</th>
                                <th className="p-4 font-bold">Phân loại</th>
                                <th className="p-4 font-bold">Đơn vị gốc</th>
                                <th className="p-4 font-bold text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-100">
                            {filteredList.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition">
                                    <td className="p-4 font-semibold text-gray-500">#{item.id}</td>
                                    <td className="p-4 font-bold text-gray-800">{item.name}</td>
                                    <td className="p-4">
                                        {item.type === 'SEMI_FINISHED' ? (
                                            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[11px] font-bold uppercase tracking-wider border border-emerald-100">Bán thành phẩm</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[11px] font-bold uppercase tracking-wider border border-gray-200">Nguyên liệu thô</span>
                                        )}
                                    </td>
                                    <td className="p-4"><span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-medium">{item.unit}</span></td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleOpenConvModal(item)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition" title="Cấu hình bao bì (Can, Thùng, Két)"><FaBoxOpen size={16} /></button>
                                            {item.type === 'SEMI_FINISHED' && (
                                                <button onClick={() => handleOpenBomModal(item)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition" title="Cấu hình định mức nấu mẻ (BOM)"><FaCogs size={16} /></button>
                                            )}
                                            <button onClick={() => handleOpenModal(item)} className="p-2 bg-teal-50 text-[#006a6a] rounded-lg hover:bg-teal-100 transition" title="Sửa thông tin cơ bản"><FaEdit size={16} /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition" title="Xóa nguyên liệu"><FaTrash size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredList.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">Không tìm thấy nguyên liệu nào.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ============================================================== */}
            {/* MODAL THÊM HÀNG LOẠT VÀ SỬA (CẬP NHẬT GIAO DIỆN MỚI) */}
            {/* ============================================================== */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className={`bg-white rounded-3xl w-full ${editingItem ? 'max-w-md' : 'max-w-5xl'} shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200`}>
                        <button onClick={handleCloseModal} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-2 z-10"><FaTimes size={20} /></button>
                        <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-3xl">
                            <h2 className="text-xl font-bold">{editingItem ? 'Sửa thông tin nguyên liệu' : 'Thêm danh sách nguyên liệu kho (Thêm hàng loạt)'}</h2>
                        </div>
                        
                        {editingItem ? (
                            /* GIAO DIỆN SỬA 1 MÓN */
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Tên nguyên liệu <span className="text-red-500">*</span></label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-[#006a6a]" placeholder="VD: Sữa tươi, Xương bò..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Phân loại <span className="text-red-500">*</span></label>
                                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-[#006a6a] bg-gray-50 font-medium">
                                            <option value="RAW">Nguyên liệu thô</option>
                                            <option value="SEMI_FINISHED">Bán thành phẩm</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Đơn vị Gốc <span className="text-red-500">*</span></label>
                                        <input type="text" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-[#006a6a]" placeholder="VD: ml, gram..." />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả thêm</label>
                                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-[#006a6a] h-20 resize-none" placeholder="Ghi chú về bảo quản..."></textarea>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={handleCloseModal} className="flex-1 p-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Hủy</button>
                                    <button type="submit" className="flex-1 p-3 bg-[#006a6a] text-white font-bold rounded-xl hover:bg-teal-700 transition shadow-md">Lưu cập nhật</button>
                                </div>
                            </form>
                        ) : (
                            /* GIAO DIỆN THÊM NHIỀU MÓN CÙNG LÚC */
                            <div className="flex flex-col flex-grow overflow-hidden">
                                <div className="overflow-y-auto p-6 flex-grow">
                                    <div className="border border-gray-200 rounded-2xl overflow-hidden">
                                        <div className="bg-gray-100 p-3 flex justify-between items-center border-b border-gray-200">
                                            <h3 className="font-bold text-gray-700 text-sm">Danh sách nguyên liệu cần thêm</h3>
                                            <button type="button" onClick={handleAddListRow} className="bg-white text-[#006a6a] px-3 py-1.5 rounded-lg text-sm font-bold border border-teal-100 shadow-sm hover:bg-teal-50 transition">+ Thêm dòng</button>
                                        </div>
                                        <div className="p-3 space-y-3">
                                            {addList.map((item, index) => (
                                                <div key={index} className="flex gap-2 items-start bg-white border border-gray-100 p-2 rounded-xl shadow-sm flex-wrap md:flex-nowrap">
                                                    <div className="flex-grow w-full md:w-auto">
                                                        <input 
                                                            type="text" placeholder="Tên nguyên liệu *" 
                                                            value={item.name} onChange={e => handleAddListChange(index, 'name', e.target.value)} 
                                                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#006a6a] text-sm font-bold" 
                                                        />
                                                    </div>
                                                    <div className="w-full md:w-40">
                                                        <select 
                                                            value={item.type} onChange={e => handleAddListChange(index, 'type', e.target.value)} 
                                                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#006a6a] bg-gray-50 font-medium text-sm"
                                                        >
                                                            <option value="RAW">Nguyên liệu thô</option>
                                                            <option value="SEMI_FINISHED">Bán Thành Phẩm</option>
                                                        </select>
                                                    </div>
                                                    <div className="w-full md:w-28">
                                                        <input 
                                                            type="text" placeholder="ĐVT *" 
                                                            value={item.unit} onChange={e => handleAddListChange(index, 'unit', e.target.value)} 
                                                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#006a6a] text-sm text-center font-bold" 
                                                        />
                                                    </div>
                                                    <div className="w-full md:w-48">
                                                        <input 
                                                            type="text" placeholder="Ghi chú thêm..." 
                                                            value={item.description} onChange={e => handleAddListChange(index, 'description', e.target.value)} 
                                                            className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#006a6a] text-sm" 
                                                        />
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveListRow(index)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><FaTimes /></button>
                                                </div>
                                            ))}
                                            {addList.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Chưa có nguyên liệu nào. Hãy bấm "Thêm dòng".</div>}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-gray-100 flex gap-4 bg-white rounded-b-3xl">
                                    <button type="button" onClick={handleCloseModal} className="flex-1 p-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Hủy bỏ</button>
                                    <button onClick={handleSubmit} type="button" className="flex-1 p-3.5 bg-[#006a6a] text-white font-bold rounded-xl hover:bg-teal-700 transition">
                                        Xác nhận thêm {addList.length} nguyên liệu
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL CẤU HÌNH QUY ĐỔI ĐƠN VỊ (UNIT CONVERSION) */}
            {isConvModalOpen && currentConvItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <button onClick={handleCloseConvModal} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-2"><FaTimes size={20} /></button>
                        <div className="p-6 border-b border-amber-100 bg-amber-50 rounded-t-3xl">
                            <h2 className="text-xl font-black text-amber-800">Quy cách Đóng gói (Bao bì)</h2>
                            <p className="text-sm text-amber-700 mt-1">Cấu hình các loại bao bì (Can, Thùng, Bao) để NV dễ dàng nhập kho.</p>
                        </div>
                        
                        <div className="overflow-y-auto p-6 flex-grow">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{currentConvItem.name}</h3>
                                    <p className="text-sm text-gray-500">Đơn vị quản lý gốc (Nhỏ nhất): <span className="font-bold text-blue-600">{currentConvItem.unit}</span></p>
                                </div>
                                <FaBoxOpen className="text-blue-500 text-3xl opacity-50" />
                            </div>

                            <div className="border border-gray-200 rounded-2xl overflow-hidden">
                                <div className="bg-gray-100 p-3 flex justify-between items-center border-b border-gray-200">
                                    <h3 className="font-bold text-gray-700 text-sm">Danh sách Quy đổi (Hệ số nhân)</h3>
                                    <button type="button" onClick={handleAddConvRow} className="bg-white text-amber-600 px-3 py-1.5 rounded-lg text-sm font-bold border border-amber-200 shadow-sm hover:bg-amber-50 transition">+ Thêm quy đổi</button>
                                </div>
                                <div className="p-3 space-y-3">
                                    {convDetails.map((detail, index) => (
                                        <div key={index} className="flex gap-3 items-center bg-white border border-gray-100 p-2 rounded-xl shadow-sm">
                                            <div className="flex-grow">
                                                <input type="text" value={detail.unit_name} onChange={(e) => handleConvChange(index, 'unit_name', e.target.value)} placeholder="Tên bao bì (VD: Can 15 Lít)" className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-amber-500 text-sm font-medium" />
                                            </div>
                                            <div className="text-gray-400 font-bold">=</div>
                                            <div className="w-40 relative">
                                                <input type="number" min="0" step ="any" value={detail.conversion_rate} onChange={(e) => handleConvChange(index, 'conversion_rate', e.target.value)} placeholder="Hệ số" className="w-full p-2.5 pr-12 border border-gray-200 rounded-lg outline-none focus:border-amber-500 text-sm text-right font-bold text-blue-600 bg-blue-50/50" />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{currentConvItem.unit}</span>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveConvRow(index)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><FaTimes /></button>
                                        </div>
                                    ))}
                                    {convDetails.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Chưa có bao bì nào được cấu hình.</div>}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex gap-4 bg-white rounded-b-3xl">
                            <button type="button" onClick={handleCloseConvModal} className="flex-1 p-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Hủy bỏ</button>
                            <button onClick={handleSaveConv} type="button" className="flex-1 p-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition">Lưu cấu hình Bao bì</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CẤU HÌNH BOM */}
            {isBomModalOpen && currentBomItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <button onClick={handleCloseBomModal} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-2"><FaTimes size={20} /></button>
                        <div className="p-6 border-b border-gray-100 bg-purple-50 rounded-t-3xl">
                            <h2 className="text-xl font-black text-purple-800">Định mức cấu thành (BOM)</h2>
                            <p className="text-sm text-purple-600 mt-1">Nhập Quy mô mẻ nấu ở bên dưới, hệ thống sẽ tự động quy ra công thức gốc.</p>
                        </div>
                        
                        <div className="overflow-y-auto p-6 flex-grow">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-lg shadow-sm"><FaCogs className="text-blue-500 text-2xl" /></div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{currentBomItem.name}</h3>
                                        <p className="text-sm text-gray-500">Thành phẩm thu được (Đơn vị: <span className="font-bold text-blue-600">{currentBomItem.unit}</span>)</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200 w-full md:w-auto">
                                    <label className="text-sm font-bold text-gray-700 whitespace-nowrap pl-2 flex items-center gap-2">
                                        <FaCalculator className="text-gray-400"/> Quy mô mẻ chuẩn:
                                    </label>
                                    <div className="relative">
                                        <input type="number" min="1" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} className="w-32 p-2 pr-10 border border-gray-200 rounded-md outline-none focus:border-purple-500 text-right font-black text-purple-700 bg-purple-50/50" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{currentBomItem.unit}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-2xl overflow-hidden">
                                <div className="bg-gray-100 p-3 flex justify-between items-center border-b border-gray-200">
                                    <h3 className="font-bold text-gray-700 text-sm">Cần dùng bao nhiêu Nguyên liệu thô cho Mẻ nấu này?</h3>
                                    <button type="button" onClick={handleAddBomRow} className="bg-white text-purple-600 px-3 py-1.5 rounded-lg text-sm font-bold border border-purple-100 shadow-sm hover:bg-purple-50 transition">+ Thêm nguyên liệu</button>
                                </div>
                                <div className="p-3 space-y-3">
                                    {bomDetails.map((detail, index) => {
                                        const displayValue = (Number(detail.quantity_required) * Number(batchSize || 1)).toString();
                                        const rawUnit = ingredients.find(i => i.id === Number(detail.ingredient_id))?.unit || '...';
                                        return (
                                        <div key={index} className="flex gap-3 items-center bg-white border border-gray-100 p-2 rounded-xl shadow-sm">
                                            <div className="flex-grow">
                                                <select value={detail.ingredient_id} onChange={(e) => handleBomChange(index, 'ingredient_id', e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-purple-500 text-sm font-medium">
                                                    <option value="">-- Chọn Nguyên liệu thô --</option>
                                                    {ingredients.filter(i => i.type === 'RAW').map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                                </select>
                                            </div>
                                            <div className="w-40 relative">
                                                <input type="number" step="any" min="0"  value={displayValue} onChange={(e) => handleBomChange(index, 'quantity_required', e.target.value)} placeholder="Số lượng" className="w-full p-2.5 pr-12 border border-gray-200 rounded-lg outline-none focus:border-purple-500 text-right font-bold" />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{rawUnit}</span>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveBomRow(index)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><FaTimes /></button>
                                        </div>
                                    )})}
                                    {bomDetails.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">Chưa có thành phần nào. Hãy bấm "Thêm nguyên liệu" để cấu hình.</div>}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex gap-4 bg-white rounded-b-3xl">
                            <button type="button" onClick={handleCloseBomModal} className="flex-1 p-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Hủy bỏ</button>
                            <button onClick={handleSaveBom} type="button" className="flex-1 p-3.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition">Xác nhận Lưu Công Thức</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IngredientManagementPage;