import React, { useState, useEffect } from 'react';
import { FaTimes, FaStar, FaMinus, FaPlus, FaShoppingCart, FaCheckCircle, FaGift } from 'react-icons/fa';
import axiosClient from '../../utils/axiosClient';
// import ReviewModal from './ReviewModal';

const ProductDetailModal = ({ isOpen, onClose, product }) => {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  
  const [selectedSize, setSelectedSize] = useState(null); 
  const [toppingSelections, setToppingSelections] = useState({});
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  // STATE MỚI: Quản lý giỏ hàng phụ của các nhóm Combo con
  const [comboSelections, setComboSelections] = useState({});

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setNote('');
      setSelectedSize(null);
      setToppingSelections({});
      
      // ĐÃ THÊM: Tự động tính toán chọn sẵn các món con mặc định khi mở Combo
      if (product.is_combo === 1 && product.combo_groups) {
        const initialComboData = {};
        product.combo_groups.forEach(group => {
            const defaults = group.items.filter(item => item.default_selected === 1);
            // Nếu không có món nào đặt mặc định, tự lấy món đầu tiên làm điểm tựa
            if (defaults.length === 0 && group.items.length > 0 && group.quantity_required === 1) {
                initialComboData[group.id] = [group.items[0]];
            } else {
                initialComboData[group.id] = defaults.slice(0, group.quantity_required);
            }
        });
        setComboSelections(initialComboData);
      } else {
        setComboSelections({});
      }
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Xử lý logic nhấp chọn món lẻ bên trong nhóm Combo
  const handleComboItemToggle = (group, item) => {
    const currentSelected = comboSelections[group.id] || [];
    const exists = currentSelected.some(i => i.food_id === item.food_id);

    if (group.quantity_required === 1) {
        // Kiểu Radio: Bấm phát nhận luôn món mới
        setComboSelections({ ...comboSelections, [group.id]: [item] });
    } else {
        // Kiểu Checkbox: Tích chọn nhiều món con
        if (exists) {
            setComboSelections({
                ...comboSelections,
                [group.id]: currentSelected.filter(i => i.food_id !== item.food_id)
            });
        } else {
            if (currentSelected.length >= group.quantity_required) {
                alert(`Bạn chỉ được chọn tối đa ${group.quantity_required} món trong phần "${group.name}" thôi nhé!`);
                return;
            }
            setComboSelections({
                ...comboSelections,
                [group.id]: [...currentSelected, item]
            });
        }
    }
  };

  const handleToppingQtyChange = (topping, delta) => {
    const currentQty = toppingSelections[topping.topping_id] || 0;
    const newQty = currentQty + delta;
    const minQty = topping.min_quantity || 0;
    const maxQty = topping.max_quantity || 5;

    if (newQty < 0) return;
    if (newQty > maxQty) {
        alert(`Bạn chỉ được chọn tối đa ${maxQty} phần ${topping.name}!`);
        return;
    }

    let finalQty = newQty;
    // Bật từ 0 lên sẽ nhảy thẳng vào minQty (nếu minQty > 1)
    if (delta > 0 && currentQty === 0 && finalQty < minQty) {
        finalQty = minQty;
    } else if (delta < 0 && currentQty === minQty && minQty > 0) {
        // Tắt từ minQty sẽ về 0
        finalQty = 0;
    }

    setToppingSelections({ ...toppingSelections, [topping.topping_id]: finalQty });
  };

  // --- HỆ THỐNG TÍNH TOÁN TIỀN PHỨC HỢP ---
  const basePrice = Number(product.base_price || product.price || 0);
  const sizePriceAdd = selectedSize ? Number(selectedSize.price_add || 0) : 0;
  
  let toppingsPrice = 0;
  let totalToppingQtySelected = 0;
  Object.entries(toppingSelections).forEach(([id, qty]) => {
      const t = product.toppings?.find(x => x.topping_id == id);
      if (t && qty > 0) {
          toppingsPrice += Number(t.price || 0) * qty;
          totalToppingQtySelected += qty;
      }
  });
  
  // Tính tổng tiền phụ thu thêm + tổng giá trị gốc của các món mua lẻ lẻ
  let comboExtraPrice = 0;
  let totalRetailPriceOfItems = 0;
  
  if (product.is_combo === 1 && product.combo_groups) {
    product.combo_groups.forEach(group => {
        const selected = comboSelections[group.id] || [];
        selected.forEach(item => {
            comboExtraPrice += Number(item.extra_price || 0);
            totalRetailPriceOfItems += Number(item.base_price || 0);
        });
    });
  }

  const unitPrice = basePrice + sizePriceAdd + toppingsPrice + comboExtraPrice;
  const totalPrice = unitPrice * quantity;

  // Tính số tiền tiết kiệm được cho người dùng thấy
  const retailTotalAcc = totalRetailPriceOfItems * quantity;
  const savingsAmount = retailTotalAcc - (basePrice + comboExtraPrice) * quantity;

  const avgRating = Number(product.avg_rating) || 0;
  const reviewCount = Number(product.review_count) || 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row relative shadow-2xl animate-in zoom-in-95 duration-300 hide-scrollbar">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-md text-gray-800 hover:bg-gray-100 hover:text-red-500 w-10 h-10 rounded-full flex items-center justify-center transition shadow-sm">
          <FaTimes size={20} />
        </button>

        <div className="w-full md:w-1/2 h-64 md:h-auto bg-gray-50 relative">
          <img src={product.image_url || product.Image_url || 'https://via.placeholder.com/600x600?text=No+Image'} alt={product.name || product.Name} className="w-full h-full object-cover" />
          {product.is_combo === 1 && (
            <div className="absolute top-4 left-4 bg-purple-600 text-white px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-wider shadow flex items-center gap-1.5">
              <FaGift/> Combo Set
            </div>
          )}
        </div>

        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col h-full">
          <div>
            <h2 className="text-3xl font-black text-gray-800 mb-2 leading-tight">{product.name || product.Name}</h2>
            
            <div className="flex items-center gap-4 mb-3">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${reviewCount > 0 ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                <FaStar className={reviewCount > 0 ? "text-yellow-500" : "text-gray-400"} size={14} />
                <span className={`text-sm font-bold ${reviewCount > 0 ? "text-yellow-700" : "text-gray-500"}`}>
                  {reviewCount > 0 ? `${avgRating.toFixed(1)} (${reviewCount} đánh giá)` : 'Chưa có đánh giá'}
                </span>
              </div>
              {/* <button onClick={() => setIsReviewModalOpen(true)} className="text-sm text-[#006a6a] font-bold hover:underline transition">
                Xem chi tiết đánh giá
              </button> */}
            </div>

            <p className="text-3xl font-black text-[#006a6a] mb-3">
              {basePrice.toLocaleString()}đ
            </p>

            {/* ĐÃ THÊM: Khu vực hiển thị bảng so sánh giá bán lẻ thúc đẩy tâm lý mua sắm */}
            {product.is_combo === 1 && totalRetailPriceOfItems > 0 && (
              <div className="text-xs font-semibold text-gray-500 bg-purple-50/50 border border-purple-100 p-3.5 rounded-[1.2rem] mb-5 space-y-1 animate-in slide-in-from-top-2">
                <p>Tổng giá nếu mua lẻ từng món: <span className="line-through text-red-400 font-bold">{retailTotalAcc.toLocaleString()}đ</span></p>
                {savingsAmount > 0 && <p className="text-purple-700 font-black flex items-center gap-1">🎉 Đặt theo Combo giúp tiết kiệm đến: {savingsAmount.toLocaleString()}đ!</p>}
              </div>
            )}

            <p className="text-gray-600 text-sm leading-relaxed mb-5 line-clamp-3">
              {product.description || product.Description || "Chưa có mô tả cho thực đơn này."}
            </p>
          </div>

          <div className="flex-grow overflow-y-auto pr-1 hide-scrollbar space-y-6">
            
            {/* 1. KHU VỰC CẤU HÌNH CÁC NHÓM MÓN TRONG COMBO (MỚI THÊM) */}
            {product.is_combo === 1 && product.combo_groups && product.combo_groups.length > 0 && (
                <div className="space-y-5 animate-in fade-in duration-300">
                    {product.combo_groups.map(group => {
                        const selectedItems = comboSelections[group.id] || [];
                        return (
                            <div key={group.id} className="bg-gray-50/70 p-4 border border-gray-100 rounded-[1.5rem] shadow-inner">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-black text-gray-800 text-sm">{group.name}</h4>
                                    <span className="text-[11px] font-black bg-purple-600 text-white px-2.5 py-0.5 rounded-full shadow-sm">
                                        Chọn {group.quantity_required} phần
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {group.items && group.items.map(item => {
                                        const isChecked = selectedItems.some(i => i.food_id === item.food_id);
                                        return (
                                            <div 
                                                key={item.food_id}
                                                onClick={() => handleComboItemToggle(group, item)}
                                                className={`flex items-center justify-between p-3 bg-white border rounded-xl cursor-pointer transition-all ${isChecked ? 'border-purple-600 bg-purple-50/30 shadow-sm' : 'border-gray-100 hover:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input 
                                                        type={group.quantity_required === 1 ? "radio" : "checkbox"} 
                                                        name={`group_radio_${group.id}`}
                                                        checked={isChecked}
                                                        onChange={() => {}} // Lắng nghe thông qua thẻ div bọc ngoài
                                                        className="w-5 h-5 text-purple-600 accent-purple-600 rounded focus:ring-purple-500" 
                                                    />
                                                    <div>
                                                        <span className={`font-bold text-sm block ${isChecked ? 'text-purple-800' : 'text-gray-700'}`}>{item.food_name}</span>
                                                        <span className="text-[11px] text-gray-400 font-medium">Giá bán lẻ: {Number(item.base_price).toLocaleString()}đ</span>
                                                    </div>
                                                </div>
                                                {Number(item.extra_price) > 0 && (
                                                    <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                                        Đổi món +{Number(item.extra_price).toLocaleString()}đ
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 2. KHU VỰC CHỌN KÍCH CỠ (RADIO) - ẨN NẾU LÀ COMBO */}
            {!product.is_combo && product.sizes && product.sizes.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Chọn Kích Cỡ <span className="text-red-500">*</span></h3>
                <div className="space-y-2">
                  <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${selectedSize === null ? 'border-[#006a6a] bg-teal-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" checked={selectedSize === null} onChange={() => setSelectedSize(null)} className="w-5 h-5 text-[#006a6a]" />
                      <span className={`font-medium ${selectedSize === null ? 'text-[#006a6a]' : 'text-gray-700'}`}>Size tiêu chuẩn</span>
                    </div>
                  </label>
                  {product.sizes.map(size => (
                    <label key={size.id} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition ${selectedSize?.id === size.id ? 'border-[#006a6a] bg-teal-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" checked={selectedSize?.id === size.id} onChange={() => setSelectedSize(size)} className="w-5 h-5 text-[#006a6a]" />
                        <span className={`font-medium ${selectedSize?.id === size.id ? 'text-[#006a6a]' : 'text-gray-700'}`}>{size.name}</span>
                      </div>
                      {Number(size.price_add) > 0 && <span className="text-sm font-semibold text-gray-500">+{Number(size.price_add).toLocaleString()}đ</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 3. KHU VỰC CHỌN TOPPING (SỐ LƯỢNG) */}
            {product.toppings && product.toppings.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Chọn Món Thêm (Tùy chọn)</h3>
                  {(product.min_toppings > 0 || product.max_toppings < 100) && (
                      <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                          Tối đa: {product.max_toppings} topping
                      </span>
                  )}
                </div>
                <div className="space-y-3">
                  {product.toppings.map(topping => {
                    const qty = toppingSelections[topping.topping_id] || 0;
                    return (
                      <div key={topping.topping_id} className={`flex items-center justify-between p-3 border rounded-xl transition ${qty > 0 ? 'border-[#006a6a] bg-teal-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <div>
                          <span className={`font-bold block ${qty > 0 ? 'text-[#006a6a]' : 'text-gray-700'}`}>{topping.name}</span>
                          {Number(topping.price) > 0 && <span className="text-sm font-semibold text-gray-500">+{Number(topping.price).toLocaleString()}đ/phần</span>}
                        </div>
                        
                        <div className="flex items-center bg-white rounded-full p-1 border border-gray-200">
                            <button type="button" onClick={() => handleToppingQtyChange(topping, -1)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:text-red-500 transition"><FaMinus size={10} /></button>
                            <span className="w-8 text-center font-black text-gray-800 text-sm">{qty}</span>
                            <button type="button" onClick={() => handleToppingQtyChange(topping, 1)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:text-[#006a6a] transition"><FaPlus size={10} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2">
              <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Ghi chú cho quán</h3>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Ít đá, nhiều hành..." className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-[#006a6a] focus:ring-1 text-sm resize-none" rows="2"></textarea>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center bg-gray-100 rounded-full p-1.5 border border-gray-200">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-600 hover:text-red-500 shadow-sm transition"><FaMinus size={12} /></button>
                <span className="w-12 text-center font-black text-lg text-gray-800">{quantity}</span>
                <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-600 hover:text-[#006a6a] shadow-sm transition"><FaPlus size={12} /></button>
              </div>

              <button 
                type="button"
                onClick={async () => {
                  try {
                    // RÀNG BUỘC KIỂM TRA: Bắt buộc chọn đủ số lượng món con trong nhóm Combo mới cho vào giỏ
                    if (product.is_combo === 1 && product.combo_groups) {
                        for (const group of product.combo_groups) {
                            const selected = comboSelections[group.id] || [];
                            if (selected.length !== group.quantity_required) {
                                alert(`Vui lòng chọn đủ ${group.quantity_required} món trong phần "${group.name}" mới có thể thêm vào giỏ hàng nhé!`);
                                return;
                            }
                        }
                    }

                    // RÀNG BUỘC KIỂM TRA TỔNG SL TOPPING
                    const minT = product.min_toppings || 0;
                    const maxT = product.max_toppings || 100;
                    if (totalToppingQtySelected < minT) {
                        alert(`Vui lòng chọn thêm Topping! Món này yêu cầu tối thiểu ${minT} phần Topping.`);
                        return;
                    }
                    if (totalToppingQtySelected > maxT) {
                        alert(`Vượt quá giới hạn Topping! Món này chỉ được chọn tối đa ${maxT} phần Topping.`);
                        return;
                    }

                    // ĐÓNG GÓI NGƯỢC KẾ THỪA: Ép các nhóm món Combo con về mảng options chung để giữ hệ thống giỏ hàng/thanh toán cũ hoạt động ổn định
                    const safeOptions = [];
                    if (selectedSize) {
                        safeOptions.push({ id: `size_${selectedSize.id}`, name: selectedSize.name, price: Number(selectedSize.price_add), quantity: 1 });
                    } else if (!product.is_combo && product.sizes && product.sizes.length > 0) {
                      safeOptions.push({ id: `size_standard`, name: 'Size tiêu chuẩn', price: 0, quantity: 1 });
                    }
                    
                    Object.entries(toppingSelections).forEach(([id, qty]) => {
                        if (qty > 0) {
                            const t = product.toppings?.find(x => x.topping_id == id);
                            if (t) safeOptions.push({ id: `topping_${t.topping_id}`, name: t.name, price: Number(t.price), quantity: qty });
                        }
                    });
                    if (product.is_combo === 1 && product.combo_groups) {
                        product.combo_groups.forEach(group => {
                            const selected = comboSelections[group.id] || [];
                            selected.forEach(item => {
                                safeOptions.push({
                                    id: `combo_item_${item.food_id}`,
                                    name: `[${group.name}] ${item.food_name}`,
                                    price: Number(item.extra_price || 0),
                                    quantity: 1
                                });
                            });
                        });
                    }
                    
                    const optionsString = safeOptions.length > 0 
                                          ? safeOptions.map(t => `${t.id}`).sort().join(',') 
                                          : 'default_options';
                    const noteString = note.trim().toLowerCase();
                    const foodId = product.id || product.Id_food;
                    const cartItemHash = `${foodId}-${optionsString}-${noteString}`; 

                    let payload = {
                        food_id: foodId,
                        quantity: quantity,
                        note: note.trim(),
                        options: safeOptions, 
                        cartItemHash: cartItemHash,
                        branch_id: null // Đã sửa: Không gửi branch_id khi thêm vào giỏ (cho phép thêm toàn cục)
                    };

                    try {
                        const response = await axiosClient.post('/cart/add', payload);                
                        if(response.success || response.message) {
                            alert('Đã thêm vào giỏ hàng thành công!');
                            onClose();
                            window.dispatchEvent(new Event("cartUpdated")); 
                        }
                    } catch (error) {
                        const errorData = error.response?.data || error;
                        alert(errorData.message || 'Lỗi: Không thể thêm vào giỏ hàng!');
                    }
                  } catch (error) { console.log(error); }
                }}
                className="flex-1 bg-[#006a6a] hover:bg-teal-700 text-white font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 transition shadow-lg"
              >
                <FaShoppingCart size={18} />
                Thêm vào giỏ • {totalPrice.toLocaleString()}đ
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* <ReviewModal
      isOpen={isReviewModalOpen}
      onClose={() => setIsReviewModalOpen(false)}
      product={product} /> */}
    </div>    
  );
};

export default ProductDetailModal;