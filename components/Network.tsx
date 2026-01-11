
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, UserPlus, Check, Loader2, MapPin, Building2, GraduationCap, Clock } from 'lucide-react';
import { User, Connection } from '../types';

interface NetworkProps {
    onProfileClick: (userId: string) => void;
}

export const Network: React.FC<NetworkProps> = ({ onProfileClick }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track status of connections: 'pending', 'accepted', or null (not connected)
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'pending' | 'accepted'>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserType, setCurrentUserType] = useState<'student' | 'organization'>('student');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setCurrentUser(user);

    // 1. Get Current User Profile for Type
    const { data: profile } = await supabase.from('profiles').select('account_type, name, avatar_url').eq('id', user.id).single();
    if (profile) setCurrentUserType(profile.account_type);

    // 2. Fetch Potential Connections (Users)
    const { data: profiles, error } = await supabase.from('profiles').select('*').limit(50);
    
    // 3. Fetch Existing Connections (where I am requester OR recipient)
    const { data: connections } = await supabase
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

    // Map connection status
    const statusMap: Record<string, 'pending' | 'accepted'> = {};
    if (connections) {
        connections.forEach((conn: any) => {
            // Identify the "other" person in the connection
            const otherId = conn.requester_id === user.id ? conn.recipient_id : conn.requester_id;
            statusMap[otherId] = conn.status;
        });
    }
    setConnectionStatus(statusMap);

    if (!error && profiles) {
      // Map basic profile data
      const mappedUsers = profiles.map((p: any) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar_url,
        account_type: p.account_type || 'student',
        university: p.university,
        department: p.department,
        level: p.level,
        industry: p.industry,
        location: p.location,
        isVerified: p.is_verified,
        courses: [],
        skills: p.skills || [],
        badges: [],
        bio: p.bio || ''
      }));

      // Filter logic:
      // Org sees only Students (Talent)
      // Student sees everyone (except themselves)
      let displayUsers = mappedUsers.filter((u: User) => u.id !== user.id);
      
      if (profile?.account_type === 'organization') {
        displayUsers = displayUsers.filter((u: User) => u.account_type === 'student');
      }

      setUsers(displayUsers);
    }
    setLoading(false);
  };

  const handleConnect = async (recipientId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (!currentUser) return;

    // Optimistic Update
    setConnectionStatus(prev => ({ ...prev, [recipientId]: 'pending' }));

    try {
        // 1. Create Connection Record
        const { error } = await supabase.from('connections').insert({
            requester_id: currentUser.id,
            recipient_id: recipientId,
            status: 'pending'
        });

        if (error) throw error;

        // 2. Send Notification to Recipient
        // We need current user details for the notification content
        const { data: myProfile } = await supabase.from('profiles').select('name, avatar_url').eq('id', currentUser.id).single();
        
        await supabase.from('notifications').insert({
            user_id: recipientId, // To
            type: 'connect',
            content: 'sent you a connection request',
            is_read: false,
            actor_data: {
                name: myProfile?.name || 'A user',
                avatar_url: myProfile?.avatar_url || ''
            }
        });

    } catch (err) {
        console.error("Error connecting:", err);
        // Revert on error
        const newStatus = { ...connectionStatus };
        delete newStatus[recipientId];
        setConnectionStatus(newStatus);
        alert("Failed to send request.");
    }
  };

  const filteredUsers = users.filter(user => {
    const term = searchQuery.toLowerCase();
    return user.name.toLowerCase().includes(term) || 
           (user.university && user.university.toLowerCase().includes(term)) ||
           (user.department && user.department.toLowerCase().includes(term)) ||
           (user.industry && user.industry.toLowerCase().includes(term)) ||
           (user.skills && user.skills.some(s => s.toLowerCase().includes(term)));
  });

  const isOrg = currentUserType === 'organization';

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-0">
      <div className="sticky top-[65px] md:top-0 bg-stone-50 pt-2 pb-4 z-10">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-stone-900">{isOrg ? 'Talent Pool' : 'Network'}</h2>
          <p className="text-stone-500 text-sm">
            {isOrg ? 'Discover top students for your opportunities' : 'Discover students and organizations'}
          </p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input 
            type="text" 
            placeholder={isOrg ? "Search by skill, department, or university..." : "Search by name, school, industry..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-stone-400"/></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredUsers.length === 0 ? (
             <div className="col-span-full text-center py-20 text-stone-400">
               No profiles found.
             </div>
          ) : (
            filteredUsers.map((user) => {
              const status = connectionStatus[user.id];
              const isConnected = status === 'accepted';
              const isPending = status === 'pending';

              return (
                <div 
                    key={user.id} 
                    onClick={() => onProfileClick(user.id)}
                    className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center cursor-pointer group"
                >
                  <div className="relative w-20 h-20 mb-3 group-hover:scale-105 transition-transform">
                    <img src={user.avatar || 'https://via.placeholder.com/80'} alt={user.name} className="w-full h-full rounded-full object-cover border-2 border-white shadow-sm" />
                    {user.isVerified && (
                      <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full border-2 border-white">
                        <Check size={10} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-stone-900 text-base group-hover:text-emerald-700 transition-colors">{user.name}</h3>
                  
                  {/* Account Type Specific Subtitles */}
                  {user.account_type === 'organization' ? (
                      <>
                          <p className="text-xs text-stone-500 font-medium mb-1">{user.industry}</p>
                          <div className="flex items-center gap-1 text-xs text-stone-400 bg-stone-50 px-2 py-1 rounded-full mb-4">
                              <Building2 size={10} />
                              <span className="truncate max-w-[120px]">{user.location}</span>
                          </div>
                      </>
                  ) : (
                      <>
                          <p className="text-xs text-stone-500 font-medium mb-1">{user.department}</p>
                          <div className="flex items-center gap-1 text-xs text-stone-400 bg-stone-50 px-2 py-1 rounded-full mb-4">
                              <GraduationCap size={10} />
                              <span className="truncate max-w-[120px]">{user.university}</span>
                          </div>
                      </>
                  )}

                  <div className="flex flex-wrap gap-1 justify-center mb-4">
                     {(user.skills || []).slice(0, 2).map((skill, i) => (
                       <span key={i} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-medium">{skill}</span>
                     ))}
                  </div>

                  <button 
                    onClick={(e) => !status && handleConnect(user.id, e)}
                    disabled={!!status}
                    className={`mt-auto w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      status
                        ? 'bg-stone-100 text-stone-500 cursor-default border border-stone-200' 
                        : (isOrg ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-stone-900 text-white hover:bg-stone-800')
                    }`}
                  >
                    {isConnected && <><Check size={14} /> Connected</>}
                    {isPending && <><Clock size={14} /> Request Sent</>}
                    {!status && (
                        <>
                            <UserPlus size={14} /> 
                            {isOrg ? 'Scout Talent' : 'Connect'}
                        </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
