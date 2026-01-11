
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Video, Star, Clock, CheckCircle2, User as UserIcon } from 'lucide-react';
import { MOCK_MENTORS } from '../constants';

export const Mentorship: React.FC = () => {
  const [mentors, setMentors] = useState<any[]>([]);
  const [bookedSessions, setBookedSessions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    // In a real app, we would query: .from('profiles').select('*').eq('is_mentor', true)
    // Since we don't have that flag in the provided schema, we'll try to fetch some "Organization" profiles 
    // or specific senior students to mix with mocks, or just use Mocks for the visual impact requested.
    // For this demo, to ensure high quality UI as requested, we will use the MOCK_MENTORS but check if we have 
    // real profiles that match the names to link them, otherwise we just display them.
    
    // Let's rely on MOCK_MENTORS for the high-quality data requested in the spec (Alumni data is hard to fake with random signups)
    // But we will make the "Book" action real.
    setMentors(MOCK_MENTORS);
    setLoading(false);
  };

  const handleBookSession = async (mentorId: string, mentorName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic Update
    setBookedSessions(prev => new Set(prev).add(mentorId));

    try {
        // 1. Create a Notification for the "Mentor" (Simulated)
        // Since MOCK_MENTORS don't have real Supabase IDs that match the auth system usually,
        // we will simulate this by sending a notification to the CURRENT USER saying "Request Sent"
        // In a real production app, mentorId would be a uuid.
        
        // However, if we want to show we are using the backend, we can create a 'connection' 
        // request if the mentor was a real user.
        
        // For this demo, we'll record the "Booking" in the notifications table as a system alert for the user.
        await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'system',
            content: `You requested a mentorship session with ${mentorName}. Waiting for confirmation.`,
            is_read: false,
            actor_data: {
                name: 'System',
                avatar_url: 'https://via.placeholder.com/50'
            }
        });

    } catch (error) {
        console.error("Error booking session:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-0">
      <div className="sticky top-[65px] md:top-0 bg-stone-50 pt-2 pb-4 z-10">
        <h2 className="text-2xl font-bold text-stone-900">Alumni Mentors</h2>
        <p className="text-stone-500 text-sm">Connect with industry pros who walked your path.</p>
      </div>

      <div className="grid gap-6">
        {mentors.map((mentor) => {
          const isBooked = bookedSessions.has(mentor.id);
          
          return (
            <div key={mentor.id} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-4">
                <div className="relative">
                    <img src={mentor.avatar} alt={mentor.name} className="w-16 h-16 rounded-xl object-cover border border-stone-100 shadow-sm" />
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 border border-stone-100 shadow-sm">
                        <img src={`https://ui-avatars.com/api/?name=${mentor.company}&background=random&size=32`} className="w-6 h-6 rounded-full" title={mentor.company}/>
                    </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-stone-900 text-lg truncate">{mentor.name}</h3>
                      <p className="text-sm text-stone-600 font-medium truncate">{mentor.role}</p>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                             {mentor.almaMater} Alumni
                          </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded-lg">
                      <Star size={12} fill="currentColor" />
                      <span className="text-xs font-bold text-stone-800">5.0</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {mentor.topics.map((topic: string, i: number) => (
                      <span key={i} className="text-xs bg-stone-50 text-stone-600 px-2.5 py-1 rounded-lg font-medium border border-stone-100">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-stone-100">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
                        <Video size={14} className="text-stone-400"/>
                        <span>Virtual Session (30 min)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
                        <Clock size={14} className="text-stone-400"/>
                        <span>{mentor.availableSlots} slots available this week</span>
                    </div>
                </div>
                
                <button 
                  onClick={() => !isBooked && handleBookSession(mentor.id, mentor.name)}
                  disabled={isBooked}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm ${
                      isBooked 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-stone-900 text-white hover:bg-stone-800 hover:shadow-md'
                  }`}
                >
                  {isBooked ? (
                      <>
                        <CheckCircle2 size={16} /> Request Sent
                      </>
                  ) : (
                      'Book Session'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 bg-indigo-50 rounded-2xl p-6 border border-indigo-100 text-center">
        <h3 className="text-indigo-900 font-bold text-lg mb-2">Want to become a mentor?</h3>
        <p className="text-indigo-700 text-sm mb-4">If you are a final year student with a job offer or an alum, give back to the community.</p>
        <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">Apply as Mentor</button>
      </div>
    </div>
  );
};
