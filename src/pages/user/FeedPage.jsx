import React, { useState, useEffect } from 'react';
import { MdThumbUp, MdChatBubbleOutline, MdShare, MdOutlineMoreVert } from 'react-icons/md';
import { FaFire } from 'react-icons/fa';
import axiosClient from '../../utils/axiosClient';
import toast from 'react-hot-toast';

const FeedPage = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [activeCommentPost, setActiveCommentPost] = useState(null);
    const [comments, setComments] = useState([]);

    const fetchFeed = async () => {
        try {
            const res = await axiosClient.get('/feed');
            if (res.success) {
                setPosts(res.data);
            }
        } catch (error) {
            console.error("Lỗi tải feed:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.title = "Bảng tin - Food Order";
        fetchFeed();
    }, []);

    const handleLike = async (postId) => {
        try {
            const res = await axiosClient.post(`/feed/${postId}/like`);
            if (res.success) {
                setPosts(posts.map(p => {
                    if (p.id === postId) {
                        return {
                            ...p,
                            is_liked: res.isLiked,
                            like_count: res.isLiked ? p.like_count + 1 : p.like_count - 1
                        };
                    }
                    return p;
                }));
                if (res.pointsEarned > 0) {
                    toast.success(`🎉 Bạn được cộng +${res.pointsEarned} điểm tương tác!`);
                }
            }
        } catch (error) {
            toast.error('Vui lòng đăng nhập để thả tim');
        }
    };

    const handleShare = async (postId) => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Food Order Feed',
                    text: 'Xem bài viết này trên Food Order!',
                    url: window.location.href,
                });
            } else {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Đã copy link bài viết!");
            }
            const res = await axiosClient.post(`/feed/${postId}/share`);
            if (res.success && res.pointsEarned > 0) {
                toast.success(`🎉 Bạn được cộng +${res.pointsEarned} điểm tương tác!`);
            }
        } catch (error) {
            console.log('Share canceled or error');
        }
    };

    const openComments = async (postId) => {
        if (activeCommentPost === postId) {
            setActiveCommentPost(null);
            return;
        }
        setActiveCommentPost(postId);
        try {
            const res = await axiosClient.get(`/feed/${postId}/comments`);
            if (res.success) {
                setComments(res.data);
            }
        } catch (error) {
            toast.error("Lỗi tải bình luận");
        }
    };

    const handleCommentSubmit = async (e, postId) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        try {
            const res = await axiosClient.post(`/feed/${postId}/comment`, { content: commentText });
            if (res.success) {
                setComments([...comments, res.comment]);
                setCommentText('');
                setPosts(posts.map(p => p.id === postId ? {...p, comment_count: p.comment_count + 1} : p));
                if (res.pointsEarned > 0) {
                    toast.success(`🎉 Bạn được cộng +${res.pointsEarned} điểm tương tác!`);
                }
            }
        } catch (error) {
            toast.error("Vui lòng đăng nhập để bình luận");
        }
    };

    const getBadgeColor = (type) => {
        switch(type) {
            case 'PROMOTION': return 'bg-red-100 text-red-600';
            case 'NEW_MENU': return 'bg-orange-100 text-orange-600';
            case 'MINIGAME': return 'bg-purple-100 text-purple-600';
            case 'HOT_TIME': return 'bg-yellow-100 text-yellow-600';
            default: return 'bg-blue-100 text-blue-600';
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006a6a]"></div></div>;

    return (
        <div className="bg-gray-100 min-h-screen pt-5 pb-20">
            <div className="max-w-4xl mx-auto px-4">
                <div className="mb-6 flex items-center gap-2">
                    <FaFire className="text-orange-500 text-2xl" />
                    <h1 className="text-2xl font-black text-gray-800">Bảng tin</h1>
                </div>

                {posts.length === 0 ? (
                    <div className="text-center text-gray-500 py-10 bg-white rounded-xl shadow-sm border border-gray-100">Chưa có bài đăng nào.</div>
                ) : (
                    <div className="space-y-6">
                        {posts.map(post => (
                            <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                {/* Header */}
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-teal-400 to-[#006a6a] flex items-center justify-center text-white font-bold">
                                            {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'A'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg">{post.author_name || 'Admin'}</h3>
                                            <div className="flex items-center gap-2 text-base text-gray-500 mt-0.5">
                                                <span>{new Date(post.created_at).toLocaleString('vi-VN')}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getBadgeColor(post.type)}`}>
                                                    {post.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600"><MdOutlineMoreVert size={20} /></button>
                                </div>

                                {/* Content */}
                                <div className="px-4 pb-3">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{post.title}</h2>
                                    <div className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: post.content }}></div>
                                </div>

                                {/* Media */}
                                {post.media_url && (
                                    <div className="w-full bg-gray-50 max-h-[500px] overflow-hidden flex justify-center">
                                        <img src={post.media_url} alt="Post media" className="object-cover w-full" />
                                    </div>
                                )}

                                {/* Tags (Vouchers, Foods, etc) */}
                                {post.tags && post.tags.length > 0 && (
                                    <div className="px-4 py-3 border-t border-gray-50 flex gap-2 overflow-x-auto hide-scrollbar">
                                        {post.tags.map(tag => (
                                            <div key={tag.id} className="bg-[#006a6a]/10 text-[#006a6a] text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0">
                                                🏷️ {tag.tag_type} #{tag.tag_id}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Interaction Counts */}
                                <div className="px-4 py-2 flex items-center justify-between text-base text-gray-500 border-t border-gray-100">
                                    <span>{post.like_count} lượt thích</span>
                                    <span>{post.comment_count} bình luận</span>
                                </div>

                                {/* Actions */}
                                <div className="px-2 py-1 flex items-center justify-between border-t border-gray-100">
                                    <button 
                                        onClick={() => handleLike(post.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-sm transition-colors ${post.is_liked ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <MdThumbUp size={20} className={post.is_liked ? 'text-blue-600' : ''} /> Thích
                                    </button>
                                    <button 
                                        onClick={() => openComments(post.id)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-500 hover:bg-gray-50 rounded-lg font-semibold text-sm transition-colors"
                                    >
                                        <MdChatBubbleOutline size={20} /> Bình luận
                                    </button>
                                    <button 
                                        onClick={() => handleShare(post.id)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-500 hover:bg-gray-50 rounded-lg font-semibold text-sm transition-colors"
                                    >
                                        <MdShare size={20} /> Chia sẻ
                                    </button>
                                </div>

                                {/* Comments Section */}
                                {activeCommentPost === post.id && (
                                    <div className="bg-gray-50 p-4 border-t border-gray-100">
                                        <form onSubmit={(e) => handleCommentSubmit(e, post.id)} className="flex gap-2 mb-4">
                                            <input 
                                                type="text" 
                                                value={commentText}
                                                onChange={e => setCommentText(e.target.value)}
                                                placeholder="Viết bình luận..." 
                                                className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006a6a]/20"
                                            />
                                            <button type="submit" disabled={!commentText.trim()} className="bg-[#006a6a] text-white px-4 rounded-full text-sm font-bold disabled:opacity-50">Gửi</button>
                                        </form>
                                        
                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                            {comments.length === 0 ? (
                                                <div className="text-center text-base text-gray-400 py-2">Chưa có bình luận nào.</div>
                                            ) : comments.map(cmt => (
                                                <div key={cmt.id} className="flex flex-col gap-2">
                                                    <div className="flex gap-2 text-base">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold shrink-0 text-base">
                                                            {cmt.user_name ? cmt.user_name.charAt(0).toUpperCase() : 'U'}
                                                        </div>
                                                        <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-none border border-gray-100 max-w-[85%]">
                                                            <div className="flex justify-between items-center mb-0.5">
                                                                <h4 className="font-bold text-gray-800 text-base">{cmt.user_name || 'Khách'}</h4>
                                                            </div>
                                                            <p className="text-gray-600 text-base">{cmt.content}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Render Replies */}
                                                    {cmt.replies && cmt.replies.length > 0 && (
                                                        <div className="flex flex-col gap-2 pl-10 mt-1">
                                                            {cmt.replies.map(reply => (
                                                                <div key={reply.id} className="flex gap-2 text-sm">
                                                                    <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold shrink-0 text-[10px] mt-1">
                                                                        {reply.user_name ? reply.user_name.charAt(0).toUpperCase() : 'U'}
                                                                    </div>
                                                                    <div className="bg-[#f0f9f9] px-3 py-2 rounded-2xl rounded-tl-none border border-teal-100 max-w-[90%]">
                                                                        <div className="flex justify-between items-center mb-0.5">
                                                                            <h4 className="font-bold text-[#006a6a] text-base">Quản trị viên ({reply.user_name || 'Admin'})</h4>
                                                                        </div>
                                                                        <p className="text-gray-700 text-sm">{reply.content}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedPage;
