import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');

  if (!token || !userString) {
    alert("Bạn cần đăng nhập để truy cập khu vực này!");
    return <Navigate to="/" replace />;
  }

  try {
    const user = JSON.parse(userString);    
    const userRole = user.role ? user.role.toUpperCase() : '';

    // Kiểm tra xem Role của user có nằm trong danh sách được phép không
    if (allowedRoles.includes(userRole)) {
      return children;
    }

    alert(`Quyền truy cập bị từ chối! Khu vực này không dành cho tài khoản ${userRole}.`);
    return <Navigate to="/" replace />;

  } catch (error) {
    console.error("Lỗi xác thực quyền ở FE:", error);
    localStorage.clear();
    return <Navigate to="/" replace />;
  }
};

export default AdminProtectedRoute;