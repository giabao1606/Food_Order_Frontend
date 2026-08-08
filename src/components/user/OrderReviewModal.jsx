import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import Swal from 'sweetalert2';

const OrderReviewModal = ({ isOpen, onClose, order, onSuccess }) => {
    // Khởi tạo state dạng mảng rỗng để chống lỗi crash
    const [reviews, setReviews] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dùng useEffect để nạp dữ liệu món ăn vào state an toàn khi mở Modal
    useEffect(() => {
        if (order && order.items) {
            setReviews(
                order.items.map(item => ({ 
                    food_id: item.food_id || item.Food_id, 
                    food_name: item.food_name || item.Food_name || item.name, 
                    rating: 5, 
                    comment: '' 
                }))
            );
        }
    }, [order]);

    // Bức tường bảo vệ: Nếu không có order thì không render gì cả
    if (!isOpen || !order) return null;

    // Bắt ID order an toàn
    const orderId = order.id || order.Id_order;

    const handleRatingChange = (index, rating) => {
        const newReviews = [...reviews];
        newReviews[index].rating = rating;
        setReviews(newReviews);
    };

    const handleCommentChange = (index, comment) => {
        const newReviews = [...reviews];
        newReviews[index].comment = comment;
        setReviews(newReviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Gửi mảng đánh giá lên Server
            await axiosClient.post(`/orders/${orderId}/reviews`, { reviews });
            
            Swal.fire('Cảm ơn bạn!', 'Đánh giá của bạn đã được ghi nhận.', 'success');
            if (onSuccess) onSuccess(); 
            onClose();
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi!', error.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">Đánh giá đơn hàng #{orderId}</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-red-500 hover:text-white transition-colors font-bold text-lg">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 max-h-[75vh] overflow-y-auto">
                    <h3 className="font-bold text-lg mb-4 text-[#006a6a]">Đánh giá các món trong đơn hàng</h3>
                    
                    {reviews.map((review, index) => (
                        <div key={index} className="mb-6 pb-6 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
                            <p className="font-semibold text-gray-800 mb-2 text-base flex items-center gap-2">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                {review.food_name}
                            </p>
                            
                            <div className="flex space-x-2 mb-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <svg 
                                        key={star} 
                                        onClick={() => handleRatingChange(index, star)}
                                        className={`w-8 h-8 cursor-pointer transition-colors ${star <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`} 
                                        fill="currentColor" 
                                        viewBox="0 0 20 20"
                                    >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                    </svg>
                                ))}
                            </div>
                            
                            <textarea 
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:border-[#006a6a] focus:outline-none transition-colors resize-none"
                                rows="2"
                                placeholder="Hãy chia sẻ cảm nhận của bạn về món ăn này nhé..."
                                value={review.comment}
                                onChange={(e) => handleCommentChange(index, e.target.value)}
                            ></textarea>
                        </div>
                    ))}

                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Để sau</button>
                        <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-[#006a6a] text-white rounded-xl font-bold hover:bg-teal-700 transition-colors disabled:opacity-70 flex items-center justify-center">
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : 'Gửi Đánh Giá'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrderReviewModal;