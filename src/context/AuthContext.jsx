import React, { createContext, useState, useEffect } from 'react';
import axiosClient from '../utils/axiosClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    useEffect(() => {
        const checkUserLoggedIn = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const data = await axiosClient.get('/users/profile');
                    if (data.success || data.user) {
                        setUser(data.user || data);
                    }
                } catch (error) {
                    console.error("Lỗi xác thực:", error);
                    localStorage.removeItem('token');
                }
            }
            setIsLoadingAuth(false);
        };
        checkUserLoggedIn();
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('token', token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('selectedBranch');
        localStorage.removeItem('userAddress');
        localStorage.removeItem('cart');
        localStorage.removeItem('userLocation'); 

        setUser(null);
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, isLoadingAuth }}>
            {children}
        </AuthContext.Provider>
    );
};