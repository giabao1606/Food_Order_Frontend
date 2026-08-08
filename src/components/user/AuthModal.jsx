import React, { useState, useEffect, useContext } from "react";
import { FaTimes, FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import axiosClient from "../../utils/axiosClient";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../../utils/firebase";

const AuthModal = ({ isOpen, onClose, mode, setMode }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login: contextLogin } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // State cho phần Quên mật khẩu
  const [resetEmail, setResetEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setError("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setResetEmail("");
      setMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Reset trạng thái khi chuyển đổi mode
  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setResetEmail("");
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError("Mật khẩu và xác nhận mật khẩu không khớp.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailTrimmed = email.trim();
    if (!emailRegex.test(emailTrimmed)) {
      setError("Vui lòng nhập một địa chỉ email hợp lệ.");
      return;
    }
    setLoading(true);
    try {
      const api = mode === "login" ? "/auth/login" : "/auth/register";
      const load = { email: emailTrimmed, password: password };
      const data = await axiosClient.post(api, load);
      
      if (data.success) {
        contextLogin(data.token, data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        const successMsg = mode === "login" 
          ? "Đăng nhập thành công! Chào mừng " + data.user.email 
          : "Đăng ký thành công!";
        alert(successMsg);
        window.dispatchEvent(new Event("authChange"));
        const userRole = data.user.role.toUpperCase();
        
        // Điều hướng dựa trên phân quyền
        if (userRole === "ADMIN") {
          navigate("/admin");
        } else if (userRole === "MANAGER") {
          navigate("/manager/dashboard");
        } else if (userRole === "STAFF") {
          navigate("/staff/don-hang");
        } else {
          window.location.reload();
        }        
        onClose();
      } else {
        const errorMsg = data.message || "Đã có lỗi xảy ra. Vui lòng thử lại.";
        alert(errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.message || "Thông tin đăng nhập không chính xác hoặc lỗi Server.";
      alert(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const data = await axiosClient.post("/auth/google-login", { firebaseToken: idToken });
      if (data.success) {
        contextLogin(data.token, data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        alert("Đăng nhập bằng Google thành công! Chào mừng " + data.user.email);
        window.dispatchEvent(new Event("authChange"));
        onClose();
      } else {
        setError(data.message || "Đăng nhập Google thất bại.");
      }
    } catch (err) {
      console.error("Google Login Error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || "Lỗi đăng nhập Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý gửi yêu cầu khôi phục mật khẩu
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setMessage("Vui lòng nhập email!");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      setMessage("Vui lòng nhập email hợp lệ!");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await axiosClient.post('/auth/forgot-password', { email: resetEmail.trim() });
      setMessage(response.message || "Đã gửi link khôi phục, vui lòng kiểm tra email!");
    } catch (error) {
      setMessage(error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-[450px] p-8 bg-[#42C2FF] rounded-3xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-3xl text-black hover:scale-110 transition cursor-pointer"
        >
          <FaTimes />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="text-3xl text-red-600">🥢</div>
          <div className="flex flex-col text-sm font-black leading-tight uppercase">
            <span>Golden</span>
            <span>Chopsticks</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-8 uppercase tracking-wide">
          {mode === "login" ? "Đăng nhập" : mode === "register" ? "Đăng ký" : "Khôi phục mật khẩu"}
        </h2>

        {/* --- GIAO DIỆN QUÊN MẬT KHẨU --- */}
        {mode === "forgot-password" ? (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm font-medium text-gray-800 text-center mb-2">
              Nhập email đăng nhập của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
            </p>
            
            <div>
              <label className="block mb-1 font-semibold text-gray-800">Email</label>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Nhập email của bạn..."
                className="w-full px-4 py-3 rounded-xl bg-[#D6F4FF] border-none focus:ring-2 focus:ring-blue-400 outline-none placeholder:text-gray-500"
              />
            </div>

            {message && (
              <div className={`p-3 rounded text-sm font-bold text-center ${message.includes('Lỗi') || message.includes('Vui lòng') || message.includes('không tìm thấy') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 mt-2 bg-blue-800 text-white font-bold rounded-xl cursor-pointer hover:bg-blue-900 transition shadow-[0_4px_0_rgb(30,58,138)] active:shadow-none active:translate-y-1 disabled:opacity-70"
            >
              {loading ? "Đang gửi..." : "Gửi email xác nhận"}
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode("login")}
              className="text-gray-700 text-sm font-bold underline cursor-pointer text-center mt-4"
            >
              Quay lại đăng nhập
            </button>
          </form>
        ) : (
          /* --- GIAO DIỆN ĐĂNG NHẬP / ĐĂNG KÝ --- */
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded">{error}</div>}
              
              <div>
                <label className="block mb-1 font-semibold text-gray-800">Email đăng nhập</label>
                <input
                  type="email"
                  required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: nguyenvan@gmail.com"
                  className="w-full px-4 py-3 rounded-xl bg-[#D6F4FF] border-none focus:ring-2 focus:ring-blue-400 outline-none placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-gray-800">Mật khẩu</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Vui lòng nhập mật khẩu của bạn"
                    className="w-full px-4 py-3 rounded-xl bg-[#D6F4FF] border-none focus:ring-2 focus:ring-blue-400 outline-none placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 transition cursor-pointer"
                  >
                    {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block mb-1 font-semibold text-gray-800">Nhập lại mật khẩu</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Vui lòng nhập lại mật khẩu của bạn"
                      className="w-full px-4 py-3 rounded-xl bg-[#D6F4FF] border-none focus:ring-2 focus:ring-blue-400 outline-none placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 transition cursor-pointer"
                    >
                      {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode("forgot-password")}
                    className="text-blue-800 text-sm font-bold underline cursor-pointer hover:text-blue-900"
                  >
                    Quên mật khẩu ?
                  </button>
                </div>
              )}

              <button disabled={loading} className="w-full py-3 mt-4 bg-[#FF4D4D] text-white font-bold rounded-xl cursor-pointer hover:bg-red-600 transition shadow-[0_4px_0_rgb(180,0,0)] active:shadow-none active:translate-y-1 disabled:opacity-70">
                {loading ? "Đang xử lý..." : (mode === "login" ? "Đăng nhập" : "Đăng ký")}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm font-medium">
                {mode === "login" ? "Chưa có tài khoản ?" : "Đã có tài khoản ?"}{" "}
                <button
                  onClick={() => handleSwitchMode(mode === "login" ? "register" : "login")}
                  className="text-blue-800 font-bold underline ml-1 cursor-pointer hover:text-blue-900"
                >
                  {mode === "login" ? "Tạo ngay" : "Đăng nhập ngay"}
                </button>
              </p>
            </div>

            {mode === "login" && (
              <>
                <div className="flex items-center my-6">
                  <div className="flex-grow border-t border-black/20"></div>
                  <span className="px-4 text-sm font-bold text-gray-800 uppercase">Hoặc</span>
                  <div className="flex-grow border-t border-black/20"></div>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3 flex items-center justify-center gap-3 bg-white rounded-xl cursor-pointer font-bold shadow-md hover:bg-gray-50 transition border border-gray-100 disabled:opacity-70"
                >
                  <FaGoogle className="text-red-500" />
                  Đăng nhập với Google
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;