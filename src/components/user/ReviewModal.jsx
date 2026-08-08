import React, { useState, useEffect } from 'react';
import { FaTimes, FaStar } from 'react-icons/fa';
import axiosClient from '../../utils/axiosClient';

const ReviewModal = ({ isOpen, onClose, product }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && product) {
            fecthReviews();
        }
    }, [isOpen, product]);

    const fecthReviews = async () => {
        setLoading(true);
        try {
            const response = await axiosClient.get(`/products/${product.id}/reviews`);
            if (response.success) {
                setReviews(response.reviews|| []);
            }
        } catch (error) {
            console.error('Lỗi khi tải bình luận:', error);
        } finally {
            setLoading(false);
        }
    };
    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* Vùng tối click để đóng */}
            <div className="absolute inset-0" onClick={onClose}></div>
            
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 z-10">
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                    <div>
                        <h3 className="font-black text-lg text-gray-800">Đánh giá khách hàng</h3>
                        <p className="text-sm text-gray-500">{product.name || product.Name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 bg-white hover:bg-red-50 p-2 rounded-full transition shadow-sm">
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Body: Danh sách bình luận */}
                <div className="overflow-y-auto p-5 flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="w-8 h-8 border-4 border-gray-300 border-t-[#006a6a] rounded-full animate-spin"></div>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <FaStar size={32} className="mx-auto mb-3 text-gray-200" />
                            <p>Chưa có đánh giá nào cho món ăn này.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((rv, index) => (
                                <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-sm text-gray-800">{rv.full_name || 'Khách hàng'}</span>
                                        <span className="text-xs text-gray-400">{new Date(rv.created_at).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mb-2">
                                        {[...Array(5)].map((_, i) => (
                                            <FaStar key={i} size={12} className={i < rv.rating ? "text-yellow-500" : "text-gray-300"} />
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-700">{rv.comment}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );            
};

export default ReviewModal;