import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import { MdEdit, MdVisibility, MdVisibilityOff, MdAdd, MdClose } from 'react-icons/md';

const CategoryManagementPage = () => {
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null); 
    // Mặc định form data dùng Name và Status
    const [formData, setFormData] = useState({ name: '', status: 1 });

    const fetchCategories = async (signal) => {
        try {
            const data = await axiosClient.get('/categories', { signal });
            if (Array.isArray(data)) setCategories(data);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi:", error);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchCategories(controller.signal);
        return () => controller.abort();
    }, []);

    const openAddModal = () => {
        setEditingCategory(null);
        setFormData({ name: '', status: 1 });
        setIsModalOpen(true);
    };

    const openEditModal = (category) => {
        setEditingCategory(category);
        setFormData({ name: category.name, status: category.status });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await axiosClient.put(`/categories/update/${editingCategory.id}`, formData);
            } else {
                await axiosClient.post('/categories/create', formData);
            }
            setIsModalOpen(false);
            fetchCategories(); 
        } catch (error) {
            alert("Lỗi khi lưu");            
        }
    };

    const handleToggleStatus = async (category) => {
        try {
            const newStatus = category.status === 1 ? 0 : 1;
            await axiosClient.put(`/categories/update/${category.id}`, {
                name: category.name,
                status: newStatus
            });
            setCategories(categories.map(cat => 
                cat.id === category.id ? { ...cat, status: newStatus } : cat
            ));
        } catch (error) {
            alert("Lỗi đổi trạng thái");
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto relative">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Quản lý danh mục</h1>
                </div>
                <button onClick={openAddModal} className="bg-[#65DDDD] text-white px-5 py-2.5 rounded-xl font-bold flex gap-2">
                    <MdAdd size={20} /> Thêm danh mục
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categories.map((cat) => (
                    <div key={cat.id} className={`bg-white rounded-3xl p-6 shadow border ${cat.status === 0 ? 'opacity-70' : ''}`}>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{cat.name}</h3>
                        <p className="text-gray-400 text-xs mb-6">Mã: #{cat.id}</p>
                        
                        <div className="flex gap-2">
                            <button onClick={() => handleToggleStatus(cat)} className="flex-1 py-2 bg-gray-50 rounded-xl text-xs font-bold flex justify-center gap-1">
                                {cat.status === 1 ? <><MdVisibilityOff size={16}/> Ẩn</> : <><MdVisibility size={16}/> Hiện</>}
                            </button>
                            <button onClick={() => openEditModal(cat)} className="flex-1 py-2 bg-[#65DDDD]/10 text-[#25b5b5] rounded-xl text-xs font-bold flex justify-center gap-1">
                                <MdEdit size={16} /> Sửa
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative z-10">
                        <h2 className="text-2xl font-black mb-6">{editingCategory ? 'Sửa' : 'Thêm'}</h2>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold mb-2">Tên danh mục</label>
                                <input 
                                    type="text" required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-5 py-3 rounded-2xl border"
                                />
                            </div>
                            <div className="flex justify-between bg-gray-50 p-4 rounded-2xl">
                                <p className="text-sm font-bold">Hiển thị</p>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, status: formData.status === 1 ? 0 : 1})}
                                    className={`w-12 h-6 rounded-full relative ${formData.status === 1 ? 'bg-[#65DDDD]' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full ${formData.status === 1 ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 font-bold">Hủy</button>
                                <button type="submit" className="flex-1 py-3 rounded-2xl bg-[#65DDDD] text-white font-bold">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryManagementPage;