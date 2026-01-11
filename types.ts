
export interface User {
  id: string;
  name: string; // Display Name (Student Name or Company Name)
  email?: string;
  avatar: string;
  isVerified: boolean;
  bio: string;
  
  // Account Discriminator
  account_type: 'student' | 'organization';

  // Student Specific
  university?: string;
  department?: string;
  level?: string;
  courses?: string[];
  skills?: string[];
  badges?: string[];

  // Organization Specific
  industry?: string;
  website?: string;
  location?: string;
  size?: string;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  author?: User;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  created_at: string;
  tag?: string;
  comments_count?: number;
  image_url?: string;
  video_url?: string;
  user_has_liked?: boolean;
  project_link?: string; // Added for Project Showcase
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  type: 'Internship' | 'SIWES' | 'Volunteer' | 'Entry Level';
  isRemote: boolean;
  isPaid: boolean;
  postedAt?: string;
  verified: boolean;
  created_at?: string;
  owner_id: string; // Added to track ownership
  has_applied?: boolean; // Helper for UI
  applicants_count?: number; // Helper for UI
}

export interface Application {
  id: string;
  job_id: string;
  student_id: string;
  created_at: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  student?: User; // Joined data
  match_score?: number; // Calculated field
}

export interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'connect' | 'message' | 'system';
  content: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
  actor_data?: {
    name: string;
    avatar_url: string;
  }; 
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export enum View {
  FEED = 'feed',
  JOBS = 'jobs',
  PROFILE = 'profile',
  CAREER_AI = 'career_ai',
  MESSAGES = 'messages',
  NETWORK = 'network',
  NOTIFICATIONS = 'notifications'
}
