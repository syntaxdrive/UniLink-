
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, Heart, Share2, BadgeCheck, Loader2, Send, School, Globe, Image as ImageIcon, X, Paperclip, Building2 } from 'lucide-react';
import { Post, Comment, User } from '../types';

interface FeedProps {
  onProfileClick: (userId: string) => void;
}

export const Feed: React.FC<FeedProps> = ({ onProfileClick }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [feedType, setFeedType] = useState<'global' | 'campus'>('global');
  
  // Media Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comment State
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUser();
    // Real-time subscription for new posts
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const newPostId = payload.new.id;
        // Fetch the full post with author details
        const { data } = await supabase.from('posts').select('*, author:profiles(*)').eq('id', newPostId).single();
        if (data) {
          setPosts((prevPosts) => [data as unknown as Post, ...prevPosts]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch posts only after we have the user (to check likes)
  useEffect(() => {
    if (currentUser) {
        fetchPosts(currentUser.id);
    }
  }, [currentUser, feedType]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const mappedUser: User = {
        ...profile,
        account_type: profile.account_type || 'student'
      };
      setCurrentUser(mappedUser);
    } else {
        setLoading(false); // Stop loading if no user
    }
  };

  const fetchPosts = async (userId: string) => {
    try {
      setLoading(true);
      // 1. Fetch Posts
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`*, author:profiles(*)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!postsData) return;

      // 2. Fetch User's Likes (to set user_has_liked)
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId);

      const likedPostIds = new Set(likesData?.map((l: any) => l.post_id));

      // 3. Merge Data
      const formattedPosts = postsData.map((post: any) => ({
        ...post,
        user_has_liked: likedPostIds.has(post.id)
      }));

      setPosts(formattedPosts as Post[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Interactions ---

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !currentUser) return;

    const hasLiked = post.user_has_liked;
    const newLikes = hasLiked ? Math.max(0, post.likes - 1) : post.likes + 1;

    // Optimistic Update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, likes: newLikes, user_has_liked: !hasLiked }
        : p
    ));

    try {
        if (hasLiked) {
            // Unlike: Remove from post_likes table
            await supabase.from('post_likes').delete().match({ post_id: postId, user_id: currentUser.id });
        } else {
            // Like: Add to post_likes table
            await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
            
            // Create Notification if not liking own post
            if (post.author.id !== currentUser.id) {
               await supabase.from('notifications').insert({
                  user_id: post.author.id, // Recipient (Post Author)
                  type: 'like',
                  content: 'liked your post',
                  is_read: false,
                  related_id: postId,
                  actor_data: { 
                      name: currentUser.name, 
                      avatar_url: currentUser.avatar 
                  }
               });
            }
        }
        
        // Update the counter on the post itself
        await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
    } catch (err) {
        console.error("Error updating like:", err);
    }
  };

  const handleShare = async (post: Post) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.author.name}`,
          text: post.content,
          url: window.location.href, 
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async () => {
    if ((!newPostContent.trim() && !selectedFile) || !currentUser) return;
    setSending(true);
    
    try {
      let imageUrl = null;
      // In a real app, upload 'selectedFile' to Supabase Storage here.
      if (selectedFile) {
        // Simulating upload...
        imageUrl = "https://picsum.photos/seed/" + Date.now() + "/800/600"; 
      }

      const { error } = await supabase.from('posts').insert([
        {
          user_id: currentUser.id,
          content: newPostContent,
          tag: currentUser.account_type === 'organization' ? 'Company Update' : 'General',
          image_url: imageUrl,
          likes: 0,
          comments: 0
        }
      ]);

      if (error) throw error;
      setNewPostContent('');
      clearFile();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to post');
    } finally {
      setSending(false);
    }
  };

  const toggleComments = async (postId: string) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
    } else {
      setActiveCommentPostId(postId);
      fetchComments(postId);
    }
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    const { data } = await supabase
        .from('comments')
        .select(`
            *,
            author:profiles(*)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
    
    setPostComments(prev => ({ ...prev, [postId]: (data as unknown as Comment[]) || [] }));
    setLoadingComments(prev => ({ ...prev, [postId]: false }));
  };

  const handlePostComment = async (postId: string) => {
    if (!commentText.trim() || !currentUser) return;
    
    const tempId = Date.now().toString();
    const newComment: Comment = {
      id: tempId,
      user_id: currentUser.id,
      post_id: postId,
      content: commentText,
      created_at: new Date().toISOString(),
      author: currentUser
    };

    const post = posts.find(p => p.id === postId);

    // Optimistic Update: Add to local list
    setPostComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment]
    }));
    
    // Optimistic Update: Increment count
    setPosts(prev => prev.map(p => p.id === postId ? {...p, comments_count: (p.comments_count || 0) + 1} : p));
    setCommentText('');

    try {
        // Insert into DB
        await supabase.from('comments').insert({
            post_id: postId,
            user_id: currentUser.id,
            content: newComment.content
        });

        // Update post comment count in DB
        if (post) {
             await supabase.from('posts').update({ comments_count: (post.comments_count || 0) + 1 }).eq('id', postId);
             
             // Create Notification if not commenting on own post
             if (post.author.id !== currentUser.id) {
               await supabase.from('notifications').insert({
                  user_id: post.author.id, // Recipient (Post Author)
                  type: 'comment',
                  content: 'commented on your post',
                  is_read: false,
                  related_id: postId,
                  actor_data: { 
                      name: currentUser.name, 
                      avatar_url: currentUser.avatar 
                  }
               });
            }
        }
    } catch (err) {
        console.error("Error posting comment", err);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (feedType === 'campus' && currentUser && currentUser.account_type === 'student') {
      return post.author?.university === currentUser.university;
    }
    return true;
  });

  const isOrg = currentUser?.account_type === 'organization';

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-0">
      <header className="mb-6 sticky top-[65px] md:top-0 bg-stone-50 pt-2 pb-2 z-20 transition-all">
        <div className="flex justify-between items-center mb-4">
           <div>
            <h2 className="text-2xl font-bold text-stone-900">Feed</h2>
            <p className="text-stone-500 text-sm">
                {isOrg ? 'Updates from the student community' : "What's happening around you"}
            </p>
           </div>
           {/* Only show Campus toggle for Students */}
           {!isOrg && currentUser?.university && (
             <div className="bg-white p-1 rounded-xl border border-stone-200 flex shadow-sm">
               <button 
                 onClick={() => setFeedType('global')}
                 className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${feedType === 'global' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
               >
                 <Globe size={14} /> Global
               </button>
               <button 
                 onClick={() => setFeedType('campus')}
                 className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${feedType === 'campus' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
               >
                 <School size={14} /> My Campus
               </button>
             </div>
           )}
        </div>
      </header>

      {/* Create Post Input */}
      <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm mb-6 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-200 overflow-hidden shrink-0 border border-stone-100 cursor-pointer" onClick={() => currentUser && onProfileClick(currentUser.id)}>
             {currentUser?.avatar_url && <img src={currentUser.avatar_url} alt="User" className="w-full h-full object-cover"/>}
          </div>
          <div className="flex-1">
            <input 
              type="text" 
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder={
                isOrg 
                ? "Post an update, job alert, or industry news..." 
                : (feedType === 'campus' ? `Share with ${currentUser?.university} students...` : "Share with the student community...")
              }
              className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none placeholder:text-stone-400 mb-2"
            />
            
            {previewUrl && (
              <div className="relative mb-3 inline-block">
                <img src={previewUrl} alt="Preview" className="h-20 w-auto rounded-lg border border-stone-200" />
                <button 
                  onClick={clearFile}
                  className="absolute -top-2 -right-2 bg-stone-800 text-white p-1 rounded-full hover:bg-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-stone-50">
               <div className="flex gap-2">
                 <button onClick={() => fileInputRef.current?.click()} className="text-stone-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-emerald-50">
                   <ImageIcon size={20} />
                 </button>
                 <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" className="hidden" />
                 
                 <button className="text-stone-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-emerald-50">
                   <Paperclip size={20} />
                 </button>
               </div>
               
               <button 
                onClick={handleCreatePost}
                disabled={sending || (!newPostContent && !selectedFile)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <>Post <Send size={14} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-stone-300">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-300">
                <School size={32} />
              </div>
              <p className="text-stone-500 font-medium">No posts yet.</p>
              <p className="text-stone-400 text-sm">Be the first to share something!</p>
            </div>
          ) : (
            filteredPosts.map((post: any) => (
              <div key={post.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3">
                    <img 
                        src={post.author?.avatar_url || 'https://via.placeholder.com/40'} 
                        alt={post.author?.name} 
                        onClick={() => onProfileClick(post.author.id)}
                        className="w-10 h-10 rounded-full object-cover border border-stone-100 cursor-pointer hover:opacity-80 transition-opacity" 
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 
                            className="font-bold text-stone-900 text-sm cursor-pointer hover:underline"
                            onClick={() => onProfileClick(post.author.id)}
                        >
                            {post.author?.name || 'Unknown User'}
                        </h3>
                        {post.author?.is_verified && <BadgeCheck size={14} className="text-emerald-500 fill-emerald-50" />}
                      </div>
                      <p className="text-xs text-stone-500 font-medium">
                        {post.author?.account_type === 'organization' 
                            ? (post.author.industry || 'Organization') 
                            : (post.author?.university || 'Student')}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                    {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {post.tag && (
                  <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider rounded-md mb-3">
                    {post.tag}
                  </span>
                )}

                <p className="text-stone-800 text-sm mb-4 leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>

                {post.image_url && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-stone-100">
                    <img src={post.image_url} alt="Post content" className="w-full h-auto object-cover max-h-96" />
                  </div>
                )}

                <div className="flex items-center gap-6 pt-3 border-t border-stone-100">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 transition-colors text-xs font-bold group ${post.user_has_liked ? 'text-rose-500' : 'text-stone-500 hover:text-rose-500'}`}
                  >
                    <div className={`p-1.5 rounded-full transition-colors ${post.user_has_liked ? 'bg-rose-50' : 'group-hover:bg-rose-50'}`}>
                        <Heart size={16} fill={post.user_has_liked ? "currentColor" : "none"} />
                    </div>
                    <span>{post.likes || 0}</span>
                  </button>
                  <button 
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 transition-colors text-xs font-bold group"
                  >
                    <div className="p-1.5 rounded-full group-hover:bg-emerald-50 transition-colors">
                        <MessageSquare size={16} />
                    </div>
                    <span>{post.comments_count || 0}</span>
                  </button>
                  <button 
                    onClick={() => handleShare(post)}
                    className="flex items-center gap-2 text-stone-500 hover:text-indigo-600 transition-colors text-xs font-bold group ml-auto"
                  >
                    <div className="p-1.5 rounded-full group-hover:bg-indigo-50 transition-colors">
                        <Share2 size={16} />
                    </div>
                  </button>
                </div>

                {/* Comment Section */}
                {activeCommentPostId === post.id && (
                  <div className="mt-4 pt-4 border-t border-stone-100 bg-stone-50/50 -mx-5 px-5 pb-2">
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                      {loadingComments[post.id] ? (
                          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-stone-300" size={20}/></div>
                      ) : (
                          (postComments[post.id] || []).length === 0 ? (
                            <p className="text-xs text-stone-400 text-center py-2">No comments yet. Be the first!</p>
                          ) : (
                            (postComments[post.id] || []).map((comment) => (
                                <div key={comment.id} className="flex gap-2 items-start">
                                <img 
                                    src={comment.author?.avatar_url || 'https://via.placeholder.com/30'} 
                                    className="w-6 h-6 rounded-full object-cover cursor-pointer" 
                                    onClick={() => onProfileClick(comment.author?.id || '')}
                                />
                                <div className="bg-white p-2 rounded-r-xl rounded-bl-xl shadow-sm border border-stone-100 text-xs">
                                    <span 
                                        className="font-bold block text-stone-800 cursor-pointer hover:underline"
                                        onClick={() => onProfileClick(comment.author?.id || '')}
                                    >
                                        {comment.author?.name}
                                    </span>
                                    <span className="text-stone-600">{comment.content}</span>
                                </div>
                                </div>
                            ))
                          )
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handlePostComment(post.id)}
                      />
                      <button 
                        onClick={() => handlePostComment(post.id)}
                        disabled={!commentText.trim()}
                        className="text-emerald-600 p-2 hover:bg-emerald-50 rounded-lg disabled:opacity-30"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
