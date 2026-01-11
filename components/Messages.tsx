
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, MoreVertical, Send, Phone, Video, Loader2, User as UserIcon } from 'lucide-react';
import { User } from '../types';

export const Messages: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<User[]>([]); // People we can chat with (Connected users)
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null); // The user we are talking to
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Get current user profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setCurrentUser(profile);

    // Fetch Connections (People to chat with)
    // We get connections where status is 'accepted'
    const { data: connections } = await supabase
        .from('connections')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

    if (connections && connections.length > 0) {
        const friendIds = connections.map((c: any) => 
            c.requester_id === user.id ? c.recipient_id : c.requester_id
        );
        
        const { data: friends } = await supabase
            .from('profiles')
            .select('*')
            .in('id', friendIds);
            
        if (friends) setConversations(friends as unknown as User[]);
    }
    setLoading(false);
  };

  // Fetch messages when active chat changes
  useEffect(() => {
    if (!activeChatUser || !currentUser) return;

    const conversationId = getConversationId(currentUser.id, activeChatUser.id);
    setLoadingMessages(true);

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
            
        if (data) {
            setMessages(data.map((msg: any) => ({
                id: msg.id,
                sender: msg.sender_id === currentUser.id ? 'me' : 'them',
                text: msg.content,
                time: new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            })));
        }
        setLoadingMessages(false);
    };

    fetchMessages();

    // Subscribe to new messages in this conversation
    const channel = supabase
        .channel(`chat:${conversationId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `conversation_id=eq.${conversationId}` 
        }, (payload) => {
             const newMsg = payload.new;
             setMessages(prev => [...prev, {
                 id: newMsg.id,
                 sender: newMsg.sender_id === currentUser.id ? 'me' : 'them',
                 text: newMsg.content,
                 time: new Date(newMsg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
             }]);
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };

  }, [activeChatUser, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages]);

  const getConversationId = (user1: string, user2: string) => {
      return [user1, user2].sort().join('_');
  };

  const handleSend = async () => {
    if (!inputText.trim() || !currentUser || !activeChatUser) return;
    
    const text = inputText;
    setInputText(''); // Clear UI immediately

    const conversationId = getConversationId(currentUser.id, activeChatUser.id);
    
    // Optimistic Update
    const tempId = Date.now();
    setMessages(prev => [...prev, {
        id: tempId,
        sender: 'me',
        text: text,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }]);

    try {
        await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: currentUser.id,
            content: text
        });
        
        // Notify the recipient (Optional structure)
        // await supabase.from('notifications').insert({...})
    } catch (error) {
        console.error("Failed to send", error);
        // Could remove the optimistic message here if it fails
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] md:h-[calc(100vh-64px)] bg-white rounded-2xl border border-stone-200 shadow-sm flex overflow-hidden">
      
      {/* Sidebar List */}
      <div className={`w-full md:w-80 border-r border-stone-100 flex flex-col ${activeChatUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-stone-100">
          <h2 className="font-bold text-xl text-stone-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input 
              type="text" 
              placeholder="Search connections..." 
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-stone-300"/></div>
          ) : conversations.length === 0 ? (
             <div className="p-6 text-center text-stone-400">
                <UserIcon size={32} className="mx-auto mb-2 opacity-50"/>
                <p className="text-sm">No connections yet.</p>
                <p className="text-xs mt-1">Go to the Network tab to connect with people!</p>
             </div>
          ) : (
             conversations.map((user) => (
                <div 
                  key={user.id}
                  onClick={() => setActiveChatUser(user)}
                  className={`p-4 flex gap-3 cursor-pointer hover:bg-stone-50 transition-colors border-b border-stone-50 ${activeChatUser?.id === user.id ? 'bg-emerald-50/50' : ''}`}
                >
                  <div className="relative">
                    <img src={user.avatar || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full object-cover border border-stone-100" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-sm text-stone-900 truncate">{user.name}</h3>
                    <p className="text-xs text-stone-500 truncate">
                        {user.account_type === 'student' ? user.university : user.industry}
                    </p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeChatUser ? (
        <div className={`flex-1 flex flex-col ${activeChatUser ? 'flex' : 'hidden md:flex'}`}>
          {/* Chat Header */}
          <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-white shadow-sm z-10">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveChatUser(null)} className="md:hidden text-stone-500 font-bold text-sm">Back</button>
              <img src={activeChatUser.avatar || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full border border-stone-100" />
              <div>
                 <h3 className="font-bold text-stone-900">{activeChatUser.name}</h3>
                 <p className="text-xs text-emerald-600 flex items-center gap-1">
                   {activeChatUser.account_type === 'student' ? activeChatUser.department : activeChatUser.location}
                 </p>
              </div>
            </div>
            <div className="flex gap-2 text-stone-400">
               <button className="p-2 hover:bg-stone-50 rounded-full"><Phone size={20}/></button>
               <button className="p-2 hover:bg-stone-50 rounded-full"><Video size={20}/></button>
               <button className="p-2 hover:bg-stone-50 rounded-full"><MoreVertical size={20}/></button>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
            {loadingMessages ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-stone-300"/></div>
            ) : messages.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <p className="text-sm text-stone-500">Start a conversation with {activeChatUser.name.split(' ')[0]}</p>
                </div>
            ) : (
                messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'me' 
                        ? 'bg-emerald-600 text-white rounded-br-none' 
                        : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none'
                    }`}>
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 text-right ${msg.sender === 'me' ? 'text-emerald-200' : 'text-stone-400'}`}>{msg.time}</p>
                    </div>
                </div>
                ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-stone-100">
            <div className="flex gap-2">
              <input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-stone-100 border-0 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button 
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col text-stone-300 bg-stone-50">
           <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center mb-4">
             <Send size={40} className="ml-1 mt-1 text-stone-400" />
           </div>
           <p className="font-bold text-stone-400">Select a connection to start messaging</p>
        </div>
      )}
    </div>
  );
};
