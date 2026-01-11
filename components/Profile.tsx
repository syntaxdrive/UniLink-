
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BadgeCheck, BookOpen, Trophy, Github, Linkedin, ExternalLink, Loader2, Edit2, Save, X, Building2, MapPin, Globe, Briefcase, Mail, CheckCircle2, UserPlus, MessageCircle, Shield, ShieldAlert } from 'lucide-react';
import { User } from '../types';

// Hardcoded Admin Email for the prototype
const ADMIN_EMAIL = 'admin@unilink.ng';

interface ProfileProps {
  userId?: string | null; // If null, viewing self
}

export const Profile: React.FC<ProfileProps> = ({ userId }) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Verification State
  const [showVerify, setShowVerify] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifySent, setVerifySent] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    bio: '',
    courses: '',
    skills: '',
    university: '',
    department: '',
    level: '',
    industry: '',
    location: '',
    website: '',
    name: ''
  });

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if current logged in user is Admin
    if (user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
    }
    
    // Determine which ID to fetch
    const targetId = userId || user?.id;
    
    if (targetId) {
      // Fetch Target Profile
      const { data, error } = await supabase.from('profiles').select('*').eq('id', targetId).single();
      
      if (data && !error) {
        const mappedUser = mapProfileToUser(data);
        setProfile(mappedUser);
        
        // Initialize form data
        setFormData({
            bio: mappedUser.bio,
            courses: (mappedUser.courses || []).join(', '),
            skills: (mappedUser.skills || []).join(', '),
            university: mappedUser.university || '',
            department: mappedUser.department || '',
            level: mappedUser.level || '',
            industry: mappedUser.industry || '',
            location: mappedUser.location || '',
            website: mappedUser.website || '',
            name: mappedUser.name || ''
        });

        // If we are viewing someone else, check connection status
        if (user && userId && userId !== user.id) {
            setCurrentUser({ id: user.id } as User); // Minimal current user
            const { data: conn } = await supabase.from('connections')
                .select('status')
                .or(`and(requester_id.eq.${user.id},recipient_id.eq.${userId}),and(requester_id.eq.${userId},recipient_id.eq.${user.id})`)
                .maybeSingle();
            
            if (conn) setConnectionStatus(conn.status);
        } else if (user && !userId) {
            // Viewing self
            setCurrentUser(mappedUser); 
        }
      }
    }
    setLoading(false);
  };

  const mapProfileToUser = (data: any): User => ({
    id: data.id,
    name: data.name,
    avatar: data.avatar_url,
    isVerified: data.is_verified,
    account_type: data.account_type || 'student', 
    bio: data.bio || '',
    university: data.university,
    department: data.department,
    level: data.level || 'Student',
    courses: data.courses || [],
    skills: data.skills || [],
    badges: data.badges || [],
    industry: data.industry,
    location: data.location,
    website: data.website
  });

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    
    let updates: any = {
        bio: formData.bio,
        name: formData.name
    };

    if (profile.account_type === 'student') {
        updates = {
            ...updates,
            university: formData.university,
            department: formData.department,
            level: formData.level,
            courses: formData.courses.split(',').map(s => s.trim()).filter(Boolean),
            skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        };
    } else {
        updates = {
            ...updates,
            industry: formData.industry,
            location: formData.location,
            website: formData.website,
            skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean)
        };
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);

    if (error) {
        alert('Error updating profile');
    } else {
        setEditing(false);
        fetchProfileData(); // Refresh
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    if (!currentUser || !profile) return;
    setConnectionStatus('pending');
    
    try {
        await supabase.from('connections').insert({
            requester_id: currentUser.id,
            recipient_id: profile.id,
            status: 'pending'
        });

        // Notification
        const { data: myProfile } = await supabase.from('profiles').select('name, avatar_url').eq('id', currentUser.id).single();
        await supabase.from('notifications').insert({
            user_id: profile.id,
            type: 'connect',
            content: 'sent you a connection request',
            is_read: false,
            actor_data: {
                name: myProfile?.name || 'A user',
                avatar_url: myProfile?.avatar_url || ''
            }
        });

    } catch (e) {
        console.error(e);
        setConnectionStatus('none');
    }
  };

  const handleAdminVerify = async () => {
    if (!profile) return;
    
    const newStatus = !profile.isVerified;
    
    // Optimistic UI update
    setProfile(prev => prev ? { ...prev, isVerified: newStatus } : null);

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ is_verified: newStatus })
            .eq('id', profile.id);

        if (error) throw error;
        
        // Optional: Notify user they were verified
        if (newStatus) {
             await supabase.from('notifications').insert({
                user_id: profile.id,
                type: 'system',
                content: `Congratulations! Your account has been verified by an admin.`,
                is_read: false,
                actor_data: {
                    name: 'UniLink Admin',
                    avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=10b981&color=fff'
                }
            });
        }

    } catch (error) {
        console.error('Error updating verification:', error);
        // Revert on error
        setProfile(prev => prev ? { ...prev, isVerified: !newStatus } : null);
        alert('Failed to update verification status.');
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyEmail.endsWith('.edu.ng')) {
        setVerifySent(true);
        setTimeout(() => {
            setShowVerify(false);
            setVerifySent(false);
            setVerifyEmail('');
            alert("Verification link sent! (Simulated)");
        }, 2000);
    } else {
        alert("Please enter a valid .edu.ng email address");
    }
  };

  if (loading && !profile) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;
  }

  if (!profile) return <div>Profile not found</div>;

  const isOwnProfile = !userId || (currentUser && userId === currentUser.id);
  const isOrg = profile.account_type === 'organization';

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-0">
      
      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm relative mb-6 group">
        <div className="h-32 bg-gradient-to-r from-emerald-600 to-teal-500 relative">
          
          {/* Edit Buttons - Only show if own profile */}
          {isOwnProfile && (
             <>
                {editing ? (
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => setEditing(false)} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl backdrop-blur-sm transition-colors">
                        <X size={20}/>
                        </button>
                        <button onClick={handleSave} className="bg-white text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
                        <Save size={16}/> Save
                        </button>
                    </div>
                ) : (
                    <button 
                    onClick={() => setEditing(true)}
                    className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl backdrop-blur-sm transition-colors"
                    >
                    <Edit2 size={18} />
                    </button>
                )}
             </>
          )}
        </div>
        
        <div className="px-6 pb-6">
          <div className="relative -mt-12 mb-4 flex justify-between items-end">
             <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-md">
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover rounded-xl bg-stone-100" />
                </div>
                {profile.isVerified && (
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm" title="Verified">
                    <BadgeCheck size={16} />
                  </div>
                )}
             </div>

             {/* Action Buttons for Other Profiles */}
             {!isOwnProfile && (
                 <div className="flex gap-2">
                    {/* Admin Verify Button */}
                    {isAdmin && (
                        <button 
                            onClick={handleAdminVerify}
                            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all ${
                                profile.isVerified
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                            }`}
                        >
                            {profile.isVerified ? <ShieldAlert size={18}/> : <Shield size={18}/>}
                            {profile.isVerified ? 'Revoke' : 'Verify'}
                        </button>
                    )}

                    {connectionStatus === 'accepted' ? (
                        <button className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                            <MessageCircle size={18}/> Message
                        </button>
                    ) : connectionStatus === 'pending' ? (
                        <button disabled className="bg-stone-100 text-stone-500 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                            <CheckCircle2 size={18}/> Request Sent
                        </button>
                    ) : (
                        <button onClick={handleConnect} className="bg-stone-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-stone-800 shadow-md flex items-center gap-2">
                            <UserPlus size={18}/> Connect
                        </button>
                    )}
                 </div>
             )}
          </div>

          {editing ? (
            <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div>
                   <label className="text-xs font-bold text-stone-400 uppercase">Display Name</label>
                   <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-b border-stone-200 py-1 font-bold text-stone-900 focus:outline-none focus:border-emerald-500"/>
                </div>
                {isOrg ? (
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-stone-400 uppercase">Industry</label>
                        <input value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full border-b border-stone-200 py-1 text-sm focus:outline-none focus:border-emerald-500"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-stone-400 uppercase">Location</label>
                        <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border-b border-stone-200 py-1 text-sm focus:outline-none focus:border-emerald-500"/>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-stone-400 uppercase">Website</label>
                        <input value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full border-b border-stone-200 py-1 text-sm focus:outline-none focus:border-emerald-500"/>
                      </div>
                   </div>
                ) : (
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-stone-400 uppercase">University</label>
                        <input value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} className="w-full border-b border-stone-200 py-1 text-sm focus:outline-none focus:border-emerald-500"/>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-stone-400 uppercase">Department</label>
                        <input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full border-b border-stone-200 py-1 text-sm focus:outline-none focus:border-emerald-500"/>
                      </div>
                   </div>
                )}
                <div>
                   <label className="text-xs font-bold text-stone-400 uppercase">Bio</label>
                   <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full border border-stone-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 mt-1" rows={3}/>
                </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-stone-900 mb-1">{profile.name}</h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-stone-500 text-sm mb-4">
                        {isOrg ? (
                            <>
                                <span className="flex items-center gap-1"><Briefcase size={14}/> {profile.industry}</span>
                                <span className="flex items-center gap-1"><MapPin size={14}/> {profile.location}</span>
                                {profile.website && (
                                    <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline">
                                        <Globe size={14}/> {profile.website.replace(/^https?:\/\//, '')}
                                    </a>
                                )}
                            </>
                        ) : (
                            <>
                                <span>{profile.level}</span>
                                <span>•</span>
                                <span>{profile.department}</span>
                                <span>•</span>
                                <span>{profile.university}</span>
                            </>
                        )}
                    </div>
                  </div>
                  
                  {/* Verification Button for Students (Own Profile Only) */}
                  {isOwnProfile && !isOrg && !profile.isVerified && (
                     <button 
                        onClick={() => setShowVerify(true)}
                        className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1"
                     >
                        Verify Status <BadgeCheck size={14}/>
                     </button>
                  )}
              </div>

              {/* Verify Modal Form */}
              {showVerify && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-stone-900 text-sm">Verify Student Status</h3>
                        <button onClick={() => setShowVerify(false)} className="text-stone-400 hover:text-stone-600"><X size={16}/></button>
                    </div>
                    <p className="text-xs text-stone-500 mb-3">
                        Enter your school email ending in <b>.edu.ng</b> to get the verified badge.
                    </p>
                    {verifySent ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-white p-3 rounded-lg border border-emerald-100">
                            <CheckCircle2 size={18}/> Verification link sent!
                        </div>
                    ) : (
                        <form onSubmit={handleVerifySubmit} className="flex gap-2">
                            <div className="relative flex-1">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input 
                                    type="email" 
                                    required 
                                    placeholder="yourname@student.unilag.edu.ng"
                                    value={verifyEmail}
                                    onChange={e => setVerifyEmail(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <button type="submit" className="bg-stone-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-stone-800">
                                Send
                            </button>
                        </form>
                    )}
                </div>
              )}

              <div className="flex gap-2 mb-6">
                 {/* Social Links Placeholder */}
                 <button className="p-2 bg-stone-50 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"><Linkedin size={18}/></button>
                 <button className="p-2 bg-stone-50 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"><Github size={18}/></button>
                 <button className="p-2 bg-stone-50 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"><ExternalLink size={18}/></button>
              </div>

              <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                 <h3 className="text-xs font-bold text-stone-400 uppercase mb-2">
                    {isOrg ? 'About Company' : 'About Me'}
                 </h3>
                 <p className="text-stone-700 text-sm leading-relaxed">
                   {profile.bio || "No bio yet."}
                 </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats / Badges (Student Only) */}
      {!isOrg && (profile.badges || []).length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3">
            {(profile.badges || []).map((badge, i) => (
               <div key={i} className="bg-white p-3 rounded-xl border border-stone-200 flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">{badge}</p>
                    <p className="text-[10px] text-stone-500 uppercase font-bold">Verified Skill</p>
                  </div>
               </div>
            ))}
        </div>
      )}

      {/* Details Section */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Skills / Tech Stack */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
            <BadgeCheck className="text-emerald-500" size={20}/>
            {isOrg ? 'Tech Stack & Requirements' : 'Skills & Tools'}
          </h3>
          
          {editing ? (
             <div>
                <label className="text-xs text-stone-400 mb-1 block">Comma separated</label>
                <textarea 
                  value={formData.skills} 
                  onChange={e => setFormData({...formData, skills: e.target.value})}
                  className="w-full border border-stone-200 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
                  rows={3}
                />
             </div>
          ) : (
            <div className="flex flex-wrap gap-2">
                {(profile.skills || []).length === 0 && <p className="text-stone-400 text-sm italic">No skills listed.</p>}
                {(profile.skills || []).map((skill, i) => (
                <span key={i} className="bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg text-sm font-medium">
                    {skill}
                </span>
                ))}
            </div>
          )}
        </div>

        {/* Coursework (Student Only) */}
        {!isOrg && (
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
                <BookOpen className="text-indigo-500" size={20}/>
                Relevant Coursework
            </h3>
            
            {editing ? (
                <div>
                    <label className="text-xs text-stone-400 mb-1 block">Comma separated (e.g. ECO 101, CSC 202)</label>
                    <textarea 
                    value={formData.courses} 
                    onChange={e => setFormData({...formData, courses: e.target.value})}
                    className="w-full border border-stone-200 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
                    rows={3}
                    />
                </div>
            ) : (
                <div className="space-y-3">
                    {(profile.courses || []).length === 0 && <p className="text-stone-400 text-sm italic">No coursework listed.</p>}
                    {(profile.courses || []).map((course, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                        <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                        <span className="text-stone-700 font-medium text-sm">{course}</span>
                    </div>
                    ))}
                </div>
            )}
            </div>
        )}
      </div>
    </div>
  );
};
