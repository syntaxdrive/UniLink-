
import React, { useState, useEffect } from 'react';
import { View } from './types';
import { Sidebar, MobileHeader } from './components/Navigation';
import { Feed } from './components/Feed';
import { JobBoard } from './components/JobBoard';
import { Profile } from './components/Profile';
import { CareerAI } from './components/CareerAI';
import { Messages } from './components/Messages';
import { Network } from './components/Network';
import { Notifications } from './components/Notifications';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setView] = useState<View>(View.FEED);
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State to track which profile is being viewed (null = current user)
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  useEffect(() => {
    // Check active session
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setUserProfile(data);
    } catch (e) {
      console.error('Error fetching profile', e);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (userId: string | null) => {
    setViewingProfileId(userId);
    setView(View.PROFILE);
  };

  const handleNavChange = (view: View) => {
    // If navigating to Profile via menu, reset to current user
    if (view === View.PROFILE) {
        setViewingProfileId(null);
    }
    setView(view);
  };

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-stone-50"><Loader2 className="animate-spin" /></div>;
  }

  if (!session) {
    return <Auth onLogin={() => {}} />;
  }

  const renderView = () => {
    switch (currentView) {
      case View.FEED:
        return <Feed onProfileClick={handleViewProfile} />;
      case View.JOBS:
        return <JobBoard userType={userProfile?.account_type || 'student'} onProfileClick={handleViewProfile} />;
      case View.PROFILE:
        return <Profile userId={viewingProfileId} />;
      case View.CAREER_AI:
        return <CareerAI />;
      case View.MESSAGES:
        return <Messages />;
      case View.NETWORK:
        return <Network onProfileClick={handleViewProfile} />;
      case View.NOTIFICATIONS:
        return <Notifications onProfileClick={handleViewProfile} />;
      default:
        return <Feed onProfileClick={handleViewProfile} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 selection:bg-emerald-200 flex flex-col md:flex-row">
      
      {/* Mobile Top Header */}
      <MobileHeader onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Main Layout Container - Full Width */}
      <div className="flex-1 flex relative">
        
        {/* Left Sidebar (Responsive) */}
        <Sidebar 
          currentView={currentView} 
          setView={handleNavChange} 
          isOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)}
          accountType={userProfile?.account_type || 'student'}
        />

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-stone-900/50 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 md:border-r border-stone-200">
          <div className="p-4 md:p-8">
            {renderView()}
          </div>
        </main>

        {/* Right Sidebar (Desktop Only) */}
        <aside className="hidden lg:block w-80 p-8 h-screen sticky top-0 overflow-y-auto border-l border-stone-200/50">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm mb-6">
            <h3 className="font-bold text-stone-800 mb-3 text-sm">Suggestions for you</h3>
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-stone-200 flex-shrink-0"></div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-semibold truncate">Economics Students Assoc.</p>
                   <p className="text-xs text-stone-500">Unilag Chapter</p>
                 </div>
                 <button className="text-emerald-600 font-bold text-xs">Join</button>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-stone-200 flex-shrink-0"></div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-semibold truncate">Tech Bro Internship</p>
                   <p className="text-xs text-stone-500">Lagos</p>
                 </div>
                 <button className="text-emerald-600 font-bold text-xs">Apply</button>
               </div>
            </div>
          </div>

          <div className="text-xs text-stone-400 leading-relaxed">
             <button onClick={() => supabase.auth.signOut()} className="text-stone-600 hover:text-red-500 font-bold mb-4 flex items-center gap-2">
               Sign Out
             </button>
            <p className="mb-2">UniLink Nigeria © 2024</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default App;
