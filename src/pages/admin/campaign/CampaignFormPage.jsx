import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axiosClient from '../../../utils/axiosClient';
import toast from 'react-hot-toast';
import { MdSave, MdSchedule, MdArrowBack } from 'react-icons/md';

const CampaignFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const location = useLocation();
    
    // Form data
    const [formData, setFormData] = useState({
        name: '', description: '', type: 'CUSTOM', discount_type: 'PERCENT', discount_percent: '', discount_amount: '',
        start_time: '', end_time: '', target_scope: 'ALL',
        branch_ids: [], items: [], notification_text: '',
        gift_type: 'NONE', gift_food_ids: [], buy_qty: '', get_food_id: '',
        min_tier: ''
    });

    const [tiers, setTiers] = useState([]);

    const [branches, setBranches] = useState([]);
    const [banners, setBanners] = useState([]);
    const [feeds, setFeeds] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [branchRes, bannerRes, feedRes, voucherRes, productRes, tierRes] = await Promise.all([
                    axiosClient.get('/branches'),
                    axiosClient.get('/banners'),
                    axiosClient.get('/admin/feed'),
                    axiosClient.get('/vouchers/admin/campaign'),
                    axiosClient.get('/products'),
                    axiosClient.get('/membership-tiers')
                ]);
                if (Array.isArray(branchRes)) setBranches(branchRes); else if (branchRes.success) setBranches(branchRes.data);
                if (Array.isArray(bannerRes)) setBanners(bannerRes); else if (bannerRes.success) setBanners(bannerRes.data);
                if (Array.isArray(feedRes)) setFeeds(feedRes); else if (feedRes.success) setFeeds(feedRes.data);
                if (Array.isArray(voucherRes)) setVouchers(voucherRes); else if (voucherRes.success) setVouchers(voucherRes.data);
                if (Array.isArray(productRes)) setProducts(productRes); else if (productRes.data) setProducts(productRes.data);
                if (tierRes.success) setTiers(tierRes.data || []);

                if (id) {
                    const res = await axiosClient.get(`/admin/campaigns/${id}`);
                    if (res.success) {
                        const c = res.data;
                        let giftType = 'NONE';
                        let giftFoodIds = [];
                        if (c.gift_food_ids) { giftType = 'FREE_ITEM'; giftFoodIds = c.gift_food_ids.split(',').filter(Boolean); }
                        else if (c.buy_qty && c.get_food_id) { giftType = 'BOGO'; }

                        const formatDate = (d) => d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
                        
                        setFormData({
                            name: c.name, description: c.description || '', type: c.type, 
                            discount_type: c.discount_amount ? 'AMOUNT' : 'PERCENT', 
                            discount_percent: c.discount_percent || '', discount_amount: c.discount_amount || '',
                            start_time: formatDate(c.start_time), end_time: formatDate(c.end_time), target_scope: c.target_scope,
                            branch_ids: c.branches?.map(b => b.branch_id) || [],
                            items: c.items?.filter(i => i.item_type !== 'NOTIFICATION').map(i => ({ item_type: i.item_type, item_id: i.item_id })) || [],
                            notification_text: c.items?.find(i => i.item_type === 'NOTIFICATION')?.notification_text || '',
                            gift_type: giftType, gift_food_ids: giftFoodIds, buy_qty: c.buy_qty || '', get_food_id: c.get_food_id || '',
                            min_tier: c.min_tier || ''
                        });
                    }
                } else if (location.state?.proposal) {
                    const p = location.state.proposal;
                    const formatDate = (d) => d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
                    setFormData(prev => ({
                        ...prev,
                        name: p.title || '',
                        description: p.description || p.reason || '',
                        type: p.suggested_type || 'CUSTOM',
                        discount_type: p.suggested_discount_type || 'PERCENT',
                        discount_percent: p.suggested_discount_type === 'PERCENT' ? p.suggested_discount_value : '',
                        discount_amount: p.suggested_discount_type === 'AMOUNT' ? p.suggested_discount_value : '',
                        start_time: formatDate(p.suggested_start),
                        end_time: formatDate(p.suggested_end),
                        target_scope: p.target_scope || 'ALL',
                        branch_ids: p.branch_id ? [p.branch_id] : []
                    }));
                }
            } catch (error) {
                toast.error('Lỗi tải dữ liệu');
            }
        };
        fetchInitialData();
    }, [id, location.state]);

    const handleSubmit = async (status) => {
        if (!formData.name || !formData.start_time || !formData.end_time) {
            return toast.error('Vui lòng điền đủ tên và thời gian!');
        }
        setLoading(true);
        try {
            let payload = { ...formData, status };
            if (payload.discount_type === 'PERCENT') { payload.discount_amount = ''; } 
            else { payload.discount_percent = ''; }

            if (payload.gift_type === 'NONE') {
                payload.gift_food_ids = null;
                payload.buy_qty = null;
                payload.get_food_id = null;
            } else if (payload.gift_type === 'FREE_ITEM') {
                payload.gift_food_ids = payload.gift_food_ids.join(',');
                payload.buy_qty = null;
                payload.get_food_id = null;
            } else if (payload.gift_type === 'BOGO') {
                payload.gift_food_ids = null;
            }

            const res = id 
                ? await axiosClient.put(`/admin/campaigns/${id}`, payload)
                : await axiosClient.post('/admin/campaigns', payload);
            
            if (res.success) {
                toast.success(id ? 'Cập nhật thành công!' : 'Tạo campaign thành công!');
                navigate('/admin/campaigns');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi lưu campaign');
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (type, itemId) => {
        setFormData(prev => {
            const exists = prev.items.find(i => i.item_type === type && i.item_id === itemId);
            if (exists) return { ...prev, items: prev.items.filter(i => i.item_id !== itemId || i.item_type !== type) };
            return { ...prev, items: [...prev.items, { item_type: type, item_id: itemId }] };
        });
    };
    const hasItem = (type, itemId) => formData.items.some(i => i.item_type === type && i.item_id === itemId);

    return (
        <div className="p-6 max-w-5xl mx-auto pb-20">
            <button onClick={() => navigate('/admin/campaigns')} className="flex items-center gap-1 text-gray-500 hover:text-[#006a6a] font-bold mb-4">
                <MdArrowBack /> Quay lại
            </button>
            <h1 className="text-2xl font-black text-gray-800 mb-6">{id ? 'Sửa Chiến dịch' : 'Tạo Chiến dịch mới'}</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-8">
                {/* 1. Basic Info */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">1. Thông tin cơ bản</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tên chiến dịch *</label>
                            <input type="text" className="w-full border rounded-xl px-4 py-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Loại chiến dịch</label>
                            <select className="w-full border rounded-xl px-4 py-2" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                <option value="CUSTOM">Khác (Custom)</option>
                                <option value="FLASH_SALE">Flash Sale</option>
                                <option value="HAPPY_HOUR">Happy Hour</option>
                                <option value="SEASONAL">Chiến dịch mùa / Lễ hội</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mô tả</label>
                            <textarea className="w-full border rounded-xl px-4 py-2" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                        </div>
                        {(formData.type === 'FLASH_SALE' || formData.type === 'HAPPY_HOUR' || formData.discount_percent || formData.discount_amount || formData.type === 'CUSTOM') && (
                            <div className="col-span-2 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Loại giảm giá</label>
                                    <select className="w-full border rounded-xl px-4 py-2" value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})}>
                                        <option value="PERCENT">Giảm phần trăm (%)</option>
                                        <option value="AMOUNT">Giảm trực tiếp (VNĐ)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Mức giảm</label>
                                    <input type="number" min="0" className="w-full border rounded-xl px-4 py-2" value={formData.discount_type === 'PERCENT' ? formData.discount_percent : formData.discount_amount} onChange={e => setFormData({...formData, [formData.discount_type === 'PERCENT' ? 'discount_percent' : 'discount_amount']: e.target.value})} placeholder={formData.discount_type === 'PERCENT' ? "Vd: 20" : "Vd: 20000"} />
                                </div>
                            </div>
                        )}
                        
                        {/* Quà Tặng Kèm */}
                        <div className="col-span-2 mt-4 p-4 border border-dashed border-teal-300 rounded-2xl bg-teal-50">
                            <label className="block text-sm font-bold text-teal-800 mb-2">Cấu hình quà tặng kèm</label>
                            <select className="w-full border-teal-200 rounded-xl px-4 py-2 mb-4 bg-white" value={formData.gift_type || 'NONE'} onChange={e => setFormData({...formData, gift_type: e.target.value})}>
                                <option value="NONE">Không tặng quà</option>
                                <option value="FREE_ITEM">Tặng món ăn miễn phí</option>
                                <option value="BOGO">Mua X tặng Y</option>
                            </select>

                            {formData.gift_type === 'FREE_ITEM' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn món sẽ tặng:</label>
                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-white p-3 rounded-xl border border-teal-200">
                                        {products.map(p => (
                                            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-teal-50 p-1 rounded">
                                                <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" 
                                                    checked={(formData.gift_food_ids || []).includes(p.id.toString())}
                                                    onChange={e => {
                                                        const current = formData.gift_food_ids || [];
                                                        setFormData({...formData, gift_food_ids: e.target.checked ? [...current, p.id.toString()] : current.filter(id => id !== p.id.toString())});
                                                    }}
                                                />
                                                {p.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.gift_type === 'BOGO' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Số lượng cần mua (X)</label>
                                        <input type="number" min="1" className="w-full border-teal-200 rounded-xl px-4 py-2 bg-white" value={formData.buy_qty || ''} onChange={e => setFormData({...formData, buy_qty: e.target.value})} placeholder="Vd: Mua 2..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Món được tặng (Y)</label>
                                        <select className="w-full border-teal-200 rounded-xl px-4 py-2 bg-white" value={formData.get_food_id || ''} onChange={e => setFormData({...formData, get_food_id: e.target.value})}>
                                            <option value="">-- Chọn món tặng --</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 2. Timing */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">2. Lịch trình áp dụng</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Bắt đầu lúc *</label>
                            <input type="datetime-local" className="w-full border rounded-xl px-4 py-2" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Kết thúc lúc *</label>
                            <input type="datetime-local" className="w-full border rounded-xl px-4 py-2" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                        </div>
                    </div>
                </section>

                {/* 3. Scope */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">3. Phạm vi áp dụng</h2>
                    <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 font-semibold text-gray-700">
                            <input type="radio" name="scope" checked={formData.target_scope === 'ALL'} onChange={() => setFormData({...formData, target_scope: 'ALL', branch_ids: []})} /> Toàn hệ thống
                        </label>
                        <label className="flex items-center gap-2 font-semibold text-gray-700">
                            <input type="radio" name="scope" checked={formData.target_scope === 'BRANCH'} onChange={() => setFormData({...formData, target_scope: 'BRANCH'})} /> Chọn chi nhánh
                        </label>
                    </div>
                    {formData.target_scope === 'BRANCH' && (
                        <div className="grid grid-cols-3 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            {branches.map(b => (
                                <label key={b.id} className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={formData.branch_ids.includes(b.id)} onChange={(e) => {
                                        const ids = e.target.checked ? [...formData.branch_ids, b.id] : formData.branch_ids.filter(id => id !== b.id);
                                        setFormData({...formData, branch_ids: ids});
                                    }} /> {b.name}
                                </label>
                            ))}
                        </div>
                    )}
                    
                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Hạng tối thiểu áp dụng (Không bắt buộc)</label>
                        <select 
                            className="w-full sm:w-1/2 border rounded-xl px-4 py-2 bg-white"
                            value={formData.min_tier}
                            onChange={e => setFormData({...formData, min_tier: e.target.value})}
                        >
                            <option value="">-- Không giới hạn (Tất cả thành viên) --</option>
                            {tiers.map(t => (
                                <option key={t.tier} value={t.tier}>Từ hạng {t.name} (Chi tiêu {t.min_spent.toLocaleString()}đ)</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Chỉ những khách hàng đạt từ hạng này trở lên mới nhận được ưu đãi.</p>
                    </div>
                </section>

                {/* 4. Items */}
                <section>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">4. Đính kèm nội dung (Tùy chọn)</h2>
                    <p className="text-xs text-gray-500 mb-4">Các nội dung này sẽ tự động bật/hiển thị khi campaign bắt đầu, và tự động ẩn khi kết thúc.</p>
                    
                    <div className="space-y-4">
                        {/* Banners */}
                        <div className="border rounded-xl p-4">
                            <h3 className="font-bold mb-2">Banners</h3>
                            <div className="flex flex-wrap gap-2">
                                {banners.map(b => (
                                    <label key={b.id} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm cursor-pointer transition ${hasItem('BANNER', b.id) ? 'bg-teal-50 border-teal-500 text-teal-800 font-bold' : 'hover:bg-gray-50'}`}>
                                        <input type="checkbox" checked={hasItem('BANNER', b.id)} onChange={() => toggleItem('BANNER', b.id)} className="hidden"/>
                                        🖼️ {b.title}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {/* Feed */}
                        <div className="border rounded-xl p-4">
                            <h3 className="font-bold mb-2">Bài viết Feed</h3>
                            <div className="flex flex-wrap gap-2">
                                {feeds.map(f => (
                                    <label key={f.id} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm cursor-pointer transition ${hasItem('FEED', f.id) ? 'bg-teal-50 border-teal-500 text-teal-800 font-bold' : 'hover:bg-gray-50'}`}>
                                        <input type="checkbox" checked={hasItem('FEED', f.id)} onChange={() => toggleItem('FEED', f.id)} className="hidden"/>
                                        📝 {f.title}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {/* Vouchers */}
                        <div className="border rounded-xl p-4">
                            <h3 className="font-bold mb-2">Vouchers</h3>
                            <div className="flex flex-wrap gap-2">
                                {vouchers.map(v => (
                                    <label key={v.id} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm cursor-pointer transition ${hasItem('VOUCHER', v.id) ? 'bg-teal-50 border-teal-500 text-teal-800 font-bold' : 'hover:bg-gray-50'}`}>
                                        <input type="checkbox" checked={hasItem('VOUCHER', v.id)} onChange={() => toggleItem('VOUCHER', v.id)} className="hidden"/>
                                        🎟️ {v.code}
                                        {v.is_campaign_only && <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded font-bold">CHIẾN DỊCH</span>}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {/* Notification */}
                        <div className="border rounded-xl p-4">
                            <h3 className="font-bold mb-2">Gửi Push Notification</h3>
                            <textarea placeholder="Nhập nội dung thông báo. Hệ thống sẽ gửi cho toàn bộ khách hàng khi campaign bắt đầu..." 
                                className="w-full border rounded-lg px-3 py-2 text-sm" rows="2"
                                value={formData.notification_text} onChange={e => setFormData({...formData, notification_text: e.target.value})}
                            ></textarea>
                        </div>
                    </div>
                </section>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                    <button disabled={loading} onClick={() => handleSubmit('DRAFT')} className="px-5 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2 transition">
                        <MdSave /> Lưu Nháp
                    </button>
                    <button disabled={loading} onClick={() => handleSubmit('SCHEDULED')} className="px-5 py-2.5 rounded-xl font-bold bg-[#006a6a] text-white hover:bg-teal-700 flex items-center gap-2 transition shadow-lg shadow-teal-500/30">
                        <MdSchedule /> Lưu & Lên Lịch
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CampaignFormPage;
