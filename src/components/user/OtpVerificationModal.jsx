import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../utils/firebase"; 
import axiosClient from '../../utils/axiosClient';
import { FaTimes } from 'react-icons/fa';

const OtpVerificationModal = ({ initialPhone = '', onSuccess, onCancel }) => {
    const [phone, setPhone] = useState(initialPhone);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [countdown, setCountdown] = useState(0);
    const [canResend, setCanResend] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    
    const inputRefs = useRef([]);

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else {
            setCanResend(true);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleSendOTP = async () => {
        if (!phone || phone.length < 10) {
            setMessage({ type: 'error', text: 'Vui lòng nhập số điện thoại hợp lệ.' });
            return;
        }

        const countryCode = '+84';
        try {
            setIsLoading(true);
            setMessage({ type: '', text: '' });
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
            }
            const phoneWithoutZero = phone.replace(/^0+/, ''); 
            const firebasePhone = `${countryCode}${phoneWithoutZero}`;

            const confirmation = await signInWithPhoneNumber(auth, firebasePhone, window.recaptchaVerifier);
            setConfirmationResult(confirmation);
            
            setShowOtpInput(true);
            setCountdown(45);
            setCanResend(false);
            setOtp(new Array(6).fill(""));
            
            setMessage({ type: 'success', text: `Đã gửi mã đến ${firebasePhone}` });
        } catch (error) {
            console.error("Firebase OTP Error:", error); 
            setMessage({ type: 'error', text: 'Lỗi gửi OTP. Kiểm tra lại số điện thoại.' });
            
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (e, index) => {
        const value = e.target.value;
        if (isNaN(value)) return; 

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1); 
        setOtp(newOtp);

        if (value && index < 5 && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handleVerifyOTP = async () => {
        const otpCodeString = otp.join(""); 
        if (otpCodeString.length !== 6) {
            setMessage({ type: 'error', text: 'Vui lòng nhập đủ 6 số OTP.' });
            return;
        }

        try {
            setIsLoading(true);
            const result = await confirmationResult.confirm(otpCodeString);
            const idToken = await result.user.getIdToken();

            const data = await axiosClient.post('/users/verify-phone', { firebaseToken: idToken });
            
            if (data.success) {
                setMessage({ type: 'success', text: data.message });
                onSuccess(data.phone);
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Mã OTP sai hoặc đã hết hạn.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-[2rem] p-8 max-w-[400px] w-full relative flex flex-col items-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <button 
                    type="button"
                    onClick={onCancel}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition cursor-pointer"
                >
                    <FaTimes />
                </button>
                <div id="recaptcha-container"></div>
                
                <h3 className="text-2xl font-black text-gray-800 mb-2">Xác thực điện thoại</h3>
                <p className="text-center text-sm text-gray-500 mb-6">
                    Hệ thống cần xác thực số điện thoại của bạn để đảm bảo liên lạc khi giao hàng.
                </p>

                {message.text && (
                    <div className={`mb-4 w-full p-3 rounded-lg text-sm text-center font-bold ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {message.text}
                    </div>
                )}

                {!showOtpInput ? (
                    <div className="w-full">
                        <input 
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Nhập số điện thoại của bạn"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-[#006a6a] outline-none"
                        />
                        <button 
                            type="button"
                            onClick={handleSendOTP}
                            disabled={isLoading}
                            className="w-full py-3 bg-[#006a6a] text-white rounded-xl font-bold hover:bg-teal-700 transition disabled:opacity-50"
                        >
                            {isLoading ? 'ĐANG XỬ LÝ...' : 'GỬI MÃ OTP'}
                        </button>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center">
                        <div className="flex gap-2.5 mb-8 w-full justify-center">
                            {otp.map((data, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    maxLength="1"
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    value={data}
                                    onChange={(e) => handleOtpChange(e, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="w-12 h-14 bg-[#e2e4e6] border-none rounded-xl text-center text-xl font-black text-gray-800 focus:bg-gray-200 focus:ring-2 focus:ring-[#006a6a] outline-none transition-colors"
                                />
                            ))}
                        </div>

                        <div className="text-sm font-bold mb-8">
                            {canResend ? (
                                <button type="button" onClick={handleSendOTP} className="text-[#006a6a] hover:underline cursor-pointer">
                                    Gửi lại mã
                                </button>
                            ) : (
                                <span className="text-gray-500">Gửi lại mã sau {countdown}s</span>
                            )}
                        </div>

                        <button 
                            type="button" 
                            onClick={handleVerifyOTP}
                            disabled={isLoading}
                            className="w-full py-3 bg-[#006a6a] text-white rounded-xl font-bold hover:bg-teal-700 transition disabled:opacity-50 cursor-pointer"
                        >
                            {isLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OtpVerificationModal;
