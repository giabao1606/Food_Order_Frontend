import React, { useState, useEffect, useRef } from 'react';
import axiosClient from '../../utils/axiosClient';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSearch, FaMapMarkerAlt, FaCrosshairs } from 'react-icons/fa';

const BranchManagementPage = () => {
    const [branches, setBranches] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ name: '', address: '', latitude: '', longitude: '', is_active: true, max_capacity: 50, reservation_duration: 120, opening_time: '08:00', closing_time: '22:00' });

    // TrackAsia Autocomplete States
    const [suggestions, setSuggestions] = useState([]);
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const searchTimeoutRef = useRef(null);
    const TRACKASIA_API_KEY = import.meta.env.VITE_TRACKASIA_API_KEY;

    const fetchBranches = async (signal) => {
        try {
            const res = await axiosClient.get('/branches', { signal });
            setBranches(res.data || []);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi:", error);
        }
    };

    useEffect(() => { 
        const controller = new AbortController();
        fetchBranches(controller.signal); 
        return () => controller.abort();
    }, []);

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ 
                name: item.name, 
                address: item.address, 
                latitude: item.latitude || item.lat, 
                longitude: item.longitude || item.lng, 
                phone: item.phone, 
                is_active: !!item.is_active,
                max_capacity: item.max_capacity || 50,
                reservation_duration: item.reservation_duration || 120,
                opening_time: item.opening_time || '08:00',
                closing_time: item.closing_time || '22:00'
            });
        } else {
            setEditingItem(null);
            setFormData({ name: '', address: '', latitude: '', longitude: '', phone: '', is_active: true, max_capacity: 50, reservation_duration: 120, opening_time: '08:00', closing_time: '22:00' });
        }
        setSuggestions([]);
        setIsModalOpen(true);
    };

    // Hàm gọi API TrackAsia để tự động lấy tọa độ
    const handleSearchAddress = (e) => {
        const text = e.target.value;
        setFormData({ ...formData, address: text });

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (text.length < 3) {
            setSuggestions([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearchingAddress(true);
            try {
                const res = await axios.get(`https://maps.track-asia.com/api/v1/autocomplete`, {
                    params: { text: text, key: TRACKASIA_API_KEY, lang: 'vi', new_admin: 'true' }
                });
                setSuggestions(res.data.features || []);
            } catch (error) {
                console.error('Lỗi lấy dữ liệu TrackAsia:', error);
            } finally {
                setIsSearchingAddress(false);
            }
        }, 500);
    };

    // Khi Admin bấm chọn địa chỉ gợi ý
    const handleSelectLocation = (feature) => {
        const fullAddress = feature.properties.label;
        const [lng, lat] = feature.geometry.coordinates;
        
        setFormData({
            ...formData,
            address: fullAddress,
            latitude: lat,
            longitude: lng // Tự động điền tọa độ
        });
        setSuggestions([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await axiosClient.put(`/branches/${editingItem.id}`, formData);
                alert("Cập nhật chi nhánh thành công!");
            } else {
                await axiosClient.post('/branches', formData);
                alert("Thêm chi nhánh thành công!");
            }
            setIsModalOpen(false);
            fetchBranches();
        } catch (error) {
            alert(error.response?.data?.message || "Có lỗi xảy ra!");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa chi nhánh này không?")) {
            try {
                const res = await axiosClient.delete(`/branches/${id}`);
                if (res.success) {
                    alert("Xóa thành công!");
                    fetchBranches();
                }
            } catch (error) {
                alert(error.response?.data?.message || "Lỗi xóa chi nhánh");
            }
        }
    };

    const filteredList = branches.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Quản lý Chi Nhánh</h1>
                    <p className="text-gray-500 text-sm mt-1">Quản lý danh sách các cửa hàng trong chuỗi</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-grow md:w-64">
                        <input type="text" placeholder="Tìm tên chi nhánh..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#006a6a]" />
                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <button onClick={() => handleOpenModal()} className="bg-[#006a6a] hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap"><FaPlus /> Thêm mới</button>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                                <th className="p-4 font-bold">Mã</th>
                                <th className="p-4 font-bold">Tên & Địa chỉ</th>
                                <th className="p-4 font-bold">Hoạt động & Sức chứa</th>
                                <th className="p-4 font-bold">Tọa độ (Lat, Lng)</th>
                                <th className="p-4 font-bold text-center">Trạng thái</th>
                                <th className="p-4 font-bold text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-100">
                            {filteredList.map((item) => (
                                <tr key={item.id} className={`hover:bg-gray-50/50 transition ${!item.is_active ? 'opacity-50 grayscale' : ''}`}>
                                    <td className="p-4 font-semibold text-gray-500">#{item.id}</td>
                                    <td className="p-4">
                                        <p className="font-bold text-[#006a6a] text-[15px]">{item.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{item.address}</p>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        <p>⏰ {item.opening_time?.slice(0,5) || '08:00'} - {item.closing_time?.slice(0,5) || '22:00'}</p>
                                        <p className="mt-1">🪑 Tối đa {item.max_capacity || 50} khách</p>
                                        <p className="mt-1">⏳ Giữ bàn {item.reservation_duration || 120} phút</p>
                                    </td>
                                    <td className="p-4 text-xs font-mono text-gray-600">
                                        {item.latitude || item.lat}, <br/> {item.longitude || item.lng}
                                    </td>                                    
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {item.is_active ? 'Đang hoạt động' : 'Tạm đóng cửa'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleOpenModal(item)} className="p-2 bg-teal-50 text-[#006a6a] rounded-lg hover:bg-teal-100 transition"><FaEdit /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"><FaTrash /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-2"><FaTimes size={20} /></button>
                        <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-3xl">
                            <h2 className="text-xl font-black text-[#006a6a] flex items-center gap-2"><FaMapMarkerAlt /> {editingItem ? 'Sửa thông tin chi nhánh' : 'Khai báo chi nhánh mới'}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tên chi nhánh <span className="text-red-500">*</span></label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#006a6a]" placeholder="VD: Chi Nhánh STU Cao Lỗ..." />
                            </div>

                            {/* Ô Địa chỉ giờ có thêm tính năng Autocomplete */}
                            <div className="md:col-span-2 relative">
                                <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">Địa chỉ đầy đủ <span className="text-red-500">*</span> <span className="text-xs text-gray-400 font-normal bg-gray-100 px-2 py-0.5 rounded-full">Sẽ tự động dò tìm tọa độ</span></label>
                                <div className="relative">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.address} 
                                        onChange={handleSearchAddress} 
                                        className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#006a6a]" 
                                        placeholder="Gõ số nhà, tên đường để tự động tìm..." 
                                    />
                                    {isSearchingAddress && <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#006a6a] border-t-transparent rounded-full animate-spin"></span>}
                                </div>

                                {/* Danh sách gợi ý Dropdown */}
                                {suggestions.length > 0 && (
                                    <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-2 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                        {suggestions.map((feature, index) => (
                                            <li key={index} className="p-4 hover:bg-teal-50 cursor-pointer border-b border-gray-50 last:border-b-0 transition flex items-start gap-3" onClick={() => handleSelectLocation(feature)}>
                                                <FaCrosshairs className="text-[#006a6a] mt-1 shrink-0" />
                                                <div>
                                                    <span className="font-bold text-gray-800 block">{feature.properties.name}</span>
                                                    <span className="text-xs text-gray-500">{feature.properties.label}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Vĩ độ (Latitude)</label>
                                <input type="text" required value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} className="w-full p-3 bg-teal-50 border border-teal-200 text-[#006a6a] font-bold rounded-xl outline-none focus:border-[#006a6a]" placeholder="Tự động điền..." />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Kinh độ (Longitude)</label>
                                <input type="text" required value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} className="w-full p-3 bg-teal-50 border border-teal-200 text-[#006a6a] font-bold rounded-xl outline-none focus:border-[#006a6a]" placeholder="Tự động điền..." />
                            </div>

                            {/* THÊM 4 CỘT CẤU HÌNH CHO DINE_IN */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Giờ mở cửa <span className="text-red-500">*</span></label>
                                <input type="time" required value={formData.opening_time} onChange={e => setFormData({...formData, opening_time: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#006a6a]" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Giờ đóng cửa <span className="text-red-500">*</span></label>
                                <input type="time" required value={formData.closing_time} onChange={e => setFormData({...formData, closing_time: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#006a6a]" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Sức chứa tối đa (khách) <span className="text-red-500">*</span></label>
                                <input type="number" min="1" required value={formData.max_capacity} onChange={e => setFormData({...formData, max_capacity: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#006a6a]" placeholder="VD: 50" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Thời gian giữ bàn (phút) <span className="text-red-500">*</span></label>
                                <input type="number" min="30" required value={formData.reservation_duration} onChange={e => setFormData({...formData, reservation_duration: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#006a6a]" placeholder="VD: 120" />
                            </div>                          

                            <div className="md:col-span-2 flex items-center mt-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <label className="flex items-center gap-3 cursor-pointer font-bold text-gray-800">
                                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 accent-[#006a6a] rounded" />
                                    Cửa hàng đang hoạt động (Sẵn sàng nhận đơn)
                                </label>
                            </div>

                            <div className="md:col-span-2 flex gap-3 pt-4 border-t mt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Hủy bỏ</button>
                                <button type="submit" className="flex-1 p-3.5 bg-[#006a6a] text-white font-bold rounded-xl hover:bg-teal-700 transition shadow-md">{editingItem ? 'Lưu cập nhật' : 'Thêm chi nhánh mới'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchManagementPage;