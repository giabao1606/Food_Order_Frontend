import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import axiosClient from "../../utils/axiosClient";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = searchParams.get("email");
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!email || !token) {
      setMessage("Đường dẫn không hợp lệ hoặc đã hết hạn!");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu và xác nhận mật khẩu không khớp!");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosClient.post("/auth/reset-password", {
        email,
        token,
        newPassword,
      });

      if (response.success) {
        setIsSuccess(true);
        setMessage("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.");
      } else {
        setMessage(response.message || "Có lỗi xảy ra, vui lòng thử lại.");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Lỗi server! Không thể đặt lại mật khẩu lúc này.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-[450px] p-8 bg-[#42C2FF] rounded-3xl shadow-2xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="text-3xl text-red-600">🥢</div>
          <div className="flex flex-col text-sm font-black leading-tight uppercase">
            <span>Golden</span>
            <span>Chopsticks</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-6 uppercase tracking-wide">
          Đặt lại mật khẩu
        </h2>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in duration-300">
            <div className="text-green-700 bg-green-100 p-4 rounded-xl font-bold w-full">
              {message}
            </div>
            <Link
              to="/"
              className="w-full py-3 mt-4 bg-[#FF4D4D] text-white font-bold rounded-xl text-center hover:bg-red-600 transition shadow-[0_4px_0_rgb(180,0,0)] active:shadow-none active:translate-y-1"
            >
              Về trang chủ đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {message && (
              <div className="bg-red-100 text-red-700 px-4 py-3 rounded text-sm font-bold">
                {message}
              </div>
            )}

            <div>
              <label className="block mb-1 font-semibold text-gray-800">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
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

            <div>
              <label className="block mb-1 font-semibold text-gray-800">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 bg-[#FF4D4D] text-white font-bold rounded-xl cursor-pointer hover:bg-red-600 transition shadow-[0_4px_0_rgb(180,0,0)] active:shadow-none active:translate-y-1 disabled:opacity-70"
            >
              {loading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;