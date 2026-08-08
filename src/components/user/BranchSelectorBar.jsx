import React, { useState, useEffect } from 'react';
import { MdLocationOn, MdKeyboardArrowDown, MdStorefront } from 'react-icons/md';
import axiosClient from '../../utils/axiosClient';
import Swal from 'sweetalert2';

const BranchSelectorBar = () => {
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(localStorage.getItem('selectedBranchId') || '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                // Gọi API lấy danh sách chi nhánh public (Không cần token)
                const res = await axiosClient.get('/branches');
                const data = res.data?.data || res.data || [];
                setBranches(data);
                
                // Nếu khách lần đầu vào web, chưa chọn chi nhánh -> Tự gán chi nhánh đầu tiên
                if (!selectedBranchId && data.length > 0) {
                    const defaultBranch = data[0].id;
                    setSelectedBranchId(defaultBranch);
                    localStorage.setItem('selectedBranchId', defaultBranch);
                }
            } catch (error) {
                console.error("Lỗi tải danh sách chi nhánh:", error);
            }
        };
        fetchBranches();
    }, []);

    const handleSelectBranch = async (branchId) => {
        // Cảnh báo nếu trong giỏ hàng đang có đồ của chi nhánh cũ
        const currentCartBranch = localStorage.getItem('cartBranchId'); // Giả định bạn lưu branch của giỏ hàng
        
        if (currentCartBranch && currentCartBranch !== String(branchId)) {
            const result = await Swal.fire({
                title: 'Thay đổi chi nhánh?',
                text: 'Nếu đổi sang chi nhánh mới, giỏ hàng hiện tại của bạn sẽ bị làm mới. Bạn có đồng ý không?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Đồng ý đổi',
                cancelButtonText: 'Hủy'
            });

            if (!result.isConfirmed) return;
            
            // Xóa rỗng giỏ hàng nếu đồng ý (gọi hàm clearCart từ Context của bạn ở đây nếu cần)
            localStorage.removeItem('cartBranchId'); 
            // Xóa dữ liệu giỏ hàng (Tùy thuộc vào key bạn đang dùng)
            // localStorage.removeItem('cartItems'); 
        }

        // Lưu chi nhánh mới và reload lại trang để tải lại thực đơn
        setSelectedBranchId(branchId);
        localStorage.setItem('selectedBranchId', branchId);
        setIsDropdownOpen(false);
        window.location.reload(); 
    };

    // Tìm thông tin chi nhánh đang được chọn để hiển thị
    const selectedBranch = branches.find(b => b.id === Number(selectedBranchId));

    return (
        <div className="relative z-40 bg-white border-b border-gray-200 shadow-sm">
            {/* Thanh Bar chính hiển thị phía trên Banner */}
            <div 
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                        <MdStorefront size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Đang xem thực đơn tại</p>
                        <p className="text-sm font-bold text-gray-800">
                            {selectedBranch ? selectedBranch.name : 'Đang tải chi nhánh...'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center text-red-500 font-medium text-sm gap-1 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition">
                    Thay đổi 
                    <MdKeyboardArrowDown size={20} className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Dropdown Box mở ra khi click vào thanh Bar */}
            {isDropdownOpen && (
                <div className="absolute top-full left-0 w-full bg-white shadow-2xl border-b border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <MdLocationOn className="text-red-500" size={20}/>
                            Chọn chi nhánh gần bạn nhất
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {branches.map(branch => (
                                <div 
                                    key={branch.id} 
                                    onClick={() => handleSelectBranch(branch.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                        Number(selectedBranchId) === branch.id 
                                        ? 'border-red-500 bg-red-50 shadow-md' 
                                        : 'border-gray-100 hover:border-red-300 hover:bg-red-50/50'
                                    }`}
                                >
                                    <div className="flex flex-col gap-1">
                                        <h4 className={`font-bold text-sm ${Number(selectedBranchId) === branch.id ? 'text-red-600' : 'text-gray-800'}`}>
                                            {branch.name}
                                        </h4>
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {branch.address || 'Địa chỉ đang cập nhật...'}
                                        </p>
                                        <div className="mt-2 text-[11px] font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded">
                                            Đang mở cửa
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchSelectorBar;