import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import Swal from 'sweetalert2';

const RecipeBOMModal = ({ isOpen, onClose, food }) => {
    const [ingredients, setIngredients] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [selectedIngredient, setSelectedIngredient] = useState('');
    const [quantityRequired, setQuantityRequired] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && food) {
            fetchIngredients();
            fetchFoodRecipes();
            // Reset form khi mở modal mới
            setSelectedIngredient('');
            setQuantityRequired('');
        }
    }, [isOpen, food]);

    const fetchIngredients = async () => {
        try {
            const res = await axiosClient.get('/ingredients');
            const data = res.data?.data || res.data || res;
            setIngredients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Lỗi tải nguyên liệu', error);
        }
    };

    const fetchFoodRecipes = async () => {
        try {
            const res = await axiosClient.get(`/recipes/food/${food.id}`);
            const data = res.data?.data || res.data || res;
            setRecipes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Lỗi tải công thức', error);
        }
    };

    const handleAddIngredient = async (e) => {
        e.preventDefault();
        if (!selectedIngredient || !quantityRequired) return;

        setIsLoading(true);
        try {
            // Nhờ Backend xử lý sẵn logic Upsert (Có thì Update, không thì Insert)
            await axiosClient.post('/recipes', {
                food_id: food.id,
                ingredient_id: selectedIngredient,
                quantity_required: quantityRequired
            });
            
            Swal.fire({
                title: 'Thành công', 
                text: 'Đã lưu định lượng nguyên liệu', 
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            
            setSelectedIngredient('');
            setQuantityRequired('');
            fetchFoodRecipes(); 
        } catch (error) {
            Swal.fire('Lỗi', error.response?.data?.message || 'Không thể lưu định lượng', 'error');
        }
        setIsLoading(false);
    };

    // --- THÊM HÀM XỬ LÝ KHI BẤM NÚT SỬA ---
    const handleEditClick = (recipe) => {
        setSelectedIngredient(recipe.ingredient_id);
        setQuantityRequired(recipe.quantity_required);
    };

    const handleDeleteRecipe = async (foodId, ingredientId) => {
        if (!window.confirm('Bạn có chắc muốn xóa nguyên liệu này khỏi công thức?')) return;
        try {
            await axiosClient.delete(`/recipes/${foodId}/${ingredientId}`);
            fetchFoodRecipes(); 
            // Nếu đang sửa món vừa xóa thì reset form
            if (selectedIngredient === ingredientId) {
                setSelectedIngredient('');
                setQuantityRequired('');
            }
        } catch (error) {
            Swal.fire('Lỗi', 'Không thể xóa nguyên liệu', 'error');
        }
    };

    // Kiểm tra xem ID đang chọn có nằm trong danh sách đã có chưa để đổi tên nút
    const isEditing = recipes.some(r => r.ingredient_id === Number(selectedIngredient));

    if (!isOpen || !food) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[#006a6a]">Định lượng: {food.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500 font-bold text-2xl">&times;</button>
                </div>

                <form onSubmit={handleAddIngredient} className={`${isEditing ? 'bg-orange-50 border-orange-200' : 'bg-blue-50/50 border-blue-100'} border p-4 rounded-lg mb-6 flex flex-wrap gap-3 items-end shadow-sm transition-colors`}>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            {isEditing ? 'Đang sửa nguyên liệu' : 'Chọn nguyên liệu'}
                        </label>
                        <select 
                            className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-[#006a6a]"
                            value={selectedIngredient}
                            onChange={(e) => setSelectedIngredient(e.target.value)}
                            required
                            disabled={isEditing} // Đang sửa thì không cho đổi nguyên liệu
                        >
                            <option value="">-- Chọn --</option>
                            {ingredients.map(ing => (
                                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-40">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Số lượng tiêu hao</label>
                        <input 
                            type="number"
                            step="0.01" 
                            min="0.01"
                            className="w-full border border-gray-300 rounded-md p-2 outline-none focus:border-[#006a6a]"
                            value={quantityRequired}
                            onChange={(e) => setQuantityRequired(e.target.value)}
                            placeholder="VD: 0.2"
                            required
                        />
                    </div>
                    <div className="flex gap-2">
                        {isEditing && (
                            <button 
                                type="button" 
                                onClick={() => { setSelectedIngredient(''); setQuantityRequired(''); }}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 font-medium transition"
                            >
                                Hủy
                            </button>
                        )}
                        <button type="submit" disabled={isLoading} className={`${isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#006a6a] hover:bg-teal-700'} text-white px-5 py-2 rounded-md h-10 font-medium transition disabled:opacity-50`}>
                            {isLoading ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Thêm vào')}
                        </button>
                    </div>
                </form>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-200 text-sm text-gray-600">
                                <th className="p-3 font-semibold">Nguyên liệu</th>
                                <th className="p-3 font-semibold text-center">Đơn vị</th>
                                <th className="p-3 font-semibold text-center">Tiêu hao</th>
                                <th className="p-3 font-semibold text-center">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {recipes.length === 0 ? (
                                <tr><td colSpan="4" className="text-center p-6 text-gray-500 italic">Món ăn này chưa có công thức nguyên liệu nào.</td></tr>
                            ) : (
                                recipes.map(recipe => (
                                    <tr key={`${recipe.food_id}_${recipe.ingredient_id}`} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                        <td className="p-3 font-medium text-gray-800">{recipe.ingredient_name}</td>
                                        <td className="p-3 text-center text-gray-600">{recipe.unit}</td>
                                        <td className="p-3 text-center text-[#006a6a] font-bold text-base">{recipe.quantity_required}</td>
                                        <td className="p-3 text-center flex justify-center gap-2">
                                            {/* --- NÚT SỬA --- */}
                                            <button 
                                                onClick={() => handleEditClick(recipe)} 
                                                className="text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition"
                                            >
                                                Sửa
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteRecipe(recipe.food_id, recipe.ingredient_id)} 
                                                className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                                            >
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RecipeBOMModal;