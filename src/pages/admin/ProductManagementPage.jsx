import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import { uploadImageToServer } from '../../utils/uploadHelper';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaArrowRight, FaArrowLeft, FaCheck, FaImage, FaBoxes } from 'react-icons/fa';

const ProductManagementPage = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [globalToppings, setGlobalToppings] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState(1);    
    const initialForm = {
        id: null, Name: '', Description: '', Price: '', Category_id: '', Image_url: '', is_active: 1, is_combo: false,
        base_recipe: [], sizes: [], topping_ids: [], combo_groups: [], previewImage: null, imageFile: null, cooking_time: 10,
        min_toppings: 0, max_toppings: 10
    };
    const [formData, setFormData] = useState(initialForm);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async (signal) => {
        try {
            const [prodRes, catRes, ingRes, topRes] = await Promise.all([
                axiosClient.get('/products?admin=true', { signal }), 
                axiosClient.get('/categories', { signal }),
                axiosClient.get('/ingredients', { signal }), 
                axiosClient.get('/toppings', { signal }).catch(() => ({ data: [] }))
            ]);
            setProducts(prodRes.data || prodRes);
            setCategories(catRes.data || catRes);
            setIngredients((ingRes.data || ingRes).filter(i => i.type === 'RAW' || i.type === 'SEMI_FINISHED'));
            setGlobalToppings(topRes.data || topRes || []);
        } catch (error) { 
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi tải dữ liệu sản phẩm:", error); 
        }
    };

    useEffect(() => { 
        const controller = new AbortController();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData(controller.signal);
        return () => controller.abort();
    }, []);

    const handleOpenModal = async (product = null) => {
        if (product) {
            try {
                const res = await axiosClient.get(`/products/${product.id}/details`);
                if (res.success && res.data) {
                    setFormData({
                        id: res.data.id, Name: res.data.name, Description: res.data.description, Price: res.data.base_price,
                        Category_id: res.data.category_id, Image_url: res.data.image_url, is_active: res.data.is_active_global,
                        is_combo: res.data.is_combo === 1, cooking_time: res.data.cooking_time || 10,
                        base_recipe: res.data.base_recipe || [], sizes: res.data.sizes || [], topping_ids: res.data.topping_ids || [],
                        combo_groups: res.data.combo_groups || [], previewImage: res.data.image_url,
                        min_toppings: res.data.min_toppings || 0, max_toppings: res.data.max_toppings || 10
                    });
                }
            } catch (error) { alert("Lỗi tải chi tiết món ăn"); return; }
        } else { setFormData(initialForm); }
        setStep(1); setIsModalOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let finalImageUrl = formData.Image_url;
            if (formData.imageFile) {
                finalImageUrl = await uploadImageToServer(formData.imageFile, 'products');
            }
            const payload = { ...formData, Image_url: finalImageUrl, is_combo: formData.is_combo ? 1 : 0 };
            delete payload.imageFile;
            delete payload.previewImage;

            if (formData.id) {
                await axiosClient.put(`/products/${formData.id}`, payload);
                alert('Cập nhật món ăn/combo thành công!');
            } else {
                await axiosClient.post('/products', payload);
                alert('Tạo món ăn/combo mới thành công!');
            }
            setIsModalOpen(false); fetchData();
        } catch (error) { alert('Có lỗi xảy ra khi lưu dữ liệu!'); } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc muốn xóa món này?")) {
            try { await axiosClient.delete(`/products/${id}`); alert("Xóa thành công!"); fetchData(); } catch (error) { alert("Lỗi khi xóa!"); }
        }
    };

    // --- API GỌI NHANH BẬT/TẮT TRẠNG THÁI ---
    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await axiosClient.put(`/products/toggle-status/${id}`, { is_active: !currentStatus });
            fetchData(); // Load lại bảng ngay lập tức
        } catch (error) {
            alert("Lỗi khi cập nhật trạng thái!");
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, previewImage: previewUrl, imageFile: file }));
        }
    };

    const addBaseRecipe = () => setFormData(prev => ({ ...prev, base_recipe: [...prev.base_recipe, { ingredient_id: '', quantity_required: '' }] }));
    const removeBaseRecipe = (index) => setFormData(prev => ({ ...prev, base_recipe: prev.base_recipe.filter((_, i) => i !== index) }));
    const updateBaseRecipe = (index, field, value) => { const newRecipe = [...formData.base_recipe]; newRecipe[index][field] = value; setFormData({ ...formData, base_recipe: newRecipe }); };
    const addSize = () => setFormData(prev => ({ ...prev, sizes: [...prev.sizes, { name: '', price_add: 0, ingredients: [] }] }));
    const removeSize = (index) => setFormData(prev => ({ ...prev, sizes: prev.sizes.filter((_, i) => i !== index) }));
    const updateSize = (index, field, value) => { const newSizes = [...formData.sizes]; newSizes[index][field] = value; setFormData({ ...formData, sizes: newSizes }); };
    const addSizeIngredient = (sizeIndex) => { const newSizes = [...formData.sizes]; newSizes[sizeIndex].ingredients.push({ ingredient_id: '', quantity_add: '' }); setFormData({ ...formData, sizes: newSizes }); };
    const removeSizeIngredient = (sizeIndex, ingIndex) => { const newSizes = [...formData.sizes]; newSizes[sizeIndex].ingredients = newSizes[sizeIndex].ingredients.filter((_, i) => i !== ingIndex); setFormData({ ...formData, sizes: newSizes }); };
    const updateSizeIngredient = (sizeIndex, ingIndex, field, value) => { const newSizes = [...formData.sizes]; newSizes[sizeIndex].ingredients[ingIndex][field] = value; setFormData({ ...formData, sizes: newSizes }); };

    const addComboGroup = () => setFormData(prev => ({ ...prev, combo_groups: [...prev.combo_groups, { name: '', quantity_required: 1, items: [] }] }));
    const removeComboGroup = (gIdx) => setFormData(prev => ({ ...prev, combo_groups: prev.combo_groups.filter((_, i) => i !== gIdx) }));
    const updateComboGroup = (gIdx, field, value) => { const newGroups = [...formData.combo_groups]; newGroups[gIdx][field] = value; setFormData({ ...formData, combo_groups: newGroups }); };
    const addComboItem = (gIdx) => { const newGroups = [...formData.combo_groups]; newGroups[gIdx].items.push({ food_id: '', default_selected: 0, extra_price: 0 }); setFormData({ ...formData, combo_groups: newGroups }); };
    const removeComboItem = (gIdx, iIdx) => { const newGroups = [...formData.combo_groups]; newGroups[gIdx].items = newGroups[gIdx].items.filter((_, i) => i !== iIdx); setFormData({ ...formData, combo_groups: newGroups }); };
    const updateComboItem = (gIdx, iIdx, field, value) => { const newGroups = [...formData.combo_groups]; newGroups[gIdx].items[iIdx][field] = value; setFormData({ ...formData, combo_groups: newGroups }); };

    const toggleTopping = (toppingId) => { setFormData(prev => { const isSelected = prev.topping_ids.includes(toppingId); return { ...prev, topping_ids: isSelected ? prev.topping_ids.filter(id => id !== toppingId) : [...prev.topping_ids, toppingId] }; }); };

    const singleFoods = products.filter(p => p.is_combo !== 1 && p.id !== formData.id);

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black text-gray-800">Quản lý Thực Đơn</h1>
                <button onClick={() => handleOpenModal()} className="bg-[#006a6a] text-white px-5 py-2.5 rounded-[1rem] font-bold flex items-center gap-2 hover:bg-teal-700 transition shadow-lg">
                    <FaPlus /> Thêm Món / Combo
                </button>
            </div>

            <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 font-bold text-gray-600">ID</th>
                            <th className="p-4 font-bold text-gray-600">Hình ảnh</th>
                            <th className="p-4 font-bold text-gray-600">Tên món</th>
                            <th className="p-4 font-bold text-gray-600">Loại hình</th>
                            <th className="p-4 font-bold text-gray-600">Giá cố định</th>
                            <th className="p-4 font-bold text-gray-600">Đang Bán</th>
                            <th className="p-4 font-bold text-gray-600 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id} className={`border-b border-gray-50 transition ${p.is_active_global === 1 ? 'hover:bg-gray-50' : 'bg-gray-100/50 opacity-70'}`}>
                                <td className="p-4 font-medium text-gray-800">#{p.id}</td>
                                <td className="p-4"><img src={p.image_url || p.Image_url} alt="img" className={`w-14 h-14 rounded-2xl object-cover border shadow-sm ${p.is_active_global === 0 && 'grayscale'}`} /></td>
                                <td className="p-4 font-bold text-[#006a6a] text-lg">{p.name || p.Name}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-md text-xs font-bold ${p.is_combo === 1 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {p.is_combo === 1 ? '🎁 COMBO SET' : '🍔 MÓN ĐƠN'}
                                    </span>
                                </td>
                                <td className="p-4 font-semibold text-gray-700">{Number(p.base_price || p.price || 0).toLocaleString()}đ</td>
                                
                                {/* NÚT GẠT CẬP NHẬT TRẠNG THÁI TRỰC TIẾP */}
                                <td className="p-4">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={p.is_active_global === 1} onChange={() => handleToggleStatus(p.id, p.is_active_global)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006a6a]"></div>
                                    </label>
                                </td>

                                <td className="p-4 flex justify-end gap-3">
                                    <button onClick={() => handleOpenModal(p)} className="p-2.5 bg-blue-50 text-blue-600 rounded-[0.8rem] hover:bg-blue-100 transition"><FaEdit size={16}/></button>
                                    <button onClick={() => handleDelete(p.id)} className="p-2.5 bg-red-50 text-red-600 rounded-[0.8rem] hover:bg-red-100 transition"><FaTrash size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL WIZARD ĐÃ MỞ KHÓA CHO PHÉP NHẢY BƯỚC TỰ DO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
                        
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                            <h2 className="text-2xl font-black text-gray-800">{formData.id ? 'Cập Nhật Thực Đơn' : 'Tạo Mới Thực Đơn'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500 rounded-full transition"><FaTimes size={20}/></button>
                        </div>
                        
                        {/* THANH TAB NAVIGATION ĐÃ SỬA THÀNH NÚT BẤM */}
                        <div className="flex bg-gray-50 border-b border-gray-100 shrink-0">
                            {[1, 2, 3].map(s => (
                                <button 
                                    key={s} 
                                    type="button"
                                    onClick={() => setStep(s)} 
                                    className={`flex-1 text-center py-4 font-bold text-sm border-b-2 transition-all cursor-pointer hover:bg-gray-100 ${step === s ? 'border-[#006a6a] text-[#006a6a] bg-teal-50/50' : 'border-transparent text-gray-400'}`}
                                >
                                    BƯỚC {s}: {s === 1 ? 'THÔNG TIN CHUNG' : s === 2 ? (formData.is_combo ? 'CẤU HÌNH NHÓM COMBO' : 'CÔNG THỨC NGUYÊN LIỆU') : 'TÙY CHỌN & TOPPING'}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30 custom-scrollbar">
                            {/* BƯỚC 1: THÔNG TIN CHUNG */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in">
                                    <div className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="font-bold text-gray-800 flex items-center gap-2"><FaBoxes className="text-[#006a6a]"/> Loại hình sản phẩm</h4>                                            
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={formData.is_combo} onChange={e => setFormData({...formData, is_combo: e.target.checked})} className="sr-only peer" />
                                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                            <span className="ml-3 text-sm font-black text-gray-700">{formData.is_combo ? '🎁 ĐANG CHỌN: COMBO' : '🍔 ĐANG CHỌN: MÓN ĐƠN'}</span>
                                        </label>
                                    </div>

                                    <div className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
                                        <label className="block text-sm font-bold text-gray-700 mb-3">Hình ảnh đại diện</label>
                                        <div className="flex items-center gap-5">
                                            <div className="w-24 h-24 rounded-[1.2rem] border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                                                {formData.previewImage ? <img src={formData.previewImage} alt="preview" className="w-full h-full object-cover" /> : <FaImage className="text-gray-300 text-3xl" />}
                                            </div>
                                            <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-[#006a6a] hover:file:bg-teal-100 transition cursor-pointer" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Tên món ăn / Combo</label>
                                            <input type="text" className="w-full p-3.5 bg-white border border-gray-200 rounded-[1rem] outline-none focus:border-[#006a6a] focus:ring-1" value={formData.Name} onChange={e => setFormData({...formData, Name: e.target.value})} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Danh mục hiển thị</label>
                                            <select className="w-full p-3.5 bg-white border border-gray-200 rounded-[1rem] outline-none focus:border-[#006a6a] focus:ring-1" value={formData.Category_id} onChange={e => setFormData({...formData, Category_id: e.target.value})}>
                                                <option value="">Chọn danh mục</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name || c.Name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-bold text-gray-700 mb-1">{formData.is_combo ? 'Giá Combo' : 'Giá cơ bản'}</label>
                                            <input type="number" className="w-full p-3.5 bg-white border border-gray-200 rounded-[1rem] outline-none focus:border-[#006a6a] focus:ring-1 text-[#006a6a] font-bold" value={formData.Price} onChange={e => setFormData({...formData, Price: e.target.value})} />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-sm font-bold text-gray-700 mb-1">T.Gian Nấu (Phút)</label>
                                            <input type="number" className="w-full p-3.5 bg-white border border-gray-200 rounded-[1rem] outline-none focus:border-[#006a6a] focus:ring-1 font-bold text-orange-600" value={formData.cooking_time} onChange={e => setFormData({...formData, cooking_time: parseInt(e.target.value) || 0})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả chi tiết</label>
                                        <textarea className="w-full p-3.5 bg-white border border-gray-200 rounded-[1.2rem] outline-none focus:border-[#006a6a] focus:ring-1" rows="3" value={formData.Description} onChange={e => setFormData({...formData, Description: e.target.value})}></textarea>
                                    </div>
                                </div>
                            )}

                            {/* BƯỚC 2: PHÂN LUỒNG MÓN ĐƠN VS COMBO */}
                            {step === 2 && (
                                !formData.is_combo ? (
                                    <div className="animate-in fade-in space-y-4">
                                        <div className="flex justify-between items-center">
                                            <p className="text-gray-600 text-sm font-medium">Định lượng nguyên liệu kho tiêu hao cho 1 phần ăn.</p>
                                            <button onClick={addBaseRecipe} className="text-[#006a6a] text-sm font-bold bg-teal-50 px-4 py-2 rounded-[0.8rem] hover:bg-teal-100 transition">+ Thêm nguyên liệu</button>
                                        </div>
                                        {formData.base_recipe.map((item, idx) => (
                                            <div key={idx} className="flex gap-3 items-center bg-white p-2.5 rounded-[1rem] border border-gray-200 shadow-sm">
                                                <select className="flex-1 p-2 bg-transparent outline-none font-medium text-gray-700" value={item.ingredient_id} onChange={e => updateBaseRecipe(idx, 'ingredient_id', e.target.value)}>
                                                    <option value="">-- Chọn nguyên liệu từ kho --</option>
                                                    {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                                                </select>
                                                <input type="number" placeholder="Số lượng" className="w-28 p-2 text-center border rounded-lg font-bold text-[#006a6a]" value={item.quantity_required} onChange={e => updateBaseRecipe(idx, 'quantity_required', e.target.value)} />
                                                <button onClick={() => removeBaseRecipe(idx)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg"><FaTrash/></button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in space-y-6">
                                        <div className="flex justify-between items-center">
                                            <p className="text-gray-600 text-sm font-medium">Thiết lập các nhóm tùy chọn cho Set Combo.</p>
                                            <button onClick={addComboGroup} className="text-purple-600 text-sm font-bold bg-purple-50 px-4 py-2 rounded-[0.8rem] hover:bg-purple-100 transition">+ Thêm Nhóm Món mới</button>
                                        </div>
                                        
                                        {formData.combo_groups.map((group, gIdx) => (
                                            <div key={gIdx} className="bg-white border-2 border-purple-100 p-5 rounded-[1.5rem] shadow-sm relative space-y-4">
                                                <button onClick={() => removeComboGroup(gIdx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 bg-gray-50 p-2 rounded-full"><FaTimes size={14}/></button>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-10">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tên nhóm món</label>
                                                        <input type="text" placeholder="VD: Chọn 1 món ăn kèm" className="w-full p-2.5 border rounded-xl font-bold text-gray-800" value={group.name} onChange={e => updateComboGroup(gIdx, 'name', e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Số lượng bắt buộc chọn</label>
                                                        <input type="number" min="1" className="w-full p-2.5 border rounded-xl font-bold text-purple-700" value={group.quantity_required} onChange={e => updateComboGroup(gIdx, 'quantity_required', parseInt(e.target.value))} />
                                                    </div>
                                                </div>

                                                <div className="bg-purple-50/30 p-4 rounded-[1.2rem] border border-dashed border-purple-200">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-xs font-black text-purple-800 uppercase tracking-wide">Danh sách món lẻ nằm trong nhóm này</span>
                                                        <button type="button" onClick={() => addComboItem(gIdx)} className="text-xs font-bold text-white bg-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-700">+ Cho món vào nhóm</button>
                                                    </div>

                                                    {group.items.map((item, iIdx) => (
                                                        <div key={iIdx} className="flex flex-col sm:flex-row gap-3 mb-3 bg-white p-3 rounded-xl border border-gray-100 items-center">
                                                            <select className="flex-1 p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 font-medium" value={item.food_id} onChange={e => updateComboItem(gIdx, iIdx, 'food_id', e.target.value)}>
                                                                <option value="">-- Chọn món con --</option>
                                                                {singleFoods.map(sf => <option key={sf.id} value={sf.id}>{sf.name} ({Number(sf.base_price).toLocaleString()}đ)</option>)}
                                                            </select>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-gray-400 whitespace-nowrap">Phụ thu (nếu có):</span>
                                                                <input type="number" placeholder="0" className="w-24 p-2 border border-gray-200 rounded-lg text-center font-bold text-orange-500 text-sm" value={item.extra_price} onChange={e => updateComboItem(gIdx, iIdx, 'extra_price', parseFloat(e.target.value))} />
                                                            </div>
                                                            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                                                                <input type="checkbox" checked={item.default_selected === 1} onChange={e => updateComboItem(gIdx, iIdx, 'default_selected', e.target.checked ? 1 : 0)} className="w-4 h-4 accent-purple-600 rounded" />
                                                                Chọn sẵn
                                                            </label>
                                                            <button type="button" onClick={() => removeComboItem(gIdx, iIdx)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg"><FaTimes/></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {formData.combo_groups.length === 0 && <p className="text-center text-gray-400 py-10 border-2 border-dashed border-gray-200 rounded-[1.5rem] bg-white">Chưa tạo nhóm cấu trúc món nào cho Combo này</p>}
                                    </div>
                                )
                            )}

                            {/* BƯỚC 3: KÍCH CỠ & TOPPING CHUNG */}
                            {step === 3 && (
                                <div className="animate-in fade-in space-y-6">
                                    {!formData.is_combo ? (
                                        <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm">
                                            <div className="flex justify-between items-center mb-5">
                                                <h3 className="font-black text-gray-800 text-lg">Cấu hình kích cỡ </h3>
                                                <button onClick={addSize} className="text-blue-600 text-sm font-bold bg-blue-50 px-4 py-2 rounded-[0.8rem] hover:bg-blue-100 transition">+ Thêm Size</button>
                                            </div>
                                            {formData.sizes.map((size, sIdx) => (
                                                <div key={sIdx} className="bg-gray-50 border border-gray-200 p-5 rounded-[1.2rem] relative mb-4">
                                                    <button onClick={() => removeSize(sIdx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 bg-white p-2 rounded-full shadow-sm"><FaTrash size={12}/></button>
                                                    <div className="grid grid-cols-2 gap-4 mb-3 pr-10">
                                                        <input type="text" placeholder="Tên Size (VD: Size L)" className="p-2.5 border rounded-lg font-bold" value={size.name} onChange={e => updateSize(sIdx, 'name', e.target.value)} />
                                                        <input type="number" placeholder="Giá cộng thêm" className="p-2.5 border rounded-lg font-bold text-blue-600" value={size.price_add} onChange={e => updateSize(sIdx, 'price_add', e.target.value)} />
                                                    </div>
                                                    <div className="bg-white p-3 rounded-lg border">
                                                        <button onClick={() => addSizeIngredient(sIdx)} className="text-xs font-bold text-[#006a6a] mb-2 block">+ Thêm Nguyên Liệu Cho Size này</button>
                                                        {size.ingredients.map((ing, iIdx) => (
                                                            <div key={iIdx} className="flex gap-2 mb-1">
                                                                <select className="flex-1 p-1 text-sm border rounded" value={ing.ingredient_id} onChange={e => updateSizeIngredient(sIdx, iIdx, 'ingredient_id', e.target.value)}>
                                                                    <option value="">Chọn NL</option>
                                                                    {ingredients.map(ig => <option key={ig.id} value={ig.id}>{ig.name}</option>)}
                                                                </select>
                                                                <input type="number" className="w-20 p-1 text-sm border rounded text-center" value={ing.quantity_add} onChange={e => updateSizeIngredient(sIdx, iIdx, 'quantity_add', e.target.value)} />
                                                                <button onClick={() => removeSizeIngredient(sIdx, iIdx)} className="text-red-400"><FaTimes/></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-purple-50 text-purple-800 p-5 rounded-[1.5rem] border border-purple-100 font-medium text-sm">
                                            💡 Đối với hình thức Combo trọn gói, hệ thống sẽ tự động bỏ qua cấu hình kích cỡ (Upsize) để giữ nguyên giá cố định của toàn set ăn.
                                        </div>
                                    )}

                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-5">
                                            <h3 className="font-black text-gray-800 text-lg">Cho phép bán kèm các Topping sau</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-5 mb-5 p-4 bg-gray-50 rounded-[1rem] border border-gray-100">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Tổng SL Topping Tối thiểu</label>
                                                <input type="number" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#006a6a]" value={formData.min_toppings} onChange={e => setFormData({...formData, min_toppings: parseInt(e.target.value) || 0})} min="0" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Tổng SL Topping Tối đa</label>
                                                <input type="number" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#006a6a]" value={formData.max_toppings} onChange={e => setFormData({...formData, max_toppings: parseInt(e.target.value) || 0})} min="1" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {globalToppings.map(top => (
                                                <label key={top.id} className={`flex items-start gap-3 p-4 rounded-[1rem] border-2 cursor-pointer transition-all ${formData.topping_ids.includes(top.id) ? 'border-[#006a6a] bg-teal-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                                    <input type="checkbox" className="w-5 h-5 accent-[#006a6a]" checked={formData.topping_ids.includes(top.id)} onChange={() => toggleTopping(top.id)} />
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-800">{top.name}</p>
                                                        <p className="text-xs text-[#006a6a] font-semibold mt-0.5">+{Number(top.price).toLocaleString()}đ</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="p-5 border-t border-gray-100 flex justify-between bg-white shrink-0 rounded-b-[2rem]">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-[1rem] font-bold text-gray-500 hover:bg-gray-100 transition">Hủy bỏ</button>
                            <div className="flex gap-3">
                                <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 rounded-[1rem] font-black bg-[#006a6a] text-white flex items-center gap-2 hover:bg-teal-700 shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:pointer-events-none"><FaCheck/> {isSaving ? 'ĐANG LƯU...' : 'LƯU THỰC ĐƠN'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManagementPage;