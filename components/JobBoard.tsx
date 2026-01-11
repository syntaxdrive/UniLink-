
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Briefcase, CheckCircle2, Search, Loader2, Filter, Plus, X, Users, Edit, ChevronRight, GraduationCap, Check, Trash2, Globe } from 'lucide-react';
import { Job, User, Application } from '../types';

interface JobBoardProps {
  userType?: 'student' | 'organization';
  onProfileClick: (userId: string) => void;
}

export const JobBoard: React.FC<JobBoardProps> = ({ userType = 'student', onProfileClick }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Org Specific State
  const [orgTab, setOrgTab] = useState<'market' | 'listings'>('listings');

  // Post Job Modal State
  const [showPostModal, setShowPostModal] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    type: 'Internship',
    location: '',
    isRemote: false,
    isPaid: true
  });
  const [posting, setPosting] = useState(false);

  // Applicants Modal State
  const [showApplicants, setShowApplicants] = useState<string | null>(null); // Job ID
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const isOrg = userType === 'organization';

  useEffect(() => {
    fetchJobs();
  }, [userType, orgTab]); 

  const fetchJobs = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    // Build Query
    let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });

    // Filter for Org "My Listings"
    if (isOrg && orgTab === 'listings' && user) {
        query = query.eq('owner_id', user.id);
    }

    const { data: jobsData, error } = await query;
    
    if (!error && jobsData) {
      let mappedJobs = jobsData as unknown as Job[];

      // Enhance with Application Data
      // 1. Get Application Counts for these jobs
      const jobIds = mappedJobs.map(j => j.id);
      
      // We can't do a join easily for count in one go without a view, so we fetch applications for these jobs
      const { data: appData } = await supabase
        .from('applications')
        .select('job_id, student_id')
        .in('job_id', jobIds);

      // Create a map of JobID -> Count
      const appCounts: Record<string, number> = {};
      const appliedSet = new Set<string>();

      if (appData) {
          appData.forEach((app: any) => {
              appCounts[app.job_id] = (appCounts[app.job_id] || 0) + 1;
              if (user && app.student_id === user.id) {
                  appliedSet.add(app.job_id);
              }
          });
      }

      mappedJobs = mappedJobs.map(j => ({
          ...j,
          applicants_count: appCounts[j.id] || 0,
          has_applied: appliedSet.has(j.id)
      }));

      setJobs(mappedJobs);
    }
    setLoading(false);
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch user profile to get company name
    const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
    
    const jobData = {
      title: newJob.title,
      company: profile?.name || 'My Company',
      location: newJob.location,
      type: newJob.type,
      isRemote: newJob.isRemote,
      isPaid: newJob.isPaid,
      verified: true,
      owner_id: user.id
    };

    const { error } = await supabase.from('jobs').insert([jobData]);
    
    if (!error) {
      setShowPostModal(false);
      setNewJob({ title: '', type: 'Internship', location: '', isRemote: false, isPaid: true });
      fetchJobs();
    } else {
      alert('Failed to post job');
    }
    setPosting(false);
  };

  const handleDeleteJob = async (jobId: string) => {
     if (!confirm("Are you sure you want to delete this listing?")) return;
     
     // Optimistic delete
     setJobs(prev => prev.filter(j => j.id !== jobId));
     
     const { error } = await supabase.from('jobs').delete().eq('id', jobId);
     if (error) {
         alert("Failed to delete job.");
         fetchJobs(); // Revert
     }
  };

  const handleApply = async (jobId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic Update
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, has_applied: true, applicants_count: (j.applicants_count || 0) + 1 } : j));

    const { error } = await supabase.from('applications').insert({
        job_id: jobId,
        student_id: user.id,
        status: 'pending'
    });

    if (error) {
        alert("Could not apply. You might have already applied.");
        // Revert optimistic update
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, has_applied: false, applicants_count: (j.applicants_count || 0) - 1 } : j));
    }
  };

  const handleViewApplicants = async (jobId: string) => {
    setShowApplicants(jobId);
    setLoadingApplicants(true);
    setApplicants([]);

    // Fetch applications joined with student profiles
    const { data, error } = await supabase
        .from('applications')
        .select(`
            *,
            student:profiles(*)
        `)
        .eq('job_id', jobId);

    if (data && !error) {
        const mappedApps = data.map((app: any) => ({
            ...app,
            match_score: Math.floor(Math.random() * (99 - 70 + 1) + 70), // Mock score
            student: app.student
        }));
        setApplicants(mappedApps as Application[]);
    }
    setLoadingApplicants(false);
  };

  const filteredJobs = jobs.filter(job => {
    // 1. Text Search
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Category Filter
    if (filter === 'All') return matchesSearch;
    if (filter === 'SIWES') return matchesSearch && job.type === 'SIWES';
    if (filter === 'Internship') return matchesSearch && job.type === 'Internship';
    if (filter === 'Remote') return matchesSearch && job.isRemote;
    if (filter === 'Paid') return matchesSearch && job.isPaid;
    
    return matchesSearch;
  });

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-0">
      {/* Sticky Header */}
      <div className="sticky top-[65px] md:top-0 bg-stone-50 pt-2 pb-4 z-10 transition-all">
        <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">
                {isOrg ? 'Recruitment Hub' : 'Opportunities'}
            </h2>
            <p className="text-stone-500 text-sm">
                {isOrg ? 'Manage your pipeline and find talent' : 'Curated SIWES & Internships'}
            </p>
          </div>
          {isOrg && (
            <button 
              onClick={() => setShowPostModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Plus size={18} /> Post Job
            </button>
          )}
        </div>
        
        {/* Org Tabs */}
        {isOrg && (
            <div className="bg-white p-1 rounded-xl border border-stone-200 flex shadow-sm mb-4 w-full md:w-auto self-start">
               <button 
                 onClick={() => setOrgTab('listings')}
                 className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${orgTab === 'listings' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
               >
                 <Briefcase size={14} /> My Listings
               </button>
               <button 
                 onClick={() => setOrgTab('market')}
                 className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${orgTab === 'market' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}
               >
                 <Globe size={14} /> Market View
               </button>
            </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input 
            type="text" 
            placeholder={isOrg ? "Search your listings..." : "Search roles (e.g. Data Analyst, Frontend)..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['All', 'SIWES', 'Internship', 'Remote', 'Paid'].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                filter === f
                  ? 'bg-stone-900 text-white border-stone-900 shadow-md transform scale-105' 
                  : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-500 hover:text-emerald-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-stone-400"/></div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 border-dashed">
              <Filter className="mx-auto text-stone-300 mb-2" size={32} />
              <p className="text-stone-500 font-medium">No jobs found matching "{filter}"</p>
              {isOrg && orgTab === 'listings' && (
                  <button onClick={() => setShowPostModal(true)} className="mt-3 text-emerald-600 font-bold text-sm">Post your first job</button>
              )}
              {!isOrg && (
                  <button onClick={() => setFilter('All')} className="text-emerald-600 text-sm font-bold mt-2">Clear Filters</button>
              )}
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-emerald-400 hover:shadow-lg transition-all group cursor-pointer relative overflow-hidden">
                {/* Paid Badge Top Right */}
                {job.isPaid && (
                   <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl">
                     PAID
                   </div>
                )}

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center font-bold text-lg bg-stone-100 text-stone-500 uppercase">
                     {job.company[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <h3 className="font-bold text-stone-900 text-lg truncate group-hover:text-emerald-700 transition-colors">
                        {job.title}
                       </h3>
                       {job.verified && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                    
                    <p className="text-stone-600 font-medium text-sm mb-3">{job.company}</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-stone-500">
                      <span className="flex items-center gap-1 bg-stone-50 px-2 py-1 rounded-md">
                        <MapPin size={12} /> {job.location}
                      </span>
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-md ${job.type === 'SIWES' ? 'bg-indigo-50 text-indigo-700' : 'bg-stone-50'}`}>
                        <Briefcase size={12} /> {job.type}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-stone-100 flex gap-3">
                  {isOrg && orgTab === 'listings' ? (
                     <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                          className="bg-white border border-stone-200 text-red-500 hover:bg-red-50 hover:border-red-200 py-2.5 px-4 rounded-xl font-bold text-sm transition-colors"
                        >
                            <Trash2 size={16}/>
                        </button>
                        <button 
                          onClick={() => handleViewApplicants(job.id)}
                          className="flex-1 bg-stone-900 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                            <Users size={14}/> 
                            View Applicants 
                            {job.applicants_count !== undefined && job.applicants_count > 0 && (
                                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                    {job.applicants_count}
                                </span>
                            )}
                        </button>
                     </>
                  ) : (
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleApply(job.id); }}
                        disabled={job.has_applied}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 ${
                            job.has_applied 
                            ? 'bg-emerald-50 text-emerald-700 cursor-default border border-emerald-100' 
                            : 'bg-stone-900 text-white hover:bg-stone-800'
                        }`}
                    >
                        {job.has_applied ? <><Check size={16}/> Applied</> : 'Apply Now'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Post Job Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-stone-900">Post Opportunity</h3>
               <button onClick={() => setShowPostModal(false)} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"><X size={20}/></button>
             </div>
             
             <form onSubmit={handlePostJob} className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Job Title</label>
                 <input 
                   required
                   value={newJob.title}
                   onChange={e => setNewJob({...newJob, title: e.target.value})}
                   className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" 
                   placeholder="e.g. Frontend Intern" 
                 />
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Type</label>
                    <select 
                      value={newJob.type}
                      onChange={e => setNewJob({...newJob, type: e.target.value})}
                      className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white"
                    >
                      <option value="Internship">Internship</option>
                      <option value="SIWES">SIWES</option>
                      <option value="Volunteer">Volunteer</option>
                      <option value="Entry Level">Entry Level</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Location</label>
                    <input 
                      required
                      value={newJob.location}
                      onChange={e => setNewJob({...newJob, location: e.target.value})}
                      className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500" 
                      placeholder="e.g. Lagos" 
                    />
                  </div>
               </div>

               <div className="flex gap-4 pt-2">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={newJob.isRemote} onChange={e => setNewJob({...newJob, isRemote: e.target.checked})} className="rounded text-emerald-600 focus:ring-emerald-500" />
                   <span className="text-sm font-medium text-stone-700">Remote</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={newJob.isPaid} onChange={e => setNewJob({...newJob, isPaid: e.target.checked})} className="rounded text-emerald-600 focus:ring-emerald-500" />
                   <span className="text-sm font-medium text-stone-700">Paid Role</span>
                 </label>
               </div>

               <button 
                type="submit" 
                disabled={posting}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 mt-4 flex items-center justify-center gap-2"
               >
                 {posting ? <Loader2 className="animate-spin"/> : 'Post Opportunity'}
               </button>
             </form>
          </div>
        </div>
      )}

      {/* View Applicants Modal */}
      {showApplicants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 h-[80vh] flex flex-col">
             <div className="flex justify-between items-center mb-6">
               <div>
                  <h3 className="text-xl font-bold text-stone-900">Applicants</h3>
                  <p className="text-sm text-stone-500">Managing candidates for this role</p>
               </div>
               <button onClick={() => setShowApplicants(null)} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors"><X size={20}/></button>
             </div>

             <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-3">
               {loadingApplicants ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-stone-400"/></div>
               ) : applicants.length === 0 ? (
                    <div className="text-center py-10 text-stone-400">
                        <Users size={32} className="mx-auto mb-2 opacity-50"/>
                        <p>No applicants yet.</p>
                    </div>
               ) : (
                   applicants.map(app => (
                    <div 
                        key={app.id} 
                        onClick={() => { setShowApplicants(null); if(app.student) onProfileClick(app.student.id); }}
                        className="p-4 border border-stone-100 rounded-2xl flex items-center gap-3 hover:border-emerald-200 transition-colors bg-stone-50/50 cursor-pointer"
                    >
                        <img src={app.student?.avatar || 'https://via.placeholder.com/40'} className="w-12 h-12 rounded-xl object-cover" alt={app.student?.name} />
                        <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-stone-900 truncate">{app.student?.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span className="flex items-center gap-1"><GraduationCap size={12}/> {app.student?.university}</span>
                            <span>•</span>
                            <span className="truncate">{app.student?.department}</span>
                        </div>
                        </div>
                        <div className="text-right shrink-0">
                        {app.match_score && (
                            <>
                                <span className="block text-emerald-600 font-bold text-lg">{app.match_score}%</span>
                                <span className="text-[10px] text-stone-400 font-medium uppercase">Match</span>
                            </>
                        )}
                        </div>
                        <button className="p-2 text-stone-300 hover:text-stone-600"><ChevronRight size={20} /></button>
                    </div>
                   ))
               )}
             </div>
             
             <div className="pt-4 mt-2 border-t border-stone-100">
                <button className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold text-sm">Download All CVs</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
