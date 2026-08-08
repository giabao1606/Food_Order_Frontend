import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';

const ToppingManagementPage = () => {
    const [toppings, setToppings] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const initialForm = { id: null, name: '', price: '', is_active: 1, min_quantity: 0, max_quantity: 5, ingredients: [] };
    const [formData, setFormData] = useState(initialForm);

    const fetchData = async (signal) => {
        try {
            const [topRes, ingRes] = await Promise.all([
                axiosClient.get('/toppings', { signal }),
                axiosClient.get('/ingredients', { signal })
            ]);
            setToppings(topRes.data || topRes);
            setIngredients(ingRes.data || ingRes);
        } catch (error) { 
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi:", error); 
        }
    };

    useEffect(() => { 
        const controller = new AbortController();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData(controller.signal); 
        return () => controller.abort();
    }, []);

    const handleOpenModal = async (topping = null) => {
        if (topping) {
            try {
                const res = await axiosClient.get(`/toppings/${topping.id}`);
                setFormData({
                    id: res.data.id, name: res.data.name, price: res.data.price, is_active: res.data.is_active,
                    min_quantity: res.data.min_quantity || 0, max_quantity: res.data.max_quantity || 5,
                    ingredients: res.data.ingredients || []
                });
            } catch (error) { alert("Lỗi tải chi tiết"); return; }
        } else {
            setFormData(initialForm);
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            if (formData.id) { await axiosClient.put(`/toppings/${formData.id}`, formData); } 
            else { await axiosClient.post('/toppings', formData); }
            alert('Lưu thành công!');
            setIsModalOpen(false); fetchData();
        } catch (error) { alert('Có lỗi xảy ra!'); }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Xóa Topping này? Nó cũng sẽ bị gỡ khỏi tất cả món ăn đang dùng nó.")) {
            try {
                await axiosClient.delete(`/toppings/${id}`);
                alert("Xóa thành công!"); fetchData();
            } catch (error) { alert("Lỗi khi xóa!"); }
        }
    };

    // Quản lý nguyên liệu hao hụt cho Topping
    const addIngredient = () => setFormData(prev => ({ ...prev, ingredients: [...prev.ingredients, { ingredient_id: '', quantity_required: '' }] }));
    const removeIngredient = (idx) => setFormData(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx) }));
    const updateIngredient = (idx, field, val) => { const newIngs = [...formData.ingredients]; newIngs[idx][field] = val; setFormData({ ...formData, ingredients: newIngs }); };

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black text-gray-800">Quản lý Topping Toàn cục</h1>
                <button onClick={() => handleOpenModal()} className="bg-[#006a6a] text-white px-5 py-2.5 rounded-[1rem] font-bold flex items-center gap-2 hover:bg-teal-700 shadow-lg transition">
                    <FaPlus /> Thêm Topping
                </button>
            </div>

            <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 font-bold text-gray-600">ID</th>
                            <th className="p-4 font-bold text-gray-600">Tên Topping</th>
                            <th className="p-4 font-bold text-gray-600">Giá cộng thêm</th>
                            <th className="p-4 font-bold text-gray-600 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {toppings.map(t => (
                            <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-800">#{t.id}</td>
                                <td className="p-4 font-bold text-[#006a6a]">{t.name}</td>
                                <td className="p-4 font-semibold text-orange-500">+{Number(t.price).toLocaleString()}đ</td>
                                <td className="p-4 flex justify-end gap-3">
                                    <button onClick={() => handleOpenModal(t)} className="p-2.5 bg-blue-50 text-blue-600 rounded-[0.8rem] hover:bg-blue-100"><FaEdit/></button>
                                    <button onClick={() => handleDelete(t.id)} className="p-2.5 bg-red-50 text-red-600 rounded-[0.8rem] hover:bg-red-100"><FaTrash/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-800">{formData.id ? 'Sửa Topping' : 'Thêm Topping'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500 rounded-full"><FaTimes size={20}/></button>
                        </div>
                        <div className="p-6 space-y-5 bg-gray-50/50">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Tên Topping</label>
                                    <input type="text" className="w-full p-3.5 bg-white border border-gray-200 rounded-[1rem] outline-none focus:border-[#006a6a]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Giá tiền (VNĐ)</label>
                                    <input type="number" className="w-full p-3.5 bg-white border border-gray-200 rounded-[1rem] outline-none focus:border-[#006a6a]" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">SL tối thiểu / đơn</label>
                                    <input type="number" className="w-full p-3.5 bg-white border border-gray-200 rounded-[1rem] outline-none focus:border-[#006a6a]" value={formData.min_quantity} onChange={e => setFormData({...formData, min_quantity: e.target.value})} min="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">SL tối đa / đơn</label>
                                    <input type="number" className="w-full p-3.5 bg-white border border-gray-200 rounded-[1rem] outline-none focus:border-[#006a6a]" value={formData.max_quantity} onChange={e => setFormData({...formData, max_quantity: e.target.value})} min="1" />
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-sm font-bold text-gray-700">Nguyên liệu cấu thành Topping</label>
                                    <button onClick={addIngredient} className="text-[#006a6a] text-sm font-bold bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100">+ Thêm NL</button>
                                </div>
                                {formData.ingredients.map((ing, idx) => (
                                    <div key={idx} className="flex gap-3 mb-3 items-center">
                                        <select className="flex-1 p-3 border border-gray-200 rounded-[1rem] bg-gray-50 outline-none" value={ing.ingredient_id} onChange={e => updateIngredient(idx, 'ingredient_id', e.target.value)}>
                                            <option value="">Chọn nguyên liệu</option>
                                            {ingredients.map(ig => <option key={ig.id} value={ig.id}>{ig.name}</option>)}
                                        </select>
                                        <input type="number" placeholder="Số lượng" className="w-32 p-3 border border-gray-200 rounded-[1rem] bg-gray-50 outline-none font-bold text-center" value={ing.quantity_required} onChange={e => updateIngredient(idx, 'quantity_required', e.target.value)} />
                                        <button onClick={() => removeIngredient(idx)} className="text-red-400 p-3 hover:bg-red-50 rounded-[1rem]"><FaTrash/></button>
                                    </div>
                                ))}
                                {formData.ingredients.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">Chưa chọn nguyên liệu hao hụt cho Topping này.</p>}
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-white">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-[1rem] font-bold text-gray-500 hover:bg-gray-100">Hủy</button>
                            <button onClick={handleSave} className="px-8 py-3 rounded-[1rem] font-black bg-[#006a6a] text-white hover:bg-teal-700 shadow-lg shadow-teal-500/30">LƯU TOPPING</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToppingManagementPage;