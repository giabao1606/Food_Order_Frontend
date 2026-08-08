import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import { MdEdit, MdAdd, MdClose, MdVisibility, MdVisibilityOff, MdStar, MdStore, MdCardGiftcard, MdDelete } from 'react-icons/md';

const MemberPromotionPage = () => {
    const [promotions, setPromotions] = useState([]);
    const [branches, setBranches] = useState([]);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // TAB MANAGEMENT
    const [activeTab, setActiveTab] = useState(1);
    
    // TIER CONFIG STATE
    const [membershipTiers, setMembershipTiers] = useState([]);
    const [showAddTierModal, setShowAddTierModal] = useState(false);
    const [newTierForm, setNewTierForm] = useState({ tier: '', name: '', min_spent: 0, point_multiplier: 0.01, color: '#006a6a' });
    
    const initialForm = {
        id: null,
        name: '',
        branch_id: '',
        discount_percent: 0,
        discount_amount: 0,
        free_shipping: false,
        gift_food_ids: [], 
        buy_qty: '',
        get_food_id: '',
        is_active: 1,
        target_tiers: [],
        selectedCategory: '',
        reward_voucher_id: ''
    };
    const [formData, setFormData] = useState(initialForm);

    const fetchData = async (signal) => {
        try {
            const [promoRes, branchRes, catRes, prodRes, voucherRes, tierRes] = await Promise.all([
                axiosClient.get('/member-promotions', { signal }),
                axiosClient.get('/branches', { signal }),
                axiosClient.get('/categories', { signal }),
                axiosClient.get('/products', { signal }),
                axiosClient.get('/vouchers/admin/all', { signal }),
                axiosClient.get('/membership-tiers', { signal })
            ]);
            setPromotions(promoRes.data || promoRes);
            setBranches(branchRes.data?.data || branchRes.data || branchRes);
            setCategories(catRes.data || catRes);
            setProducts(prodRes.data || prodRes);
            setVouchers((voucherRes.data?.data || voucherRes.data || voucherRes).filter(v => v.is_rank_up));
            setMembershipTiers(tierRes.data?.data || tierRes.data || []);
        } catch (error) { 
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi lấy dữ liệu:", error); 
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData(controller.signal);
        return () => controller.abort();
    }, []);

    const handleOpenModal = (promo = null) => {
        if (promo) {
            setFormData({
                id: promo.id,
                name: promo.name,
                branch_id: promo.branch_id || '',
                discount_percent: promo.discount_percent || 0,
                discount_amount: promo.discount_amount || 0,
                free_shipping: promo.free_shipping === 1,
                gift_food_ids: promo.gift_food_ids ? promo.gift_food_ids.split(',') : [],
                buy_qty: promo.buy_qty || '',
                get_food_id: promo.get_food_id || '',
                is_active: promo.is_active,
                target_tiers: promo.tiers ? promo.tiers.split(',') : [],
                selectedCategory: '',
                reward_voucher_id: promo.reward_voucher_id || ''
            });
        } else {
            setFormData(initialForm);
        }
        setIsModalOpen(true);
    };

    const handleToggleTier = (tier) => {
        setFormData(prev => {
            const newTiers = prev.target_tiers.includes(tier) ? prev.target_tiers.filter(t => t !== tier) : [...prev.target_tiers, tier];
            return { ...prev, target_tiers: newTiers };
        });
    };

    const handleToggleGiftFood = (foodId) => {
        const idStr = String(foodId);
        setFormData(prev => {
            const currentGifts = [...prev.gift_food_ids];
            const index = currentGifts.indexOf(idStr);
            if (index > -1) currentGifts.splice(index, 1);
            else currentGifts.push(idStr);
            return { ...prev, gift_food_ids: currentGifts };
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (formData.target_tiers.length === 0) return alert('Vui lòng chọn ít nhất 1 bậc hạng (Rank)!');

        try {
            const payload = {
                ...formData,
                gift_food_ids: formData.gift_food_ids.length > 0 ? formData.gift_food_ids.join(',') : null,
                branch_id: formData.branch_id ? Number(formData.branch_id) : null,
                buy_qty: formData.buy_qty ? Number(formData.buy_qty) : null,
                get_food_id: formData.get_food_id ? Number(formData.get_food_id) : null,
                reward_voucher_id: formData.reward_voucher_id ? Number(formData.reward_voucher_id) : null
            };

            if (formData.id) await axiosClient.put(`/member-promotions/${formData.id}`, payload);
            else await axiosClient.post('/member-promotions', payload);
            
            setIsModalOpen(false);
            fetchData();
        } catch (error) { alert(error.response?.data?.message || "Lỗi lưu dữ liệu"); }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await axiosClient.put(`/member-promotions/${id}/status`, { is_active: currentStatus ? 0 : 1 });
            fetchData();
        } catch (error) { console.error(error); }
    };

    const handleDeletePromotion = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa ưu đãi này? (Không thể hoàn tác)")) return;
        try {
            await axiosClient.delete(`/member-promotions/${id}`);
            alert("Xóa ưu đãi thành công!");
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || "Lỗi khi xóa ưu đãi");
        }
    };

    const handleSaveTiers = async () => {
        try {
            await axiosClient.put('/membership-tiers', { tiers: membershipTiers });
            alert('Lưu cấu hình mốc thăng hạng thành công!');
            fetchData();
        } catch (error) {
            alert('Lỗi khi lưu cấu hình');
        }
    };

    const handleTierChange = (index, field, value) => {
        const newTiers = [...membershipTiers];
        newTiers[index][field] = value;
        setMembershipTiers(newTiers);
    };

    const handleAddTier = async (e) => {
        e.preventDefault();
        try {
            await axiosClient.post('/membership-tiers', newTierForm);
            alert('Thêm hạng thành công!');
            setShowAddTierModal(false);
            setNewTierForm({ tier: '', name: '', min_spent: 0, point_multiplier: 0.01, color: '#006a6a' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Lỗi thêm hạng');
        }
    };

    const handleDeleteTier = async (tierId) => {
        if (tierId === 'NONE') return alert('Không thể xóa hạng mặc định!');
        if (!window.confirm('Bạn có chắc chắn muốn xóa hạng này?')) return;
        try {
            await axiosClient.delete(`/membership-tiers/${tierId}`);
            alert('Xóa hạng thành công!');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Lỗi xóa hạng');
        }
    };

    const tierColors = { 'NONE': 'bg-gray-200 text-gray-700', 'BRONZE': 'bg-amber-700 text-white', 'SILVER': 'bg-gray-400 text-white', 'GOLD': 'bg-yellow-500 text-white', 'DIAMOND': 'bg-blue-500 text-white' };

    const getTierName = (tierId) => {
        const found = membershipTiers.find(t => t.tier === tierId);
        return found ? found.name : tierId;
    };

    const getTierColor = (tierId) => {
        const found = membershipTiers.find(t => t.tier === tierId);
        return found?.color || '#374151'; // default gray
    };

    const filteredProducts = products.filter(p => !formData.selectedCategory || String(p.category_id || p.Category_id) === String(formData.selectedCategory));

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quản Trị Hạng Thành Viên</h1>
                    <p className="text-sm text-gray-500 mt-1">Cấu hình định mức thăng hạng và các chương trình ưu đãi tri ân</p>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex bg-white rounded-t-2xl border-b border-gray-200">
                <button onClick={() => setActiveTab(1)} className={`px-6 py-4 font-bold text-sm transition ${activeTab === 1 ? 'border-b-2 border-[#006a6a] text-[#006a6a]' : 'text-gray-500 hover:text-gray-800'}`}>CẤU HÌNH MỐC THĂNG HẠNG</button>
                <button onClick={() => setActiveTab(2)} className={`px-6 py-4 font-bold text-sm transition ${activeTab === 2 ? 'border-b-2 border-[#006a6a] text-[#006a6a]' : 'text-gray-500 hover:text-gray-800'}`}>ƯU ĐÃI & QUÀ TẶNG (TỰ ĐỘNG)</button>
            </div>

            <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 border-t-0 p-6 overflow-hidden">
                {activeTab === 1 && (
                    <div className="animate-in fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-gray-800">Định mức xét thăng hạng & Tích điểm</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setShowAddTierModal(true)} className="bg-white border-2 border-[#006a6a] text-[#006a6a] hover:bg-teal-50 px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-1"><MdAdd size={20}/> Thêm Bậc Hạng</button>
                                <button onClick={handleSaveTiers} className="bg-[#006a6a] hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-sm">Lưu Cấu Hình</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                                        <th className="p-4 font-semibold w-1/4">Hạng Thành Viên</th>
                                        <th className="p-4 font-semibold w-1/4">Màu Nhận Diện</th>
                                        <th className="p-4 font-semibold w-1/4">Chi Tiêu Tối Thiểu (VNĐ)</th>
                                        <th className="p-4 font-semibold w-1/4">Hệ Số Tích Điểm</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {membershipTiers.map((t, idx) => (
                                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50/50">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-md text-xs font-bold text-white shadow-sm`} style={{ backgroundColor: t.color || '#374151' }}>{t.name} ({t.tier})</span>
                                                    {t.tier !== 'NONE' && (
                                                        <button onClick={() => handleDeleteTier(t.tier)} className="text-red-400 hover:text-red-600 p-1" title="Xóa hạng này"><MdClose size={16}/></button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <input type="color" className="w-10 h-10 p-1 border rounded cursor-pointer" value={t.color || '#374151'} onChange={(e) => handleTierChange(idx, 'color', e.target.value)} />
                                                    <span className="text-xs text-gray-500 uppercase">{t.color || '#374151'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <input type="number" className="w-full p-2.5 border rounded-lg outline-none focus:border-[#006a6a]" value={t.min_spent} onChange={(e) => handleTierChange(idx, 'min_spent', e.target.value)} />
                                            </td>
                                            <td className="p-4">
                                                <input type="number" step="0.01" className="w-full p-2.5 border rounded-lg outline-none focus:border-[#006a6a]" value={t.point_multiplier} onChange={(e) => handleTierChange(idx, 'point_multiplier', e.target.value)} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 2 && (
                    <div className="animate-in fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-gray-800">Danh sách chương trình ưu đãi</h2>
                            <button onClick={() => handleOpenModal()} className="bg-[#006a6a] hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition">
                                <MdAdd size={20} /> Thêm Mới
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                                        <th className="p-4 font-semibold">Tên Chương Trình</th>
                                        <th className="p-4 font-semibold">Chi Nhánh</th>
                                        <th className="p-4 font-semibold">Hạng Áp Dụng</th>
                                        <th className="p-4 font-semibold">Đặc Quyền Tích Hợp</th>
                                        <th className="p-4 font-semibold text-center">Trạng Thái</th>
                                        <th className="p-4 font-semibold text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {promotions.map((p, idx) => (
                                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50/50">
                                            <td className="p-4 font-bold text-gray-800">{p.name}</td>
                                            <td className="p-4 text-gray-600">
                                                {p.branch_id ? <span className="flex items-center gap-1"><MdStore className="text-orange-500"/> {branches.find(b => b.id === p.branch_id)?.name || `CN ${p.branch_id}`}</span> : <span className="text-[#006a6a] font-bold">Toàn hệ thống</span>}
                                            </td>
                                            <td className="p-4 flex flex-wrap gap-1">
                                                {p.tiers?.split(',').map(t => (
                                                    <span key={t} className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${tierColors[t] || 'bg-gray-800 text-white'}`}>{getTierName(t)}</span>
                                                ))}
                                            </td>
                                            <td className="p-4 space-y-1">
                                                {p.discount_percent > 0 && <span className="block text-xs bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded w-max">📉 Giảm {p.discount_percent}%</span>}
                                                {p.discount_amount > 0 && <span className="block text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded w-max">💵 Giảm {Number(p.discount_amount).toLocaleString()}đ</span>}
                                                {p.free_shipping === 1 && <span className="block text-xs bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded w-max">🛵 Freeship</span>}
                                                {p.gift_food_ids && <span className="block text-xs bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded w-max">🎁 Tặng món</span>}
                                                {p.buy_qty && <span className="block text-xs bg-yellow-50 text-yellow-800 font-bold px-2 py-0.5 rounded w-max">🛒 Mua {p.buy_qty} tặng 1</span>}
                                                {p.reward_voucher_id && <span className="block text-xs bg-pink-50 text-pink-700 font-bold px-2 py-0.5 rounded w-max">🎟️ Tặng Voucher</span>}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => handleToggleStatus(p.id, p.is_active)}>
                                                    {p.is_active ? <MdVisibility size={22} className="text-[#006a6a]"/> : <MdVisibilityOff size={22} className="text-gray-300"/>}
                                                </button>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleOpenModal(p)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition" title="Sửa"><MdEdit size={20} /></button>
                                                    <button onClick={() => handleDeletePromotion(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Xóa"><MdDelete size={20} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh]">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><MdStar className="text-yellow-500"/> Thiết Lập Combo Quyền Lợi Đa Tầng</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full"><MdClose size={20}/></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tên Khuyến Mãi / Sự Kiện Tri Ân</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#006a6a] focus:bg-white text-sm" placeholder="VD: Siêu đặc quyền tháng 12..." required/>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Áp dụng cho các Hạng (Rank)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {membershipTiers.map(t => (
                                            <button key={t.tier} type="button" onClick={() => handleToggleTier(t.tier)} className={`px-3 py-1.5 border-2 rounded-xl font-bold text-xs transition-all ${formData.target_tiers.includes(t.tier) ? 'border-[#006a6a] bg-teal-50 text-[#006a6a]' : 'border-gray-200 text-gray-400'}`}>{t.name}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-4">
                                <h3 className="font-bold text-sm text-[#006a6a] flex items-center gap-1">🛠️ Kích hoạt các gói phần thưởng tích hợp cùng lúc:</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b pb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">📉 Giảm giá theo % hóa đơn</label>
                                        <input type="number" min="0" max="100" value={formData.discount_percent} onChange={e => setFormData({...formData, discount_percent: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm" placeholder="Nhập số %..."/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">💵 Giảm giá tiền mặt thẳng (đ)</label>
                                        <input type="number" min="0" value={formData.discount_amount} onChange={e => setFormData({...formData, discount_amount: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm" placeholder="Nhập số tiền..."/>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4 pl-2">
                                        <input type="checkbox" id="fs" checked={formData.free_shipping} onChange={e => setFormData({...formData, free_shipping: e.target.checked})} className="w-4 h-4 rounded text-[#006a6a]"/>
                                        <label htmlFor="fs" className="text-sm font-bold text-orange-600 cursor-pointer">🛵 Miễn phí giao hàng</label>
                                    </div>
                                </div>

                                <div className="space-y-2 border-b pb-4">
                                    <label className="block text-xs font-bold text-purple-700">🎁 Tặng món ăn miễn phí (Chọn tick nhiều món tùy ý):</label>
                                    <div className="flex gap-2 mb-2">
                                        <select value={formData.selectedCategory} onChange={e => setFormData({...formData, selectedCategory: e.target.value})} className="p-2 bg-white border rounded-lg text-xs outline-none">
                                            <option value="">-- Lọc theo danh mục --</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name || c.Name}</option>)}
                                        </select>
                                        <span className="text-xs text-gray-400 self-center">Đã chọn: {formData.gift_food_ids.length} món quà tặng</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto border p-2 rounded-lg bg-white">
                                        {filteredProducts.map(p => {
                                            const pId = String(p.id);
                                            return (
                                                <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer text-xs">
                                                    <input type="checkbox" checked={formData.gift_food_ids.includes(pId)} onChange={() => handleToggleGiftFood(p.id)} className="rounded text-purple-600"/>
                                                    <span className="truncate font-medium">{p.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-b pb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">🛒 Mua tối thiểu số lượng món</label>
                                        <input type="number" value={formData.buy_qty} onChange={e => setFormData({...formData, buy_qty: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm" placeholder="VD: Mua 3 món trở lên..."/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">👉 Tặng kèm thêm 1 phần món ăn</label>
                                        <select value={formData.get_food_id} onChange={e => setFormData({...formData, get_food_id: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm outline-none font-semibold text-teal-700">
                                            <option value="">-- Chọn món tặng kèm --</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-pink-700">🎟️ Phát Voucher Thăng Hạng (chỉ chọn 1):</label>
                                    <select value={formData.reward_voucher_id} onChange={e => setFormData({...formData, reward_voucher_id: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm outline-none">
                                        <option value="">-- Không tặng Voucher --</option>
                                        {vouchers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Chi Nhánh Áp Dụng</label>
                                    <select value={formData.branch_id} onChange={e => setFormData({...formData, branch_id: e.target.value})} className="w-full p-2.5 bg-gray-50 border rounded-xl text-sm bg-white">
                                        <option value="">-- Toàn hệ thống --</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition text-sm">Hủy Bỏ</button>
                            <button onClick={handleSave} className="px-8 py-2 rounded-xl font-bold bg-[#006a6a] text-white hover:bg-teal-700 shadow-lg transition text-sm">Lưu Gói Khuyến Mãi</button>
                        </div>
                    </div>
                </div>
            )}

            {showAddTierModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-800">Thêm Bậc Hạng Mới</h2>
                            <button onClick={() => setShowAddTierModal(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full"><MdClose size={20}/></button>
                        </div>
                        <form onSubmit={handleAddTier} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Mã Hạng (VD: PLATINUM, VIP)</label>
                                <input type="text" value={newTierForm.tier} onChange={e => setNewTierForm({...newTierForm, tier: e.target.value.toUpperCase()})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#006a6a]" required />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tên Hạng hiển thị</label>
                                    <input type="text" value={newTierForm.name} onChange={e => setNewTierForm({...newTierForm, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#006a6a]" required placeholder="VD: Bạch Kim" />
                                </div>
                                <div className="w-24">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Màu Hạng</label>
                                    <input type="color" value={newTierForm.color} onChange={e => setNewTierForm({...newTierForm, color: e.target.value})} className="w-full h-[50px] p-1 border border-gray-200 rounded-xl cursor-pointer" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Chi tiêu tối thiểu (VNĐ)</label>
                                <input type="number" value={newTierForm.min_spent} onChange={e => setNewTierForm({...newTierForm, min_spent: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#006a6a]" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Hệ số điểm (VD: 0.1 = 10%)</label>
                                <input type="number" step="0.01" value={newTierForm.point_multiplier} onChange={e => setNewTierForm({...newTierForm, point_multiplier: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#006a6a]" required />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowAddTierModal(false)} className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">Hủy</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-[#006a6a] hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm">Tạo Mới</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberPromotionPage;