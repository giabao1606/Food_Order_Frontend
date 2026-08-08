// File: src/pages/staff/BranchMenuStatusPage.jsx
import React, { useState, useEffect } from 'react';
import { FaSearch, FaUtensils, FaCircle, FaToggleOn, FaToggleOff, FaStore } from 'react-icons/fa';
import axiosClient from '../../utils/axiosClient';

const BranchMenuStatusPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [branchInfo, setBranchInfo] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async (branchId) => {
      setIsLoading(true);
      try {
        const catRes = await axiosClient.get('/categories', { signal });
        setCategories(catRes.data || catRes);
        const prodRes = await axiosClient.get(`/products?branch_id=${branchId}`, { signal });
        
        const mappedProducts = (prodRes.data || prodRes).map(item => ({
          ...item,
          is_available_in_branch: item.is_available_local !== undefined ? item.is_available_local : 1
        }));
        
        setProducts(mappedProducts);
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
            console.error("Lỗi khi tải dữ liệu thực đơn chi nhánh:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const initializePage = async () => {
      const userStr = localStorage.getItem('user');
      let currentBranchId = 1;
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.branch_id) {
            currentBranchId = user.branch_id;
        }        
        try {
          const branchRes = await axiosClient.get(`/branches/${currentBranchId}`, { signal });
          const branchData = branchRes.data?.data || branchRes.data;          
          setBranchInfo({
            id: currentBranchId,
            name: branchData?.name || branchData?.Name || `Chi nhánh ${currentBranchId}`
          });
        } catch (error) {
          if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
            console.error("Lỗi khi lấy thông tin chi nhánh:", error);
          setBranchInfo({ id: currentBranchId, name: `Chi nhánh ${currentBranchId}` });
        }
      }
      fetchData(currentBranchId);
    };

    initializePage();
    return () => controller.abort();
  }, []);

  const handleToggleStatus = async (productId, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    
    setProducts(prevProducts =>
      prevProducts.map(p => p.id === productId ? { ...p, is_available_in_branch: newStatus } : p)
    );

    try {
      // Gọi API cập nhật trạng thái kho của chi nhánh
      await axiosClient.put(`/products/branch-status/${productId}`, {
        status: newStatus,
        branch_id: branchInfo?.id || 1
      });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái món ăn:", error);
      alert("Không thể cập nhật trạng thái món ăn lúc này. Vui lòng thử lại!");
      // Rollback lại trạng thái cũ trên UI nếu API báo lỗi
      setProducts(prevProducts =>
        prevProducts.map(p => p.id === productId ? { ...p, is_available_in_branch: currentStatus } : p)
      );
    }
  };

  // Lọc sản phẩm theo Ô tìm kiếm và Tabs Danh mục
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'ALL' || product.category_id === Number(selectedCategory);
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* THANH HEADER THÔNG TIN CHI NHÁNH */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <FaUtensils className="text-[#006a6a]" /> BẢNG KIỂM SOÁT THỰC ĐƠN NỘI BỘ
            </h1>
            <p className="text-gray-500 text-sm mt-1">Cập nhật nhanh tình trạng nguyên liệu kho lên hệ thống ứng dụng khách hàng</p>
          </div>
          <div className="bg-teal-50 border border-teal-100 text-[#006a6a] px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm">
            <FaStore /> {branchInfo?.name || "Chi Nhánh Hồ Chí Minh"}
          </div>
        </div>

        {/* Ô TÌM KIẾM VÀ LỌC MÓN ĂN */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
          <div className="relative w-full md:w-96">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm món ăn cần bật/tắt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#006a6a] focus:ring-2 focus:ring-[#006a6a]/10 transition"
            />
          </div>

          {/* TABS DANH MỤC */}
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm shrink-0 transition ${selectedCategory === 'ALL' ? 'bg-[#006a6a] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'}`}
            >
              Tất cả món
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id.toString())}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm shrink-0 transition ${selectedCategory === cat.id.toString() ? 'bg-[#006a6a] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-[#006a6a] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-gray-500">Đang đồng bộ thực đơn chi nhánh...</p>
          </div>
        ) : (
          /* DANH SÁCH MÓN ĂN */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => {
                const isAvailable = product.is_available_in_branch === 1;
                return (
                  <div 
                    key={product.id} 
                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm flex flex-col justify-between ${isAvailable ? 'border-gray-100' : 'border-red-200 bg-red-50/10'}`}
                  >
                    {/* Ảnh và Badge trạng thái */}
                    <div className="relative h-44 w-full bg-gray-50">
                      <img 
                        src={product.image_url || 'https://via.placeholder.com/400x300?text=No+Image'} 
                        alt={product.name} 
                        className={`w-full h-full object-cover transition-all ${isAvailable ? '' : 'grayscale opacity-60'}`}
                      />
                      <div className="absolute top-3 left-3">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black tracking-wide uppercase flex items-center gap-1.5 shadow-sm ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <FaCircle size={8} className={isAvailable ? 'text-green-500' : 'text-red-500'} />
                          {isAvailable ? 'Còn món' : 'Tạm hết'}
                        </span>
                      </div>
                    </div>

                    {/* Chi tiết món ăn */}
                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div className="mb-4">
                        <h3 className={`font-bold text-[17px] leading-tight mb-1 ${isAvailable ? 'text-gray-800' : 'text-gray-500 line-through'}`}>
                          {product.name}
                        </h3>
                        <p className="text-sm font-black text-[#006a6a]">
                          {Number(product.base_price).toLocaleString()}đ
                        </p>
                      </div>

                      {/* KHU VỰC THÀNH PHẦN ĐIỀU KHIỂN SỐNG */}
                      <div className={`flex items-center justify-between pt-4 border-t ${isAvailable ? 'border-gray-50' : 'border-red-100'}`}>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái bếp</span>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(product.id, product.is_available_in_branch)}
                          className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
                        >
                          {isAvailable ? (
                            <FaToggleOn size={45} className="text-[#006a6a]" />
                          ) : (
                            <FaToggleOff size={45} className="text-gray-300" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 font-medium">
                📭 Không tìm thấy món ăn nào phù hợp với bộ lọc.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchMenuStatusPage;