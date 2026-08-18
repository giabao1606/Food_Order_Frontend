import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FaStar, FaPlus, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import { MdOutlineRestaurantMenu, MdFastfood, MdSmartToy } from "react-icons/md";
import { VscSettings } from "react-icons/vsc";
import axiosClient from '../../utils/axiosClient';
import ProductDetailModal from '../../components/user/ProductDetailModal';
import BranchSelectorBar from '../../components/user/BranchSelectorBar';

const HomePage = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [products, setProducts] = useState([]);
  const [showFilters, setShowFilters] = useState(false); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [banners, setBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [latestFeeds, setLatestFeeds] = useState([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const [filters, setFilters] = useState({
    price: '', 
    topRated: false,
    spicy: false,
    vegetarian: false
  });

  const handleClearAll = () => {
    setFilters({
      price: '', 
      topRated: false, 
      spicy: false,
      vegetarian: false
    });
  };

  const [categories, setCategories] = useState([]);
  
  useEffect(() => {
    document.title = "Trang chủ - Food Order";
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        // 1. Lấy ID chi nhánh khách hàng đang chọn (mặc định là 1 nếu chưa chọn)
        const branchId = localStorage.getItem('selectedBranchId') || 1;

        const [catData, prodData, bannerData, feedRes] = await Promise.all([
          axiosClient.get('/categories/active', { signal }),
          axiosClient.get('/products', { signal }),
          axiosClient.get('/banners/active', { signal }),
          axiosClient.get('/feed?limit=3', { signal }).catch(e => ({ success: false })) // Bắt lỗi để không dội Promise.all
        ]);
        
        if (Array.isArray(catData)) setCategories(catData);
        if (Array.isArray(prodData)) {
          const availableProducts = prodData.filter(p => p.Status === 'Available' || p.status === 'Available');
          setBanners(Array.isArray(bannerData) ? bannerData : []);
          setProducts(availableProducts);
        }
        if (feedRes && feedRes.success && Array.isArray(feedRes.data)) {
          setLatestFeeds(feedRes.data);
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
          console.error("Lỗi tải dữ liệu:", error);
      }
    };

    const fetchAiRecommendations = async () => {
      setIsLoadingAi(true);
      try {
          const res = await axiosClient.post('/ai/recommend', { currentTime: new Date().toISOString() }, { signal });
          if (res.success) {
              setAiRecommendations(res.data || []);
          }
      } catch (error) {
          if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
             console.error('Lỗi lấy AI Recommendation:', error);
      } finally {
          setIsLoadingAi(false);
      }
    };

    fetchData();
    fetchAiRecommendations();
      const handleBranchChange = () => fetchData();
      window.addEventListener('branchChanged', handleBranchChange);
      return () => {
          controller.abort();
          window.removeEventListener('branchChanged', handleBranchChange);
      };
    }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const slideInterval = setInterval(() => {
        setCurrentSlide(prev => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(slideInterval);
  }, [banners.length]);

  const nextSlide = () => setCurrentSlide(prev => (prev === banners.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentSlide(prev => (prev === 0 ? banners.length - 1 : prev - 1));
  
  const handleBannerClick = async (banner) => {
    // 1. Đồng bộ lấy giá trị Type in hoa để so sánh chính xác với DB
    const targetType = (banner.target_type || banner.Target_type || '').toUpperCase();
    const targetId = banner.target_id || banner.Target_id;
    const bannerId = banner.id || banner.Id_banner;
    const redirectLink = banner.redirect_link || banner.Redirect_link;

    switch (targetType) {
        case 'EXTERNAL_URL':
            if (redirectLink) {
                // Tối ưu điều hướng: Nếu là link ngoài hệ thống thì mở tab mới, ngược lại là chuyển trang nội bộ mượt mà
                if (redirectLink.startsWith('http')) {
                    window.open(redirectLink, '_blank');
                } else {
                    navigate(redirectLink); 
                }
            }
            break;
        case 'VOUCHER': {
            const token = localStorage.getItem('token');
            if (!token) {
                alert("Vui lòng đăng nhập để lưu mã giảm giá!");
                window.dispatchEvent(new Event("openAuthModal")); // Kích hoạt modal login
                return;
            }
            try {
                await axiosClient.post(`/banners/${bannerId}/interact`);
                alert("Lưu mã giảm giá thành công vào ví của bạn!");
            } catch (error) {
                alert(error.response?.data?.message || "Mã giảm giá này đã hết lượt phát hành!");
            }
            break;
        }
        case 'FOOD': {
            // 2. Sửa lại thuộc tính p.id cho khớp với bảng foods trong DB
            const targetFood = products.find(p => (p.id || p.Id_food) == targetId);
            if (targetFood) setSelectedProduct(targetFood);
            break;
        }
        case 'CATEGORY':
            // Chuyển Tab danh mục và cuộn mượt xuống phần thực đơn
            if (targetId) {
                setActiveCategory(targetId);
                window.scrollTo({ top: 550, behavior: 'smooth' });
            }
            break;
        default:
            break;
    }
  };

  // Lọc sản phẩm 
  const displayedProducts = products.filter(product => {
    const categoryId = product.category_id || product.Category_id;
    const productName = product.name || product.Name || '';
    const productPrice = product.base_price || product.Base_price || 0;
    const productDesc = product.description || product.Description || '';
    const avgRating = Number(product.avg_rating) || 0;
    const reviewCount = Number(product.review_count) || 0;
    const matchCategory = activeCategory === 'All' || categoryId === activeCategory;    
    // 2. Lọc theo từ khóa tìm kiếm
    const matchSearch = productName.toLowerCase().includes(searchTerm.toLowerCase());
    // 3. Lọc theo giá tiền
    let matchPrice = true;
    const price = Number(productPrice);
    if (filters.price === 'under-50') matchPrice = price < 50000;
    else if (filters.price === '50-100') matchPrice = price >= 50000 && price <= 100000;
    else if (filters.price === 'over-100') matchPrice = price > 100000;
    // 4. Lọc theo tùy chọn (Preferences)
    let matchPreferences = true;
    const originalText = String(productName + " " + productDesc).toLowerCase();
    if (filters.spicy) {
        matchPreferences = matchPreferences && /(^|[\s,.\-!?"'])(cay|sả ớt|ớt|chua cay)([\s,.\-!?"']|$)/.test(originalText);
    }
    if (filters.vegetarian) {
        matchPreferences = matchPreferences && /(^|[\s,.\-!?"'])(chay|rau|rau củ)([\s,.\-!?"']|$)/.test(originalText);
    }
    if (filters.topRated) {
        matchPreferences = matchPreferences && reviewCount > 0 && avgRating >= 4.5;
    }   
    return matchCategory && matchSearch && matchPrice && matchPreferences;
  }). sort((a, b)=>{
    const ratingA = Number(a.avg_rating) || 0;
    const ratingB = Number(b.avg_rating) || 0;
    if (ratingB !== ratingA) {
          return ratingB - ratingA;
      }
      const countA = Number(a.review_count) || 0;
      const countB = Number(b.review_count) || 0;
      return countB - countA;  
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-8">      
        <div className="w-full">
          
          {/* 1. Hero Banner */}
          <div className="relative w-full h-[250px] md:h-[350px] rounded-[32px] overflow-hidden shadow-lg mb-8 group bg-gray-200">
          {banners.length > 0 ? (
          <>
            <div className="relative w-full h-full flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                {banners.map((banner, index) => {
                    // ĐỒNG BỘ CÁC BIẾN TỪ DATABASE
                    const bannerId = banner.id || banner.Id_banner || index;
                    const imageUrl = banner.image_url || banner.Image_url;
                    const title = banner.title || banner.Title;
                    const targetType = (banner.target_type || banner.Target_type || '').toUpperCase();

                    return (
                        <div 
                          key={bannerId} 
                          className="w-full h-full shrink-0 relative cursor-pointer"
                          onClick={() => handleBannerClick(banner)}
                        >
                          <img 
                            src={imageUrl} 
                            alt={title} 
                            className="w-full h-full object-cover"
                          />
                        {/* Overlay Gradient nhẹ */}
                          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent"></div>
                          <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-12 text-white w-full md:w-2/3 z-10">
                             {targetType === 'VOUCHER' && (
                                 <span className="bg-orange-500 text-xs font-black px-3 py-1 rounded-full w-max mb-4 tracking-wider uppercase shadow-md">
                                     Ưu Đãi Đặc Biệt
                                 </span>
                             )}
                             <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight drop-shadow-lg line-clamp-2">
                                 {title}
                             </h1>
                             
                             <button className="mt-4 bg-[#65DDDD] hover:bg-teal-400 text-gray-900 font-bold py-2.5 px-6 rounded-full w-max flex items-center gap-2 transition shadow-lg">
                                 {targetType === 'VOUCHER' ? 'Lưu Mã Ngay' : 'Khám Phá Ngay'}
                             </button>
                          </div>
                        </div>
                    );
                })}
            </div>

            {/* Nút điều hướng (Chỉ hiện khi có nhiều hơn 1 banner) */}
            {banners.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/70 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center text-gray-800 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                    <FaChevronLeft />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/70 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center text-gray-800 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <FaChevronRight />
                </button>                    
                {/* Dấu chấm chỉ báo (Dots) */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {banners.map((_, idx) => (
                    <button 
                      key={idx} 
                      onClick={(e) => { e.stopPropagation(); setCurrentSlide(idx); }}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${currentSlide === idx ? 'bg-orange-500 w-6' : 'bg-white/60 hover:bg-white'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
        /* Fallback nếu chưa có Banner nào từ Database */
        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
          <span className="text-lg md:text-xl">Hiện tại nhà hàng chưa có chương trình đặc biệt</span>
        </div>
        )}
      </div>  

      {/* Latest Feeds Section */}
      {latestFeeds.length > 0 && (
        <div className="mb-10 w-full animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🔥</span>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-600">Tin Mới Nhất</h2>
            </div>
            <Link to="/bang-tin" className="text-[#006a6a] font-bold text-sm hover:underline flex items-center gap-1">
              Xem tất cả <FaChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestFeeds.map(post => (
                <div key={`feed-${post.id}`} className="bg-white rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full cursor-pointer" onClick={() => navigate('/bang-tin')}>
                    {post.media_url ? (
                        <div className="h-48 w-full bg-gray-100 overflow-hidden">
                            <img src={post.media_url} alt="Post cover" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                        </div>
                    ) : (
                        <div className="h-48 w-full bg-gradient-to-tr from-orange-100 to-red-50 flex items-center justify-center p-4">
                            <span className="text-4xl">📢</span>
                        </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                {post.type}
                            </span>
                            <span className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg line-clamp-2 mb-2 leading-snug">{post.title}</h3>
                        <p className="text-gray-500 text-base line-clamp-2 mt-auto" dangerouslySetInnerHTML={{ __html: post.content }}></p>
                    </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations Section */}
      {aiRecommendations.length > 0 && (
        <div className="mb-10 w-full animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-3xl">✨</span>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-blue-600">AI Gợi Ý Dành Riêng Cho Bạn</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiRecommendations.map(product => {
              const prodId = product.id || product.Id;
              const prodName = product.name || product.Name;
              const prodPrice = product.price || product.Price;
              const prodImage = product.image_url || product.Image_url;
              
              return (
                <div key={`ai-${prodId}`} className="bg-white rounded-[24px] p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex gap-4 cursor-pointer" onClick={() => {
                    const fullProduct = products.find(p => (p.id || p.Id_food) == prodId);
                    setSelectedProduct(fullProduct ? fullProduct : product);
                }}>
                  <div className="w-24 h-24 shrink-0 rounded-[16px] overflow-hidden bg-gray-50 border border-gray-100">
                    <img src={prodImage || 'https://via.placeholder.com/150'} alt={prodName} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="font-bold text-gray-800 line-clamp-1 text-sm md:text-base">{prodName}</h3>
                    <p className="text-[#006a6a] font-black mt-1">{Number(prodPrice).toLocaleString()}đ</p>
                    <div className="mt-2 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg flex items-start gap-1.5">
                      <MdSmartToy size={14} className="text-blue-500 shrink-0 mt-0.5"/> 
                      <span className="whitespace-normal leading-relaxed">{product.reason}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

          {/* 2. Category Tabs */}
          <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex gap-3">
              <button
                onClick={() => setActiveCategory('All')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all cursor-pointer border ${
                    activeCategory === 'All'
                    ? 'bg-[#65DDDD] text-white border-[#65DDDD] shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#65DDDD] hover:text-[#65DDDD]'
                }`}>
                  <MdOutlineRestaurantMenu /> All
                </button>
              {categories.map((cat) => (
                <button
                  key={cat.id || cat.Id_category}
                  onClick={() => setActiveCategory(cat.id || cat.Id_category)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all cursor-pointer border ${
                      activeCategory === (cat.id || cat.Id_category)
                      ? 'bg-[#65DDDD] text-white border-[#65DDDD] shadow-md'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#65DDDD] hover:text-[#65DDDD]'
                  }`}
                >
                  {cat.name || cat.Name}
                </button>
              ))}
            </div>
            
            {/* Nút bật tắt Filter */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold shrink-0 transition-all ${
                showFilters 
                  ? 'bg-[#65DDDD]/10 border-[#65DDDD]/30 text-[#65DDDD] shadow-sm cursor-pointer' 
                  : 'border-gray-200 text-gray-700 hover:bg-[#65DDDD]/10 cursor-pointer ' 
              }`}
            >
              <VscSettings size={18} /> Bộ lọc nâng cao
            </button>
          </div>

          {/* 3. Advanced Filters Box */}
          {showFilters && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-10 shadow-sm flex flex-col md:flex-row gap-8 mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
              
              {/* Price Range */}
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Giá tiền</h3>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="price" 
                      checked={filters.price === 'under-50'}
                      onChange={() => setFilters({ ...filters, price: 'under-50' })}
                      className="w-4 h-4 text-orange-500 focus:ring-orange-500" 
                    />
                    <span className="text-sm font-semibold text-gray-600">Dưới 50,000đ</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="price" 
                      checked={filters.price === '50-100'}
                      onChange={() => setFilters({ ...filters, price: '50-100' })}
                      className="w-4 h-4 text-orange-500 focus:ring-orange-500" 
                    />
                    <span className="text-sm font-semibold text-gray-600">50,000đ - 100,000đ</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="price" 
                      checked={filters.price === 'over-100'}
                      onChange={() => setFilters({ ...filters, price: 'over-100' })}
                      className="w-4 h-4 text-orange-500 focus:ring-orange-500" 
                    />
                    <span className="text-sm font-semibold text-gray-600">Trên 100,000đ</span>
                  </label>
                </div>
              </div>

              {/* Preferences */}
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Sở thích</h3>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={filters.topRated}
                      onChange={(e) => setFilters({ ...filters, topRated: e.target.checked })}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" 
                    />
                    <span className="text-sm font-semibold text-gray-600">Top đánh giá (4.5+)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={filters.spicy}
                      onChange={(e) => setFilters({ ...filters, spicy: e.target.checked })}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" 
                    />
                    <span className="text-sm font-semibold text-gray-600">Món Cay</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={filters.vegetarian}
                      onChange={(e) => setFilters({ ...filters, vegetarian: e.target.checked })}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" 
                    />
                    <span className="text-sm font-semibold text-gray-600">Món Chay / Rau củ</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex-1 flex flex-col justify-center gap-3 border-l pl-8 border-gray-100">
                <button 
                  onClick={() => setShowFilters(false)}
                  className="w-full bg-[#65DDDD] text-white font-bold py-2.5 rounded-xl hover:bg-[#65DDDD] transition shadow-md cursor-pointer"
                >
                    Xác nhận
                </button>
                <button 
                  onClick={handleClearAll}
                  className="w-full text-gray-500 font-semibold py-2 rounded-xl hover:bg-gray-50 transition text-sm cursor-pointer"
                >
                    Xóa sạch
                </button>
              </div>
            </div>
          )}
          
          <h2 className="text-2xl font-black text-gray-800 mb-6">Món ăn phổ biến gần bạn</h2>
          
          {displayedProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-medium bg-white rounded-2xl shadow-sm border border-gray-100">
                Chưa có món ăn nào khớp với bộ lọc hoặc danh mục này.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {displayedProducts.map((product) => {
                  const productId = product.id || product.Id_food;
                  const productName = product.name || product.Name;
                  const productPrice = product.base_price || product.Base_price || 0;
                  const productDesc = product.description || product.Description;
                  const productImg = product.image_url || product.Image_url || 'https://via.placeholder.com/400x300?text=No+Image';

                  return (
                    <div key={productId} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 group relative cursor-pointer flex flex-col"
                      onClick={() => setSelectedProduct(product)}>
                      
                      <div className="relative h-48 overflow-hidden bg-gray-100">
                        <img 
                            src={productImg} 
                            alt={productName} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                            <FaStar className={Number(product.review_count) > 0 ? "text-yellow-400" : "text-gray-300"} size={12} />
                            <span className={`text-xs font-bold ${Number(product.review_count) > 0 ? "text-gray-800" : "text-gray-500"}`}>
                                {Number(product.review_count) > 0 ? Number(product.avg_rating).toFixed(1) : 'Chưa có đánh giá'}
                            </span>
                        </div>
                      </div>

                      <div className="p-4 flex flex-col flex-grow justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{productName}</h3>
                            <p className="text-gray-500 text-xs line-clamp-2 mb-4 leading-relaxed">{productDesc}</p>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                            <span className="font-black text-lg text-gray-900">
                              {Number(productPrice).toLocaleString()} VNĐ
                            </span>
                            <button className="bg-[#65DDDD]/20 hover:bg-[#65DDDD] text-[#65DDDD] hover:text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                            <FaPlus size={14} />
                            </button>
                        </div>
                      </div>
                    </div>
                  );
              })}
            </div>
          )}
          
        </div>
      </main>
      <ProductDetailModal 
          isOpen={!!selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          product={selectedProduct}
          branchId={localStorage.getItem('selectedBranchId')} 
        />
    </div>
  );
};

export default HomePage;