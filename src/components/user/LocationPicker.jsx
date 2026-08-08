import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const LocationPicker = ({ onConfirmAddress }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const typingTimeoutRef = useRef(null);
    const abortControllerRef = useRef(null); // Thêm cờ hủy Request

    const TRACKASIA_API_KEY = import.meta.env.VITE_TRACKASIA_API_KEY;

    // Dọn dẹp bộ nhớ và ngắt kết nối dở dang khi tắt Component
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, []);

    const handleSearch = (text) => {
        setQuery(text);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (text.length < 3) {
            setSuggestions([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        typingTimeoutRef.current = setTimeout(async () => {
            // 1. Tiêu diệt request cũ đang bay giữa chừng để tránh ghi đè dữ liệu
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            
            // 2. Tạo phiên điều khiển mới
            abortControllerRef.current = new AbortController();

            try {
                const res = await axios.get(`https://maps.track-asia.com/api/v1/autocomplete`, {
                    params: { text, api_key: TRACKASIA_API_KEY },
                    signal: abortControllerRef.current.signal // Cắm cờ hủy vào axios
                });
                setSuggestions(res.data.features || []);
            } catch (error) {
                // Nếu lỗi là do chúng ta chủ động hủy request, không làm gì cả
                if (axios.isCancel(error) || error.name === 'CanceledError') {
                    console.log('Đã hủy request cũ');
                } else {
                    console.error('Lỗi lấy dữ liệu TrackAsia:', error);
                    setSuggestions([]);
                }
            } finally {
                setIsLoading(false);
            }
        }, 400); // Rút ngắn xuống 400ms để nhạy bén hơn
    };

    const handleSelectLocation = async (feature) => {
        setQuery(feature.properties.label);
        setSuggestions([]);
        setIsLoading(true);
        setErrorMsg('');

        try {
            const [lng, lat] = feature.geometry.coordinates;
            
            const mockBackendResponse = { distance: 12, branchId: null }; 

            if (mockBackendResponse.distance > 10) {
                setErrorMsg("Rất tiếc, địa chỉ nhận hàng của bạn hiện nằm ngoài bán kính phục vụ (10km) của các chi nhánh. Hệ thống hy vọng sẽ sớm được phục vụ bạn ở một khu vực gần hơn trong tương lai! Bạn có muốn thay đổi địa chỉ nhận hàng không?");
            } else {
                onConfirmAddress({
                    address: feature.properties.label,
                    lat,
                    lng,
                    branchId: mockBackendResponse.branchId
                });
            }
        } catch (error) {
            setErrorMsg("Có lỗi xảy ra khi tính toán vị trí. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full max-w-lg mx-auto">
            <input
                type="text"
                placeholder="Nhập địa chỉ nhận hàng của bạn..."
                className="w-full border-2 border-gray-300 rounded-lg p-3 pr-10 focus:outline-none focus:border-orange-500"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
            />
            {isLoading && <span className="absolute right-3 top-3 text-sm text-gray-400">Đang tìm...</span>}

            {errorMsg && (
                <div className="mt-3 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
                    {errorMsg}
                </div>
            )}

            {suggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((feature, index) => (
                        <li 
                            // Dùng ID thật thay vì index để React không đập đi xây lại thẻ HTML
                            key={feature.properties?.id || `loc-${index}`}
                            className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 transition-colors"
                            onClick={() => handleSelectLocation(feature)}
                        >
                            <span className="font-medium text-gray-800">{feature.properties.name}</span>
                            <br />
                            <span className="text-sm text-gray-500">{feature.properties.label}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LocationPicker;