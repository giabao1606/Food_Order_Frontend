import React from "react";
import { Link } from "react-router-dom";
import { FaFacebook, FaInstagram, FaYoutube, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="w-full bg-gray-900 text-gray-300">
            {/* Phần nội dung chính của Footer */}
            <div className="w-full px-4 py-12 md:px-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    
                    {/* 1. Cột Logo & Giới thiệu */}
                    <div className="flex flex-col gap-4">
                        <Link to="/" className="flex flex-col text-2xl font-extrabold leading-tight tracking-tighter text-[#65DDDD] uppercase">
                            <span>Golden</span>
                            <span>Chopsticks</span>
                        </Link>
                        <p className="text-sm leading-relaxed">
                            Mang đến hương vị ẩm thực truyền thống với phong cách hiện đại. Chất lượng và sự hài lòng của khách hàng là ưu tiên hàng đầu của chúng tôi.
                        </p>
                        {/* Mạng xã hội */}
                        <div className="flex gap-4 mt-2">
                            <a href="#" className="hover:text-[#65DDDD] transition"><FaFacebook size={24} /></a>
                            <a href="#" className="hover:text-[#65DDDD] transition"><FaInstagram size={24} /></a>
                            <a href="#" className="hover:text-[#65DDDD] transition"><FaYoutube size={24} /></a>
                        </div>
                    </div>

                    {/* 2. Cột Liên kết nhanh */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-6 border-l-4 border-[#4CD361] pl-3">Liên kết</h3>
                        <ul className="flex flex-col gap-3 text-sm">
                            <li><Link to="/" className="hover:text-[#65DDDD] transition">Trang chủ</Link></li>
                            <li><Link to="/uu-dai" className="hover:text-[#65DDDD] transition">Ưu đãi đặc biệt</Link></li>
                            <li><Link to="/don-hang" className="hover:text-[#65DDDD] transition">Theo dõi đơn hàng</Link></li>                            
                        </ul>
                    </div>

                    {/* 4. Cột Thông tin liên hệ */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-6 border-l-4 border-[#4CD361] pl-3">Liên hệ</h3>
                        <ul className="flex flex-col gap-4 text-sm">
                            <li className="flex items-start gap-3">
                                <FaMapMarkerAlt className="text-[#4CD361] mt-1" />
                                <span>200 Xóm Chiếu, Quận 4, TP. Hồ Chí Minh</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <FaPhoneAlt className="text-[#4CD361]" />
                                <span>+84 123 456 789</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <FaEnvelope className="text-[#4CD361]" />
                                <span>contact@goldenchopsticks.com</span>
                            </li>
                        </ul>
                    </div>

                </div>
            </div>

            {/* Dòng Copyright cuối cùng */}
            <div className="w-full py-6 border-t border-gray-800 text-center text-xs text-gray-500">
                <p>&copy; {new Date().getFullYear()} Golden Chopsticks. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;