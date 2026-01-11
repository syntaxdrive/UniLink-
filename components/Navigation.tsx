
import React from 'react';
import { Home, Briefcase, User, Users, Sparkles, Menu, X, MessageCircle, Network, Bell } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  accountType: 'student' | 'organization';
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, onClose, accountType }) => {
  // Base items available to everyone
  const baseItems = [
    { id: View.FEED, label: 'Campus Feed', icon: Home },
    { id: View.NETWORK, label: accountType === 'organization' ? 'Talent Pool' : 'My Network', icon: Network },
    { id: View.JOBS, label: accountType === 'organization' ? 'Manage Jobs' : 'Internships & SIWES', icon: Briefcase },
    { id: View.MESSAGES, label: 'Messages', icon: MessageCircle },
    { id: View.NOTIFICATIONS, label: 'Notifications', icon: Bell },
  ];

  // Student specific items
  const studentItems = [
    { id: View.CAREER_AI, label: 'Career Copilot', icon: Sparkles },
  ];

  // Combine based on account type
  const navItems = accountType === 'student' 
    ? [...baseItems, ...studentItems, { id: View.PROFILE, label: 'Student Profile', icon: User }]
    : [...baseItems, { id: View.PROFILE, label: 'Company Profile', icon: User }];

  const handleNavClick = (view: View) => {
    setView(view);
    onClose();
  };

  return (
    <>
      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:h-screen md:sticky md:top-0
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:shadow-none'}
      `}>
        <div className="p-6 h-full flex flex-col">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">U</span>
              </div>
              <h1 className="text-xl font-bold text-emerald-900 tracking-tight">UniLink</h1>
            </div>
            {/* Close button for mobile */}
            <button onClick={onClose} className="md:hidden text-stone-500 hover:text-stone-900">
              <X size={24} />
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  currentView === item.id
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export const MobileHeader: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  return (
    <div className="md:hidden sticky top-0 bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center justify-between z-40">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">U</span>
        </div>
        <span className="text-lg font-bold text-stone-900">UniLink</span>
      </div>
      <button 
        onClick={onMenuClick}
        className="p-2 -mr-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
      >
        <Menu size={24} />
      </button>
    </div>
  );
};
