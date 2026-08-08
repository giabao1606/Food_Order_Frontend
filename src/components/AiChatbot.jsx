import React, { useState, useRef, useEffect, useContext } from 'react';
import { MdChatBubbleOutline, MdClose, MdSend, MdSmartToy, MdRestaurantMenu, MdTableBar, MdLocalOffer, MdRefresh } from 'react-icons/md';
import axiosClient from '../utils/axiosClient';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Render tin nhắn có **bold** và xuống dòng
const MessageContent = ({ text }) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                if (part === '\n') return <br key={i} />;
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};

const QUICK_ACTIONS = [
    { label: '🍜 Đặt món', icon: MdRestaurantMenu, msg: 'Tôi muốn đặt món' },
    { label: '📅 Đặt bàn', icon: MdTableBar, msg: 'Tôi muốn đặt bàn' },
    { label: '🎫 Khuyến mãi', icon: MdLocalOffer, msg: 'Có khuyến mãi gì không?' },
];

const AiChatbot = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'model', content: 'Xin chào! 👋 Tôi là Trợ lý AI của nhà hàng.\nTôi có thể giúp bạn **đặt món**, **đặt bàn**, hoặc tư vấn về menu và khuyến mãi nhé!' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationState, setConversationState] = useState({
        stage: 'IDLE',
        orderDraft: {},
        reservationDraft: {}
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDateTime, setSelectedDateTime] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isOpen, showDatePicker]);

    const sendToAI = async (userMsg, dtOverride) => {
        const historyForApi = chatHistory.slice(1).map(m => ({ role: m.role, content: m.content }));

        const newHistory = [...chatHistory, { role: 'user', content: userMsg }];
        setChatHistory(newHistory);
        setIsLoading(true);
        setShowDatePicker(false);

        try {
            const payload = {
                message: userMsg,
                chatHistory: historyForApi,
                conversationState,
                ...(dtOverride ? { selectedDateTime: dtOverride } : {})
            };
            const response = await axiosClient.post('/ai/chat-action', payload);

            if (response.success) {
                const { reply, stateUpdate, action, orderId } = response;

                // Cập nhật state
                if (stateUpdate) {
                    setConversationState(prev => ({ ...prev, ...stateUpdate }));
                }

                // Xử lý action
                if (action === 'SHOW_DATETIME_PICKER') {
                    setShowDatePicker(true);
                }
                if (action === 'REQUEST_LOGIN') {
                    setChatHistory(prev => [...prev, {
                        role: 'model', content: reply,
                        extra: { type: 'LOGIN_PROMPT' }
                    }]);
                    return;
                }
                if (action === 'ORDER_CREATED' || action === 'RESERVATION_CREATED') {
                    setChatHistory(prev => [...prev, {
                        role: 'model', content: reply,
                        extra: { type: action, orderId }
                    }]);
                    return;
                }

                setChatHistory(prev => [...prev, { role: 'model', content: reply, extra: response.extra }]);
            } else {
                setChatHistory(prev => [...prev, { role: 'model', content: '⚠️ Có lỗi xảy ra. Vui lòng thử lại.' }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setChatHistory(prev => [...prev, { role: 'model', content: '🤖 Hệ thống AI đang bận. Bạn thử lại sau nhé!' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || isLoading) return;
        const msg = message.trim();
        setMessage('');
        await sendToAI(msg);
    };

    const handleQuickAction = async (msg) => {
        if (isLoading) return;
        await sendToAI(msg);
    };

    const handleDateTimeConfirm = async () => {
        if (!selectedDateTime) return;
        const formatted = new Date(selectedDateTime).toLocaleString('vi-VN', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        await sendToAI(`Tôi chọn thời gian: ${formatted}`, selectedDateTime);
        setSelectedDateTime('');
    };

    const handleReset = () => {
        setChatHistory([
            { role: 'model', content: 'Xin chào! 👋 Tôi là Trợ lý AI của nhà hàng.\nTôi có thể giúp bạn **đặt món**, **đặt bàn**, hoặc tư vấn về menu và khuyến mãi nhé!' }
        ]);
        setConversationState({ stage: 'IDLE', orderDraft: {}, reservationDraft: {} });
        setShowDatePicker(false);
        setSelectedDateTime('');
    };

    const stageMap = {
        'ORDER_COLLECTING': 'Đang chọn món',
        'ORDER_CONFIRMING': 'Chờ xác nhận đơn hàng',
        'RESERVATION_COLLECTING': 'Đang thu thập thông tin đặt bàn',
        'RESERVATION_CONFIRMING': 'Chờ xác nhận đặt bàn'
    };

    const getStageText = (stage) => {
        if (stage === 'IDLE') return 'Trực tuyến';
        return `Đang xử lý: ${stageMap[stage] || 'Yêu cầu'}`;
    };

    const isIdle = conversationState.stage === 'IDLE';

    // Minimum datetime = now + 30 phút
    const minDateTime = new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16);

    return (
        <div className="fixed bottom-6 right-6 z-[100] font-sans">
            {/* Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-gradient-to-r from-teal-500 to-[#006a6a] rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                    title="Trợ lý AI"
                >
                    <MdChatBubbleOutline size={28} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="w-[360px] sm:w-[400px] h-[580px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-600 to-[#006a6a] p-4 flex justify-between items-center text-white flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full">
                                <MdSmartToy size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Trợ lý AI Nhà Hàng</h3>
                                <p className="text-[10px] text-teal-100 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                    {getStageText(conversationState.stage)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={handleReset} className="hover:bg-white/20 p-1.5 rounded-full transition" title="Cuộc trò chuyện mới">
                                <MdRefresh size={18} />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition">
                                <MdClose size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-3">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm leading-relaxed ${
                                    msg.role === 'user'
                                        ? 'bg-[#006a6a] text-white rounded-tr-sm'
                                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                                }`}>
                                    <MessageContent text={msg.content} />

                                    {/* Special action cards */}
                                    {msg.extra?.type === 'LOGIN_PROMPT' && (
                                        <button
                                            onClick={() => { setIsOpen(false); navigate('/login'); }}
                                            className="mt-2 w-full bg-[#F25C05] text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-orange-600 transition"
                                        >
                                            🔑 Đăng nhập ngay
                                        </button>
                                    )}
                                    {msg.extra?.type === 'NAVIGATE_CHECKOUT' && (
                                        <button
                                            onClick={() => { setIsOpen(false); navigate('/checkout', { state: { aiOrder: msg.extra.aiOrder } }); }}
                                            className="mt-2 w-full bg-teal-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-teal-700 transition flex items-center justify-center gap-2"
                                        >
                                            💳 Thanh toán ngay
                                        </button>
                                    )}
                                    {msg.extra?.type === 'NAVIGATE_RESERVATION' && (
                                        <button
                                            onClick={() => { setIsOpen(false); navigate('/dat-ban', { state: { aiOrder: msg.extra.aiOrder } }); }}
                                            className="mt-2 w-full bg-purple-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                                        >
                                            🍽️ Chốt thông tin đặt bàn
                                        </button>
                                    )}
                                    {msg.extra?.type === 'DIRECT_VNPAY_RESERVATION' && (
                                        <button
                                            onClick={async () => {
                                                const aiOrder = msg.extra.aiOrder;
                                                const payload = {
                                                    address: 'Nhận tại cửa hàng',
                                                    name: aiOrder.customer_name,
                                                    phone: aiOrder.phone,
                                                    note: aiOrder.note,
                                                    branch_id: aiOrder.branch_id || 1,
                                                    order_type: 'DINE_IN',
                                                    reservation_time: aiOrder.date_time || aiOrder.reservation_time,
                                                    guest_count: aiOrder.guests || 2,
                                                    paymentMethod: 'VNPAY',
                                                    is_table_only: true
                                                };
                                                try {
                                                    const res = await axiosClient.post('/orders/create', payload);
                                                    if (res.paymentUrl) {
                                                        window.location.assign(res.paymentUrl);
                                                    } else {
                                                        alert("Đã xảy ra lỗi khi tạo link thanh toán cọc!");
                                                    }
                                                } catch (error) {
                                                    alert(error.response?.data?.message || "Lỗi khi gửi yêu cầu đặt bàn!");
                                                }
                                            }}
                                            className="mt-2 w-full bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                        >
                                            💳 Thanh toán cọc VNPay ({(msg.extra.aiOrder.guests * 10000).toLocaleString()}đ)
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Loading dots */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        )}

                        {/* DateTime Picker */}
                        {showDatePicker && !isLoading && (
                            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mx-1">
                                <p className="text-xs font-semibold text-teal-700 mb-2">📅 Chọn thời gian đặt bàn:</p>
                                <input
                                    type="datetime-local"
                                    className="w-full border border-teal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                    value={selectedDateTime}
                                    min={minDateTime}
                                    step="1800"
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val) {
                                            const d = new Date(val);
                                            const mins = d.getMinutes();
                                            if (mins !== 0 && mins !== 30) {
                                                const rounded = mins < 15 ? 0 : (mins < 45 ? 30 : 60);
                                                if (rounded === 60) {
                                                    d.setHours(d.getHours() + 1);
                                                    d.setMinutes(0);
                                                } else {
                                                    d.setMinutes(rounded);
                                                }
                                                const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                                setSelectedDateTime(localIso);
                                                return;
                                            }
                                        }
                                        setSelectedDateTime(val);
                                    }}
                                />
                                {selectedDateTime && (
                                    <button
                                        onClick={handleDateTimeConfirm}
                                        className="mt-2 w-full bg-teal-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-teal-700 transition"
                                    >
                                        ✅ Xác nhận thời gian
                                    </button>
                                )}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions - chỉ hiện khi IDLE */}
                    {isIdle && !isLoading && (
                        <div className="px-3 py-2 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
                            {QUICK_ACTIONS.map((qa, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleQuickAction(qa.msg)}
                                    className="flex-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg py-1.5 px-1 transition text-center"
                                >
                                    {qa.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder={isLoading ? 'Đang xử lý...' : 'Nhập tin nhắn...'}
                                className="flex-1 p-2.5 bg-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-teal-500/50 transition"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !message.trim()}
                                className="p-2.5 bg-[#006a6a] text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <MdSend size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiChatbot;

