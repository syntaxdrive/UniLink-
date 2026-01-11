import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowRight, AlertCircle, CheckCircle2, Building2, GraduationCap } from 'lucide-react';

export const Auth: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Account Type Selection
  const [accountType, setAccountType] = useState<'student' | 'organization'>('student');

  // Common Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Student Fields
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');

  // Organization Fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.user) {
          // Prepare profile payload based on account type
          let profileData: any = {
            id: data.user.id,
            email: email,
            is_verified: false,
            account_type: accountType
          };

          if (accountType === 'student') {
            profileData = {
              ...profileData,
              name: name,
              university: university,
              department: department,
              avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
              bio: `Student at ${university}`
            };
          } else {
            profileData = {
              ...profileData,
              name: companyName, // Map Company Name to 'name' for unified display
              industry: industry,
              website: website,
              location: location,
              avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${companyName}`,
              bio: `${industry} company based in ${location}`
            };
          }

          const { error: profileError } = await supabase.from('profiles').insert([profileData]);
          if (profileError) throw profileError;
        }
        setSuccessMsg('Account created! Logging you in...');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLogin();
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-stone-100 relative overflow-hidden">
        {/* Decorative Background Blur */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        
        <div className="text-center mb-6 relative z-10">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/20">
            <span className="text-white font-bold text-xl">U</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Welcome to UniLink</h1>
          <p className="text-stone-500 text-sm mt-2">The professional network for Nigerian talent.</p>
        </div>

        {/* Account Type Toggle (Only visible in SignUp mode) */}
        {isSignUp && (
          <div className="flex bg-stone-100 p-1 rounded-xl mb-6 relative z-10">
            <button
              type="button"
              onClick={() => setAccountType('student')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                accountType === 'student' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <GraduationCap size={16} /> Student
            </button>
            <button
              type="button"
              onClick={() => setAccountType('organization')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                accountType === 'organization' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Building2 size={16} /> Organization
            </button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4 relative z-10">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2 border border-red-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2 border border-emerald-100">
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
          )}

          {isSignUp && accountType === 'student' && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 ml-1">Full Name</label>
                <input 
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Tunde Bakare"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 ml-1">University</label>
                   <input 
                    type="text" required placeholder="e.g. UNILAG" value={university} onChange={e => setUniversity(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 ml-1">Department</label>
                   <input 
                    type="text" required placeholder="e.g. Economics" value={department} onChange={e => setDepartment(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                   />
                </div>
              </div>
            </>
          )}

          {isSignUp && accountType === 'organization' && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 ml-1">Company Name</label>
                <input 
                  type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Paystack"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 ml-1">Industry</label>
                   <input 
                    type="text" required placeholder="e.g. Fintech" value={industry} onChange={e => setIndustry(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 ml-1">Location</label>
                   <input 
                    type="text" required placeholder="e.g. Lagos" value={location} onChange={e => setLocation(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                   />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 ml-1">Website</label>
                <input 
                  type="url" placeholder="https://..." value={website} onChange={e => setWebsite(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 ml-1">
              {isSignUp && accountType === 'organization' ? 'Work Email' : 'Email Address'}
            </label>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1 ml-1">Password</label>
            <input 
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-stone-900 text-white font-bold py-3.5 rounded-xl hover:bg-stone-800 transition-all flex items-center justify-center gap-2 mt-2 active:scale-95 shadow-lg shadow-stone-900/20"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? `Join as ${accountType === 'student' ? 'Student' : 'Organization'}` : 'Login')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-8 text-center relative z-10">
          <p className="text-xs text-stone-400 mb-2">
            {isSignUp ? "Already have an account?" : "New to UniLink?"}
          </p>
          <button 
            onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMsg(null);
                // Reset account type to student default on toggle
                if (!isSignUp) setAccountType('student');
            }}
            className="text-sm text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
          >
            {isSignUp ? "Login here" : "Create an account"}
          </button>
        </div>
      </div>
    </div>
  );
};