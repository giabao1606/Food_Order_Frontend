import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import { MdSearch, MdBlock, MdCheckCircle, MdAdd, MdClose, MdEdit } from 'react-icons/md';

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]); 
    const [searchTerm, setSearchTerm] = useState('');
    
    // State cho Modal Thêm/Sửa Nhân viên
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEditId, setCurrentEditId] = useState(null);
    
    const [staffForm, setStaffForm] = useState({ 
        email: '', 
        password: '', 
        full_name: '',
        role: 'STAFF', 
        branch_id: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchUsers = async (signal) => {
        try {
            const data = await axiosClient.get('/users/admin/all', { signal });
            if (Array.isArray(data)) setUsers(data);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi lấy danh sách user:", error);
        }
    };

    const fetchBranches = async (signal) => {
        try {
            const res = await axiosClient.get('/branches', { signal });
            console.log("Dữ liệu chi nhánh kiểm tra:", res); 
            
            let branchList = [];
            if (Array.isArray(res)) branchList = res;
            else if (res?.branches && Array.isArray(res.branches)) branchList = res.branches;
            else if (res?.data && Array.isArray(res.data)) branchList = res.data;
            
            setBranches(branchList);
        } catch (error) {
            if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
                console.error("Lỗi lấy danh sách chi nhánh:", error);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchUsers(controller.signal);
        fetchBranches(controller.signal);
        return () => controller.abort();
    }, []);

    const handleToggleStatus = async (user) => {
        try {
            const newStatus = user.is_active === 1 ? 0 : 1;
            const res = await axiosClient.put(`/users/admin/status/${user.id}`, { is_active: newStatus });
            if (res.success || res) {
                setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
            }
        } catch (error) {
            alert("Lỗi cập nhật trạng thái");
        }
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setCurrentEditId(null);
        setStaffForm({ email: '', password: '', full_name: '', role: 'STAFF', branch_id: '' });
        setShowStaffModal(true);
    };

    const handleEditClick = (user) => {
        setIsEditing(true);
        setCurrentEditId(user.id);
        // Đổ dữ liệu cũ vào Form
        setStaffForm({ 
            email: user.email || '', 
            password: '',
            full_name: user.full_name || '',
            role: user.role || 'STAFF', 
            branch_id: user.branch_id || ''
        });
        setShowStaffModal(true);
    };

    const handleSubmitStaff = async (e) => {
        e.preventDefault();
        
        const role = (staffForm.role || '').toUpperCase();
        if ((role === 'STAFF' || role === 'MANAGER') && !staffForm.branch_id) {
            alert('Vui lòng chọn chi nhánh làm việc cho nhân viên này!');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditing) {
                // CẬP NHẬT NHÂN VIÊN HIỆN TẠI
                const res = await axiosClient.put(`/users/admin/${currentEditId}`, staffForm);
                if (res.success || res) {
                    alert('Cập nhật nhân viên thành công!');
                    setShowStaffModal(false);
                    fetchUsers();
                }
            } else {
                // TẠO NHÂN VIÊN MỚI
                const res = await axiosClient.post('/users/admin/create-staff', staffForm);
                if (res.success || res) {
                    alert('Tạo tài khoản thành công!');
                    setShowStaffModal(false);
                    fetchUsers();
                }
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Lỗi khi lưu tài khoản');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRoleBadge = (role) => {
        const r = (role || '').toUpperCase();
        switch(r) {
            case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'MANAGER': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'STAFF': return 'bg-teal-100 text-teal-700 border-teal-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const filteredUsers = users.filter(user => 
        (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-1">Quản lý Tài khoản</h1>
                    <p className="text-sm text-gray-500">Phân quyền và điều phối nhân sự các chi nhánh</p>
                </div>
                <button 
                    onClick={openCreateModal}
                    className="bg-[#006a6a] hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-sm"
                >
                    <MdAdd size={20}/> Tạo tài khoản nhân viên
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex gap-4 bg-gray-50/50">
                    <div className="relative flex-1 max-w-md">
                        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm theo tên hoặc email..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-[#006a6a] focus:ring-1 focus:ring-[#006a6a] transition"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                <th className="p-4 pl-6 border-b font-semibold">ID</th>
                                <th className="p-4 border-b font-semibold">Người dùng</th>
                                <th className="p-4 border-b font-semibold">Vai trò</th>
                                <th className="p-4 border-b font-semibold">Chi nhánh trực thuộc</th>
                                <th className="p-4 border-b font-semibold">Trạng thái</th>
                                <th className="p-4 pr-6 border-b text-center font-semibold">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-teal-50/30 transition border-b border-gray-50 last:border-0">
                                    <td className="p-4 pl-6 font-bold text-gray-400">#{user.id}</td>
                                    <td className="p-4">
                                        <p className="font-bold text-gray-800">{user.full_name || 'Khách hàng'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${getRoleBadge(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm font-semibold text-gray-700">
                                            {user.branch_name || ((user.role||'').toUpperCase() === 'ADMIN' ? 'Tổng bộ Hệ thống' : 'Người dùng Ứng dụng')}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`flex items-center gap-1.5 text-sm font-semibold ${user.is_active === 1 ? 'text-green-600' : 'text-red-500'}`}>
                                            <span className={`w-2 h-2 rounded-full ${user.is_active === 1 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            {user.is_active === 1 ? 'Hoạt động' : 'Đã khóa'}
                                        </span>
                                    </td>
                                    <td className="p-4 pr-6 text-center flex justify-center gap-2">
                                        <button 
                                            onClick={() => handleEditClick(user)}
                                            className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 transition"
                                            title="Sửa nhân viên"
                                        >
                                            <MdEdit size={20} />
                                        </button>
                                        {user.id !== 1 && (
                                            <button 
                                                onClick={() => handleToggleStatus(user)}
                                                className={`p-2 rounded-xl transition ${user.is_active === 1 ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                                                title={user.is_active === 1 ? "Khóa tài khoản" : "Mở khóa"}
                                            >
                                                {user.is_active === 1 ? <MdBlock size={20} /> : <MdCheckCircle size={20} />}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Thêm/Sửa Nhân viên */}
            {showStaffModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0 rounded-t-2xl">
                            <h2 className="text-xl font-bold text-[#006a6a]">
                                {isEditing ? 'Sửa thông tin nhân sự' : 'Tạo tài khoản nhân sự'}
                            </h2>
                            <button onClick={() => setShowStaffModal(false)} className="text-gray-400 hover:text-red-500 transition">
                                <MdClose size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmitStaff} className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Họ và tên</label>
                                <input 
                                    type="text" required
                                    value={staffForm.full_name}
                                    onChange={(e) => setStaffForm({...staffForm, full_name: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#006a6a]"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email đăng nhập</label>
                                <input 
                                    type="email" required
                                    disabled={isEditing} // Không cho phép đổi Email khi đang sửa
                                    value={staffForm.email}
                                    onChange={(e) => setStaffForm({...staffForm, email: e.target.value})}
                                    className={`w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#006a6a] ${isEditing ? 'bg-gray-100 text-gray-500' : ''}`}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Mật khẩu {isEditing && "(Tùy chọn)"}</label>
                                <input 
                                    type="text" 
                                    minLength="4"
                                    required={!isEditing} 
                                    placeholder={isEditing ? "Bỏ trống nếu không muốn đổi mật khẩu" : "Tối thiểu 4 ký tự"}
                                    value={staffForm.password}
                                    onChange={(e) => setStaffForm({...staffForm, password: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#006a6a]"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Phân quyền (Role)</label>
                                <select 
                                    value={staffForm.role}
                                    onChange={(e) => {
                                        const newRole = e.target.value;
                                        setStaffForm({
                                            ...staffForm, 
                                            role: newRole,
                                            branch_id: (newRole === 'ADMIN') ? '' : staffForm.branch_id
                                        });
                                    }}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-white outline-none focus:border-[#006a6a]"
                                >
                                    <option value="STAFF">Nhân viên phục vụ (STAFF)</option>
                                    <option value="MANAGER">Quản lý chi nhánh (MANAGER)</option>
                                    <option value="ADMIN">Quản trị viên hệ thống (ADMIN)</option>
                                </select>
                            </div>

                            {(staffForm.role === 'STAFF' || staffForm.role === 'MANAGER') && (
                                <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Phân bổ chi nhánh <span className="text-red-500">*</span></label>
                                    <select 
                                        required
                                        value={staffForm.branch_id}
                                        onChange={(e) => setStaffForm({...staffForm, branch_id: e.target.value})}
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-white outline-none focus:border-[#006a6a]"
                                    >
                                        <option value="" disabled>-- Chọn chi nhánh làm việc --</option>
                                        {branches.map((branch, index) => {
                                            // Xử lý chống lỗi phân biệt chữ hoa/thường từ backend trả về
                                            const branchId = branch.id || branch.Id_branch;
                                            const branchName = branch.name || branch.Name || branch.branch_name;
                                            if (!branchId) return null;
                                            return (
                                                <option key={branchId || index} value={branchId}>
                                                    {branchName}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}

                            <button 
                                type="submit" disabled={isSubmitting}
                                className="w-full bg-[#006a6a] hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shrink-0 mt-2"
                            >
                                {isSubmitting ? 'Đang lưu...' : (isEditing ? 'Cập nhật nhân viên' : 'Xác nhận tạo tài khoản')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default UserManagementPage;