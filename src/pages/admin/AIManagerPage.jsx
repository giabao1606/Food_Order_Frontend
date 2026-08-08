import React, { useState, useEffect } from 'react';
import axiosClient from '../../utils/axiosClient';
import toast from 'react-hot-toast';
import { MdSmartToy, MdSave, MdHistory, MdToggleOn, MdToggleOff } from "react-icons/md";

const AIManagerPage = () => {
  const [settings, setSettings] = useState({ is_active: 1, system_prompt: '' });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, logsRes] = await Promise.all([
        axiosClient.get('/ai/settings'),
        axiosClient.get('/ai/logs')
      ]);
      if (settingsRes.success) setSettings(settingsRes.data);
      if (logsRes.success) setLogs(logsRes.data);
    } catch (error) {
      toast.error('Lỗi lấy dữ liệu AI');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await axiosClient.put('/ai/settings', settings);
      if (res.success) {
        toast.success(res.message || 'Cập nhật cấu hình thành công!');
      } else {
        toast.error(res.message || 'Lỗi cập nhật cấu hình');
      }
    } catch (error) {
      toast.error('Lỗi cập nhật cấu hình AI');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
        <div className="flex justify-center items-center min-h-[400px]">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#006a6a] rounded-full animate-spin"></div>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300 p-4 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 mb-1 flex items-center gap-3">
          <MdSmartToy className="text-[#006a6a]" /> Quản lý Trợ lý AI
        </h1>
        <p className="text-gray-500 text-sm font-medium">Cấu hình ngữ cảnh và xem lịch sử chat của khách hàng</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center justify-between">
              Cấu hình chung
              <button 
                onClick={() => setSettings({...settings, is_active: !settings.is_active ? 1 : 0})}
                className="text-2xl focus:outline-none"
                title={settings.is_active ? "Tắt AI" : "Bật AI"}
              >
                {settings.is_active ? <MdToggleOn className="text-[#006a6a]" /> : <MdToggleOff className="text-gray-400" />}
              </button>
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái hoạt động</label>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${settings.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {settings.is_active ? 'Đang Bật' : 'Đang Tắt'}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ngữ cảnh / System Prompt</label>
              <textarea 
                value={settings.system_prompt || ''}
                onChange={(e) => setSettings({...settings, system_prompt: e.target.value})}
                className="w-full border border-gray-300 rounded-xl p-3 h-48 focus:ring-2 focus:ring-[#006a6a] outline-none resize-none text-sm"
                placeholder="Nhập ngữ cảnh khẩn cấp cho AI. Ví dụ: 'Hôm nay nhà hàng hết món Gà rán, hãy báo khách đặt món khác...'"
              />
              <p className="text-xs text-gray-400 mt-2">Dữ liệu này sẽ được tiêm vào trước Thực đơn và Voucher khi AI trả lời.</p>
            </div>

            <button 
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full bg-[#006a6a] hover:bg-[#005555] text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
            >
              <MdSave size={20} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>

        {/* Logs Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
              <MdHistory className="text-gray-500" /> Lịch sử Chat gần đây
            </h2>
            
            <div className="overflow-y-auto max-h-[600px] pr-2 space-y-4">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có lịch sử chat nào.</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-[#006a6a]">Khách hàng: {log.user_name || log.session_id || 'Khách vãng lai'}</span>
                      <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded-lg text-sm border border-gray-200">
                        <span className="font-bold text-gray-700 block mb-1">User:</span>
                        <p className="text-gray-600">{log.user_message}</p>
                      </div>
                      <div className="bg-[#e6f4f4] p-3 rounded-lg text-sm border border-[#b2e0e0]">
                        <span className="font-bold text-[#006a6a] block mb-1">AI:</span>
                        <p className="text-gray-800 whitespace-pre-wrap">{log.ai_response}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIManagerPage;
