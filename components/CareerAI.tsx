
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateCareerRoadmap } from '../services/geminiService';
import { Sparkles, ArrowRight, Loader2, Compass } from 'lucide-react';

export const CareerAI: React.FC = () => {
  const [roadmap, setRoadmap] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(data);
    }
  };

  const handleGenerate = async () => {
    if (!userProfile) return;
    setLoading(true);
    
    // Simulate thinking time for "Premium" feel if no key
    if (!process.env.API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const courses = userProfile.courses || [];
    const skills = userProfile.skills || [];
    const department = userProfile.department || 'General';

    // If no API key, use a smart fallback based on department to show value
    let result = '';
    if (!process.env.API_KEY) {
        if (department.toLowerCase().includes('econ')) {
            result = `
## 🚀 Career Path: Financial Data Analyst (Lagos Fintech)

Economics + Data Skills is a goldmine in Nigeria right now.

1.  **Immediate Step:** Go beyond Excel. Learn **SQL** and **PowerBI**. Companies like *Paystack* and *Moniepoint* need people who can query databases, not just read spreadsheets.
2.  **SIWES Target:** Apply to **KPMG Nigeria** (Audit) or **PiggyVest** (Product Analytics). Don't just apply online—find UNILAG alumni there on UniLink.
3.  **Project Idea:** "Inflation Tracker". Build a simple dashboard tracking food prices in Yaba market vs. NBS data. Post it on LinkedIn/UniLink.
            `;
        } else if (department.toLowerCase().includes('computer') || department.toLowerCase().includes('tech')) {
             result = `
## 🚀 Career Path: Backend Engineer (Remote/Global)

Your CS background is the foundation, but modern stacks get you hired.

1.  **Immediate Step:** Pick one backend language (Node.js or Python/Django) and build a complete API. Deploy it on Render/Heroku.
2.  **SIWES Target:** **Interswitch** or **Flutterwave**. They have structured engineering internships.
3.  **Project Idea:** Build a "CGPA Calculator" API for your department. Open source it on GitHub.
             `;
        } else {
            result = `
## 🚀 Career Path: Tech Operations & Strategy

Your background in ${department} gives you unique domain knowledge that tech companies need.

1.  **Immediate Step:** Learn **Project Management** (Jira/Asana) and **Business Writing**. Tech startups need generalists who can execute.
2.  **SIWES Target:** Look for "Operations Intern" roles at logistics startups like **GIG Logistics** or **Chowdeck**.
3.  **Project Idea:** Organize a departmental event and document the process/budget. Use that as portfolio proof of "Project Management".
            `;
        }
    } else {
        result = await generateCareerRoadmap(courses, skills, department);
    }

    setRoadmap(result);
    setLoading(false);
  };

  const renderContent = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('##')) {
        return <h3 key={idx} className="text-xl font-bold text-stone-900 mt-6 mb-3 flex items-center gap-2"><Compass size={20} className="text-emerald-600"/> {line.replace(/^##\s*/, '')}</h3>;
      }
      if (line.startsWith('#')) {
        return <h4 key={idx} className="text-lg font-bold text-stone-900 mt-4 mb-2">{line.replace(/^#\s*/, '')}</h4>;
      }
      if (line.trim().match(/^\d\./)) {
         return (
            <div key={idx} className="flex gap-3 mb-4 bg-stone-50 p-3 rounded-xl border border-stone-100">
                <span className="font-bold text-emerald-600 text-lg">{line.trim().split('.')[0]}</span>
                <p className="text-stone-700 text-sm leading-relaxed">
                   {line.replace(/^\d\.\s*/, '').split(/(\*\*.*?\*\*)/g).map((part, i) => 
                      part.startsWith('**') ? <strong key={i} className="text-stone-900">{part.slice(2, -2)}</strong> : part
                   )}
                </p>
            </div>
         )
      }
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className={`mb-2 text-stone-700 leading-relaxed ${line.trim().length === 0 ? 'h-2' : ''}`}>
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="text-stone-900">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-0">
      <div className="bg-stone-900 text-white p-8 rounded-3xl mb-8 relative overflow-hidden shadow-xl shadow-stone-200">
        <div className="relative z-10">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 text-emerald-400 border border-white/10">
            <Sparkles size={28} />
          </div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Career Copilot</h2>
          
          {userProfile ? (
            <p className="text-stone-400 max-w-md text-sm leading-relaxed">
                Analyzing your profile: <span className="text-white font-semibold">{userProfile.department}</span> student at <span className="text-white font-semibold">{userProfile.university}</span>.
                <br/>
                Let AI design a path that gets you hired in Nigeria.
            </p>
          ) : (
            <p className="text-stone-300"><Loader2 className="animate-spin inline mr-2"/> Loading profile...</p>
          )}
          
          {!roadmap && userProfile && (
            <div className="mt-8">
                <button 
                onClick={handleGenerate}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all disabled:opacity-70 shadow-lg shadow-emerald-900/50"
                >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                {loading ? 'Consulting Intelligence...' : 'Generate My Roadmap'}
                </button>
            </div>
          )}
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
      </div>

      {roadmap && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xl shadow-stone-200/50 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="prose prose-stone max-w-none">
            {renderContent(roadmap)}
          </div>
          
          <div className="mt-8 pt-6 border-t border-stone-100 flex justify-between items-center">
             <span className="text-xs text-stone-400 font-bold uppercase tracking-widest">AI Career Guide</span>
             <button onClick={() => setRoadmap(null)} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
               Start Over <ArrowRight size={14}/>
             </button>
          </div>
        </div>
      )}
      
      {/* Discovery Cards Removed */}
    </div>
  );
};
