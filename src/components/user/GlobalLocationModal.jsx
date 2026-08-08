import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaTimes, FaMapMarkerAlt, FaLocationArrow, FaStore, FaCheckCircle } from 'react-icons/fa';
import axiosClient from '../../utils/axiosClient';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const GlobalLocationModal = ({ isOpen, onClose }) => {
    // Trạng thái chung
    const [step, setStep] = useState(1); // 1: Bản đồ, 2: Chọn chi nhánh
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Dữ liệu vị trí
    const [address, setAddress] = useState('Đang lấy vị trí của bạn...');
    const [coords, setCoords] = useState(null); // { lat, lng }
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);

    // Dữ liệu chi nhánh
    const [branches, setBranches] = useState([]);

    // Refs cho bản đồ và xử lý mạng
    const mapContainer = useRef(null);
    const mapInstance = useRef(null);
    const typingTimeoutRef = useRef(null);
    const abortControllerRef = useRef(null); 

    const TRACKASIA_API_KEY = import.meta.env.VITE_TRACKASIA_API_KEY;

    // 0. Dọn dẹp memory leak khi tắt Component
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, []);

    // 1. Reset state khi đóng/mở Modal
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setCoords(null);
            setAddress('');
            setSearchQuery('');
            setBranches([]);
        } else if (!localStorage.getItem('userLocation')) {
            // Xin quyền vị trí khi mở
            requestGeolocation();
        }
    }, [isOpen]);

    // 2. Hàm xin quyền vị trí
    const requestGeolocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCoords({ lat: latitude, lng: longitude });
                    fetchAddressFromCoords(latitude, longitude);
                },
                (error) => {
                    console.log("Từ chối định vị, set mặc định TP.HCM", error);
                    // Mặc định chợ Bến Thành, TP.HCM nếu từ chối
                    const defaultLat = 10.7725;
                    const defaultLng = 106.698;
                    setCoords({ lat: defaultLat, lng: defaultLng });
                    fetchAddressFromCoords(defaultLat, defaultLng);
                }
            );
        }
    };

    // 3. Khởi tạo bản đồ (Sử dụng CartoDB Voyager để chống lỗi 404)
    useEffect(() => {
        let timer;
        if (isOpen && step === 1 && coords && mapContainer.current && !mapInstance.current) {
            timer = setTimeout(() => {
                if (!mapContainer.current) return;

                mapInstance.current = new maplibregl.Map({
                    container: mapContainer.current,
                    // Dùng CartoDB Voyager (Miễn phí, không cần API Key, cực mượt)
                    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
                    center: [coords.lng, coords.lat],
                    zoom: 16,
                });

                mapInstance.current.on('load', () => {
                    mapInstance.current.resize();
                });

                // Lắng nghe sự kiện kéo bản đồ
                mapInstance.current.on('dragend', () => {
                    const center = mapInstance.current.getCenter();
                    setCoords({ lat: center.lat, lng: center.lng });
                    fetchAddressFromCoords(center.lat, center.lng);
                });
            }, 150);
        }

        // Cleanup bản đồ
        return () => {
            if (timer) clearTimeout(timer);
            if (mapInstance.current && (!isOpen || step !== 1)) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [isOpen, step, coords]); 

    // 4. API Reverse Geocoding (Lấy tên đường từ tọa độ)
    const fetchAddressFromCoords = async (lat, lng) => {
        try {
            const response = await axios.get(`https://maps.track-asia.com/api/v1/reverse`, {
                params: {
                    'point.lat': lat,
                    'point.lon': lng,
                    api_key: TRACKASIA_API_KEY
                }
            });
            if (response.data.features && response.data.features.length > 0) {
                const currentAddress = response.data.features[0].properties.label;
                setAddress(currentAddress);
                setSearchQuery(currentAddress);
            }
        } catch (error) {
            console.error("Lỗi lấy địa chỉ ngược:", error);
        }
    };

    // 5. Tìm kiếm địa chỉ có áp dụng Debounce & AbortController
    const handleSearch = async (text) => {
        setSearchQuery(text);
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        if (text.length < 3) {
            setSuggestions([]);
            setIsSearching(false);
            return;
        }
        
        setIsSearching(true);

        typingTimeoutRef.current = setTimeout(async () => {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            abortControllerRef.current = new AbortController();

            try {
                const response = await axios.get(`https://maps.track-asia.com/api/v1/autocomplete`, {
                    params: { text: text, key: TRACKASIA_API_KEY },
                    signal: abortControllerRef.current.signal
                });
                setSuggestions(response.data.features || []);
            } catch (error) {
                if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
                    setSuggestions([]);
                }
            } finally {
                setIsSearching(false);
            }
        }, 400);
    };

    // 6. Khi chọn 1 địa chỉ từ gợi ý
    const handleSelectSuggestion = (feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        setCoords({ lat, lng });
        setAddress(feature.properties.label);
        setSearchQuery(feature.properties.label);
        setSuggestions([]);

        if (mapInstance.current) {
            mapInstance.current.flyTo({ center: [lng, lat], zoom: 16 });
        }
    };

    // 7. Gọi API Backend để xác nhận vị trí
    const handleConfirmAddress = async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            const response = await axiosClient.post('/shipping/check-distance', { 
                lat: coords.lat, 
                lng: coords.lng 
            });

            console.log("Dữ liệu chi nhánh từ Backend trả về:", response);

            if (response.success === false) {
                setErrorMsg(response.message || "Rất tiếc, vị trí này nằm ngoài phạm vi giao hàng.");
                return;
            }

            let fetchedBranches = response.branches || response.data;

            if (!Array.isArray(fetchedBranches)) {
                const branchObj = response.branch || response.data?.branch || response;
                fetchedBranches = [
                    { 
                        id: branchObj.branch_id || branchObj.id || branchObj.Id_branch || response.branch_id, 
                        name: branchObj.branch_name || branchObj.name || branchObj.Name || branchObj.Branch_name || response.branch_name, 
                        address: branchObj.branch_address || branchObj.address || branchObj.Address || branchObj.Branch_address || response.branch_address, 
                        distance: branchObj.distance || branchObj.Distance || response.distance 
                    }
                ];
            }

            if (!fetchedBranches || fetchedBranches.length === 0 || !fetchedBranches[0].id) {
                setErrorMsg("Hiện tại chưa có chi nhánh nào khả dụng.");
                return;
            }

            setBranches(fetchedBranches);
            setStep(2); 

        } catch (error) {
            console.error("Lỗi:", error);
            setErrorMsg(error.response?.data?.message || "Lỗi kết nối đến máy chủ. Không thể tải danh sách chi nhánh.");
        } finally {
            setIsLoading(false);
        }
    };

    // 8. Khi người dùng click chọn 1 chi nhánh
    const handleSelectBranch = (branch) => {
        if (branch.distance > 10) {
            setErrorMsg("Rất tiếc, chi nhánh này nằm ngoài bán kính phục vụ (10km).");
            return;
        }

        const locationData = {
            address: address, 
            lat: coords.lat,
            lng: coords.lng,
            branch_id: branch.id, 
            distance_km: branch.distance
        };
        
        localStorage.setItem('userLocation', JSON.stringify(locationData));
        window.dispatchEvent(new Event("locationUpdated"));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg relative shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-[#006a6a]">
                            {step === 1 ? <FaMapMarkerAlt size={20} /> : <FaStore size={20} />}
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">
                            {step === 1 ? 'Xác nhận vị trí giao hàng' : 'Chọn chi nhánh phục vụ'}
                        </h2>
                    </div>
                    {localStorage.getItem('userLocation') && (
                        <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                            <FaTimes size={18} />
                        </button>
                    )}
                </div>

                {/* Body - Step 1: Bản đồ */}
                {step === 1 && (
                    <div className="flex flex-col relative flex-grow">
                        {/* Thanh tìm kiếm */}
                        <div className="absolute top-4 left-4 right-4 z-10">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <FaLocationArrow className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Tìm địa chỉ..."
                                    className="w-full p-3 pl-12 pr-10 bg-white border border-gray-200 shadow-md rounded-xl outline-none focus:ring-2 focus:ring-[#006a6a]/50"
                                />
                                {isSearching && <div className="absolute right-3 top-3 text-xs text-gray-400">Đang tìm...</div>}
                                
                                {suggestions.length > 0 && (
                                    <ul className="absolute mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {suggestions.map((feature, index) => (
                                            <li
                                                key={feature.properties?.id || index}
                                                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 flex items-start gap-2"
                                                onClick={() => handleSelectSuggestion(feature)}
                                            >
                                                <FaMapMarkerAlt className="text-gray-400 mt-1 shrink-0" size={14} />
                                                <div>
                                                    <span className="font-bold text-sm text-gray-800 block">{feature.properties.name}</span>
                                                    <span className="text-xs text-gray-500 line-clamp-1">{feature.properties.label}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Container Bản đồ */}
                        <div className="relative w-full h-[400px] bg-gray-100">
                            <div ref={mapContainer} className="w-full h-full" />
                            
                            {/* Ghim định vị ở giữa bản đồ */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
                                <div className="text-black bg-white rounded-full p-2 shadow-lg border border-gray-100">
                                    <FaMapMarkerAlt size={28} className="text-black" />
                                </div>
                            </div>
                        </div>

                        {/* Phần xác nhận */}
                        <div className="p-4 bg-white border-t z-10">
                            <p className="text-sm text-gray-500 mb-1">Giao đến:</p>
                            <p className="font-medium text-gray-800 line-clamp-2 mb-4 h-10">{address}</p>
                            
                            <button 
                                onClick={handleConfirmAddress}
                                disabled={isLoading || !coords}
                                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition flex justify-center items-center gap-2 active:scale-[0.98]"
                            >
                                {isLoading ? <span className="animate-pulse">Đang kiểm tra chi nhánh...</span> : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Body - Step 2: Danh sách chi nhánh */}
                {step === 2 && (
                    <div className="p-4 bg-gray-50 flex flex-col flex-grow overflow-y-auto max-h-[500px]">
                        <div className="mb-4">
                            <p className="text-sm text-gray-600">Địa chỉ nhận hàng:</p>
                            <p className="font-medium text-gray-900 bg-white p-3 rounded-xl border border-gray-200 mt-1 flex justify-between items-center shadow-sm">
                                <span className="line-clamp-1 truncate pr-2">{address}</span>
                                <button onClick={() => setStep(1)} className="text-blue-600 text-sm font-bold shrink-0 hover:underline">Sửa</button>
                            </p>
                        </div>

                        <h3 className="font-bold text-gray-800 mb-3">Vui lòng chọn chi nhánh phục vụ:</h3>
                        
                        {errorMsg && (
                            <div className="mb-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                                {errorMsg}
                            </div>
                        )}

                        <div className="space-y-3">
                            {branches.map((branch, index) => (
                                <div 
                                    key={branch.id || index} 
                                    onClick={() => handleSelectBranch(branch)}
                                    className="bg-white p-4 rounded-xl border border-gray-200 hover:border-[#006a6a] hover:shadow-md cursor-pointer transition flex justify-between items-center group"
                                >
                                    <div className="pr-3">
                                        <h4 className="font-bold text-gray-800 group-hover:text-[#006a6a] transition">
                                            {branch.name || branch.Name || `Chi nhánh #${branch.id}`}
                                        </h4>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                            {branch.address || branch.Address || 'Đang cập nhật địa chỉ...'}
                                        </p>
                                        {branch.distance && (
                                            <p className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md mt-2 w-fit">
                                                Cách bạn: {Number(branch.distance).toFixed(1)} km
                                            </p>
                                        )}
                                    </div>
                                    <FaCheckCircle className="text-gray-200 group-hover:text-[#006a6a] transition shrink-0" size={24} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalLocationModal;