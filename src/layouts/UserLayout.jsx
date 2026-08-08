import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/user/Header';
import Footer from '../components/user/Footer';
import AuthModal from '../components/user/AuthModal';
import CartDrawer from '../components/user/CartDrawer';
import GlobalLocationModal from '../components/user/GlobalLocationModal';
import AiChatbot from '../components/AiChatbot';
import axiosClient from '../utils/axiosClient';

const UserLayout = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authType, setAuthType] = useState('login');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const handleOpenAuth = (type) => {
    setAuthType(type);
    setIsAuthModalOpen(true);
  };
  const [cartItems, setCartItems] = useState([]);
  
  useEffect(() => {
    const fetchCartItems = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const data = await axiosClient.get('/cart/items');
          setCartItems(data);
        }
      } catch (error) {
        console.error("Lỗi lấy giỏ hàng:", error);
      }
    };

    fetchCartItems();    
    window.addEventListener("cartUpdated", fetchCartItems);
    window.addEventListener("authChange", fetchCartItems);   

    const handleLocationUpdate = () => {
        setIsLocationModalOpen(false);
    };
    window.addEventListener("locationUpdated", handleLocationUpdate);

    return () => {
      window.removeEventListener("cartUpdated", fetchCartItems);
      window.removeEventListener("authChange", fetchCartItems);
      window.removeEventListener("locationUpdated", handleLocationUpdate);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f7f9]">
      <Header onOpenAuth={handleOpenAuth} onOpenCart={() => setIsCartOpen(true)} />      
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-8">
        <Outlet /> 
      </main>      
      <Footer />      

      {/* Tích hợp Chatbot */}
      <AiChatbot />

      {/* Các Modals dùng chung */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        mode={authType}
        setMode={setAuthType}
      />
      <GlobalLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
      <CartDrawer
      isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cartItems={cartItems}
      />
    </div>
  );
};

export default UserLayout;