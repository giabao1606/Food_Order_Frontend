import React, { useState, useEffect } from 'react';
import { MdAdd, MdDelete, MdChatBubbleOutline, MdSmartToy, MdVisibilityOff, MdEdit } from 'react-icons/md';
import axiosClient from '../../utils/axiosClient';
import toast from 'react-hot-toast';
import { uploadImageToServer } from '../../utils/uploadHelper';

const FeedManagementPage = () => {
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [activePost, setActivePost] = useState(null);
    const [comments, setComments] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);

    const [formData, setFormData] = useState({
        type: 'NEWS',
        title: '',
        content: '',
        media_url: '',
        imageFile: null,
        visibility: 'PUBLIC',
        status: 'ACTIVE'
    });
    const [isSaving, setIsSaving] = useState(false);

    const fetchFeeds = async () => {
        try {
            const [postRes, statRes] = await Promise.all([
                axiosClient.get('/admin/feed'),
                axiosClient.get('/admin/feed/statistics')
            ]);
            if (postRes.success) setPosts(postRes.data);
            if (statRes.success) setStats(statRes.today);
        } catch (error) {
            toast.error("Lỗi tải dữ liệu feed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeeds();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa bài viết này?')) return;
        try {
            const res = await axiosClient.delete(`/admin/feed/${id}`);
            if (res.success) {
                toast.success("Xóa bài viết thành công!");
                fetchFeeds();
            }
        } catch (error) {
            toast.error("Lỗi xóa bài viết");
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
            const res = await axiosClient.patch(`/admin/feed/${id}/status`, { status: newStatus });
            if (res.success) {
                toast.success("Đã cập nhật trạng thái");
                setPosts(posts.map(p => p.id === id ? { ...p, status: newStatus } : p));
            }
        } catch (error) {
            toast.error("Lỗi cập nhật trạng thái");
        }
    };

    const openEditModal = (post) => {
        setEditingId(post.id);
        setFormData({
            type: post.type,
            title: post.title,
            content: post.content,
            media_url: post.media_url || '',
            imageFile: null,
            visibility: post.visibility || 'PUBLIC',
            status: post.status || 'ACTIVE'
        });
        setIsAddModalOpen(true);
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let finalMediaUrl = formData.media_url;
            if (formData.imageFile) {
                finalMediaUrl = await uploadImageToServer(formData.imageFile, 'feeds');
            }
            const payload = { ...formData, media_url: finalMediaUrl };
            delete payload.imageFile;

            if (editingId) {
                const res = await axiosClient.put(`/admin/feed/${editingId}`, payload);
                if (res.success) {
                    toast.success('Cập nhật bài viết thành công!');
                    setIsAddModalOpen(false);
                    setFormData({ type: 'NEWS', title: '', content: '', media_url: '', imageFile: null, visibility: 'PUBLIC', status: 'ACTIVE' });
                    setEditingId(null);
                    fetchFeeds();
                }
            } else {
                const res = await axiosClient.post('/admin/feed', payload);
                if (res.success) {
                    toast.success('Đăng bài thành công!');
                    setIsAddModalOpen(false);
                    setFormData({ type: 'NEWS', title: '', content: '', media_url: '', imageFile: null, visibility: 'PUBLIC', status: 'ACTIVE' });
                    fetchFeeds();
                }
            }
        } catch (error) {
            toast.error(editingId ? 'Lỗi cập nhật bài viết' : 'Lỗi thêm bài viết');
        } finally {
            setIsSaving(false);
        }
    };

    const openCommentModal = async (post) => {
        setActivePost(post);
        setReplyingTo(null);
        try {
            const res = await axiosClient.get(`/feed/${post.id}/comments`);
            if (res.success) {
                setComments(res.data);
                setIsCommentModalOpen(true);
            }
        } catch (error) {
            toast.error("Lỗi tải bình luận");
        }
    };

    const handleAdminReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        setIsSaving(true);
        try {
            const payload = { content: replyText };
            if (replyingTo) {
                payload.parent_comment_id = replyingTo.id;
            }
            const res = await axiosClient.post(`/feed/${activePost.id}/comment`, payload);
            if (res.success) {
                // Refresh comments to get new tree structure
                const refreshRes = await axiosClient.get(`/feed/${activePost.id}/comments`);
                if (refreshRes.success) setComments(refreshRes.data);
                
                setReplyText('');
                setReplyingTo(null);
                fetchFeeds();
                toast.success("Đã phản hồi!");
            }
        } catch (error) {
            toast.error("Lỗi gửi phản hồi");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleAiReply = async (postId, currentValue) => {
        try {
            await axiosClient.put(`/admin/feed/${postId}/ai-reply`, { enabled: !currentValue });
            setPosts(posts.map(p => p.id === postId ? { ...p, ai_auto_reply: !currentValue ? 1 : 0 } : p));
            toast.success(`AI Auto Reply đã ${!currentValue ? 'bật' : 'tắt'}`);
        } catch { toast.error('Lỗi cập nhật'); }
    };

    const handleUnhideComment = async (commentId) => {
        try {
            await axiosClient.patch(`/admin/feed/comments/${commentId}/unhide`);
            setComments(comments.map(c => c.id === commentId ? { ...c, is_hidden: 0, hidden_by_ai: 0 } : c));
            toast.success('Bỏ ẩn bình luận thành công!');
        } catch { toast.error('Lỗi bỏ ẩn'); }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý Bảng tin và Tương tác</h1>

            {stats && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-gray-500 text-sm">Bài viết hôm nay</h3>
                        <p className="text-2xl font-bold mt-1 text-[#006a6a]">{stats.posts_today}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-gray-500 text-sm">Lượt thích hôm nay</h3>
                        <p className="text-2xl font-bold mt-1 text-blue-600">{stats.likes_today}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-gray-500 text-sm">Bình luận hôm nay</h3>
                        <p className="text-2xl font-bold mt-1 text-green-600">{stats.comments_today}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-gray-500 text-sm">Điểm đã thưởng hôm nay</h3>
                        <p className="text-2xl font-bold mt-1 text-orange-600">{stats.points_given_today}</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h2 className="font-bold text-gray-800">Danh sách Bài viết</h2>
                    <button 
                        onClick={() => { setEditingId(null); setFormData({ type: 'NEWS', title: '', content: '', media_url: '', visibility: 'PUBLIC', status: 'ACTIVE' }); setIsAddModalOpen(true); }}
                        className="bg-[#006a6a] hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
                    >
                        <MdAdd size={20} /> Viết bài mới
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                            <tr>
                                <th className="p-4 font-semibold">Ngày đăng</th>
                                <th className="p-4 font-semibold w-1/3">Tiêu đề</th>
                                <th className="p-4 font-semibold">Loại</th>
                                <th className="p-4 font-semibold text-center">Tương tác</th>
                                <th className="p-4 font-semibold">Trạng thái</th>
                                <th className="p-4 font-semibold text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posts.map(post => (
                                <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4">{new Date(post.created_at).toLocaleString('vi-VN')}</td>
                                    <td className="p-4 font-medium text-gray-800">{post.title}</td>
                                    <td className="p-4">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{post.type}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-3 text-xs">
                                            <span className="text-blue-600 font-bold">{post.like_count} ❤️</span>
                                            <span className="text-green-600 font-bold">{post.comment_count} 💬</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => toggleStatus(post.id, post.status)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${post.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                                        >
                                            {post.status}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right flex justify-end items-center gap-2">
                                        <button onClick={() => openEditModal(post)} className="text-amber-500 hover:text-amber-700 p-2 rounded-lg hover:bg-amber-50" title="Điều chỉnh bài viết">
                                            <MdEdit size={20} />
                                        </button>
                                        <button onClick={() => openCommentModal(post)} className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50" title="Xem bình luận">
                                            <MdChatBubbleOutline size={20} />
                                        </button>
                                        <button onClick={() => handleDelete(post.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50" title="Xóa bài viết">
                                            <MdDelete size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">{editingId ? 'Điều chỉnh bài viết' : 'Đăng bài viết mới'}</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Loại tin</label>
                                    <select 
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#006a6a]/20"
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                    >
                                        <option value="NEWS">Tin tức chung</option>
                                        <option value="PROMOTION">Khuyến mãi</option>
                                        <option value="NEW_MENU">Món mới</option>
                                        <option value="MINIGAME">Mini Game</option>
                                        <option value="HOT_TIME">Flash Sale / Giờ vàng</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hiển thị</label>
                                    <select 
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#006a6a]/20"
                                        value={formData.visibility}
                                        onChange={e => setFormData({...formData, visibility: e.target.value})}
                                    >
                                        <option value="PUBLIC">Công khai</option>
                                        <option value="MEMBER_ONLY">Chỉ thành viên</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Trạng thái hiển thị</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#006a6a]/20"
                                    value={formData.status}
                                    onChange={e => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="ACTIVE">Hiển thị (ACTIVE)</option>
                                    <option value="HIDDEN">Ẩn (HIDDEN)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tiêu đề</label>
                                <input 
                                    type="text" required
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#006a6a]/20"
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Hình ảnh đính kèm</label>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            if (file.size > 5 * 1024 * 1024) {
                                                alert("Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB!");
                                                return;
                                            }
                                            const previewUrl = URL.createObjectURL(file);
                                            setFormData(prev => ({ ...prev, media_url: previewUrl, imageFile: file }));
                                        }
                                    }} 
                                    className="hidden" 
                                    id="feed-image-upload"
                                />
                                <div onClick={() => document.getElementById('feed-image-upload').click()} className="flex flex-col min-h-[160px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer overflow-hidden relative group">
                                    {formData.media_url ? (
                                        <>
                                            <img src={formData.media_url} className="absolute inset-0 w-full h-full object-cover" alt="Preview"/>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                <span className="text-white font-medium text-sm">Đổi ảnh khác</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-400">
                                            <span className="text-3xl mb-2">📸</span>
                                            <p className="font-medium text-sm">Nhấn để tải lên hình ảnh</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nội dung</label>
                                <textarea 
                                    required rows={5}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#006a6a]/20"
                                    value={formData.content}
                                    onChange={e => setFormData({...formData, content: e.target.value})}
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold">Hủy</button>
                                <button type="submit" disabled={isSaving} className="bg-[#006a6a] hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-50">
                                    {isSaving ? 'Đang xử lý...' : (editingId ? 'Cập nhật' : 'Đăng bài')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Comment Modal */}
            {isCommentModalOpen && activePost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">Bình luận bài viết</h2>
                            <button onClick={() => setIsCommentModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-gray-50/50">
                            {comments.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">Chưa có bình luận nào.</p>
                            ) : comments.map(cmt => (
                                <div key={cmt.id} className="flex flex-col gap-3">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#006a6a] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                            {cmt.user_name ? cmt.user_name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <div className={`p-3 rounded-2xl rounded-tl-none border shadow-sm w-full ${cmt.is_hidden ? 'bg-red-50 border-red-200 opacity-70' : 'bg-white border-gray-200'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-gray-800 text-sm">{cmt.user_name || 'Khách'}</h4>
                                                        {cmt.is_hidden && (
                                                            <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                                                                <MdVisibilityOff size={10} /> Đã ẩn ({cmt.hidden_reason || 'AI'})
                                                            </span>
                                                        )}
                                                        {cmt.reply_source === 'AI' && (
                                                            <span className="text-[10px] bg-teal-100 text-teal-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                                <MdSmartToy size={10} /> AI
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 ml-4">{new Date(cmt.created_at).toLocaleString('vi-VN')}</span>
                                                </div>
                                                <p className="text-gray-600 text-sm">{cmt.content}</p>
                                            </div>
                                            <div className="flex gap-3 mt-1 ml-2">
                                                <button onClick={() => setReplyingTo(cmt)} className="text-xs font-bold text-gray-500 hover:text-[#006a6a] transition">
                                                    Trả lời
                                                </button>
                                                {cmt.is_hidden && (
                                                    <button onClick={() => handleUnhideComment(cmt.id)} className="text-xs font-bold text-red-500 hover:text-red-700 transition">
                                                        Bỏ ẩn
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {cmt.replies && cmt.replies.length > 0 && (
                                        <div className="flex flex-col gap-3 pl-10">
                                            {cmt.replies.map(reply => (
                                                <div key={reply.id} className="flex gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                                                        {reply.user_name ? reply.user_name.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="bg-[#f0f9f9] p-2.5 rounded-2xl rounded-tl-none border border-teal-100 shadow-sm w-full">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <h4 className="font-bold text-[#006a6a] text-xs">{reply.user_name || 'Khách'}</h4>
                                                                <span className="text-[9px] text-gray-400 ml-4">{new Date(reply.created_at).toLocaleString('vi-VN')}</span>
                                                            </div>
                                                            <p className="text-gray-700 text-sm">{reply.content}</p>
                                                        </div>
                                                        <button onClick={() => setReplyingTo(cmt)} className="text-xs font-bold text-gray-500 hover:text-[#006a6a] self-start mt-1 ml-2 transition">
                                                            Trả lời
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white flex flex-col">
                            {replyingTo && (
                                <div className="flex items-center justify-between bg-teal-50 px-3 py-1.5 rounded-t-lg border border-teal-100 border-b-0 mb-[-1px] z-10 mx-2">
                                    <span className="text-xs text-gray-600">Đang trả lời <strong className="text-[#006a6a]">{replyingTo.user_name}</strong></span>
                                    <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-red-500 font-bold">&times;</button>
                                </div>
                            )}
                            <form onSubmit={handleAdminReply} className="flex gap-2 relative z-20">
                                <input 
                                    type="text" 
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder={replyingTo ? "Nhập câu trả lời..." : "Viết bình luận mới..."}
                                    className={`flex-1 bg-gray-100 border border-transparent px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a6a]/30 focus:bg-white transition-all ${replyingTo ? 'rounded-b-xl rounded-tr-xl' : 'rounded-full'}`}
                                />
                                <button type="submit" disabled={!replyText.trim() || isSaving} className="bg-[#006a6a] text-white px-5 rounded-full font-bold text-sm disabled:opacity-50 hover:bg-teal-700 transition">
                                    {isSaving ? '...' : 'Gửi'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedManagementPage;
