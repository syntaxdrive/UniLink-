
import { User, Post, Job } from './types';

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Tunde Bakare',
  avatar: 'https://picsum.photos/seed/tunde/200/200',
  account_type: 'student',
  university: 'University of Lagos (UNILAG)',
  department: 'Economics',
  level: '300 Level',
  isVerified: true,
  courses: ['ECO 301 - Intermediate Macro', 'STA 202 - Statistics II', 'CSC 101 - Intro to CS'],
  skills: ['Data Analysis', 'Research', 'Microsoft Excel'],
  badges: ['Excel Intermediate', 'Research Writer'],
  bio: 'Aspiring Data Analyst. Passionate about using economic data to solve local problems. Currently looking for SIWES placement.'
};

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    author: {
      ...CURRENT_USER,
      name: 'Chidinma Okon',
      university: 'Obafemi Awolowo University (OAU)',
      department: 'Computer Science',
      isVerified: true,
    } as User,
    content: 'Just finished my final year project on "AI in Nigerian Agriculture". Used Python and TensorFlow to detect cassava diseases. Check out the repo link in comments! 🚀 #FinalYearProject #OAU',
    image: 'https://picsum.photos/seed/project1/800/400',
    likes: 124,
    comments: 45,
    created_at: '2h ago',
    tag: 'Project Showcase'
  },
  {
    id: 'p2',
    author: {
      ...CURRENT_USER,
      name: 'Emeka Nnadi',
      university: 'University of Ibadan (UI)',
      department: 'Mechanical Engineering',
      isVerified: true,
    } as User,
    content: 'Does anyone have past questions for MEE 402? The exam is next week and I’m drowning here. 😅',
    likes: 12,
    comments: 8,
    created_at: '4h ago',
    tag: 'Academic Help'
  }
];

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    title: 'Data Analyst Intern (SIWES)',
    company: 'Paystack',
    companyLogo: 'https://picsum.photos/seed/paystack/100/100',
    location: 'Ikeja, Lagos',
    type: 'SIWES',
    isRemote: false,
    isPaid: true,
    postedAt: '1d ago',
    verified: true,
    owner_id: 'org1'
  },
  {
    id: 'j2',
    title: 'Campus Ambassador',
    company: 'Cowrywise',
    companyLogo: 'https://picsum.photos/seed/cowry/100/100',
    location: 'Remote (Any Campus)',
    type: 'Volunteer',
    isRemote: true,
    isPaid: false,
    postedAt: '3d ago',
    verified: true,
    owner_id: 'org2'
  },
  {
    id: 'j3',
    title: 'Frontend Developer Intern',
    company: 'Hotels.ng',
    companyLogo: 'https://picsum.photos/seed/hng/100/100',
    location: 'Yaba, Lagos',
    type: 'Internship',
    isRemote: true,
    isPaid: true,
    postedAt: '5h ago',
    verified: true,
    owner_id: 'org3'
  }
];

export const MOCK_MENTORS = [
  {
    id: 'm1',
    name: 'Tola Adebayo',
    role: 'Senior Product Designer',
    company: 'Paystack',
    avatar: 'https://picsum.photos/seed/tola/200/200',
    almaMater: 'Covenant University',
    topics: ['Portfolio Review', 'UX Research', 'Career Growth'],
    availableSlots: 2
  },
  {
    id: 'm2',
    name: 'Ibrahim Sani',
    role: 'Backend Engineer',
    company: 'Microsoft',
    avatar: 'https://picsum.photos/seed/ibrahim/200/200',
    almaMater: 'Ahmadu Bello University',
    topics: ['System Design', 'Interview Prep', 'Java'],
    availableSlots: 5
  },
  {
    id: 'm3',
    name: 'Ngozi Eze',
    role: 'Product Manager',
    company: 'Spotify',
    avatar: 'https://picsum.photos/seed/ngozi/200/200',
    almaMater: 'University of Nigeria, Nsukka',
    topics: ['Product Strategy', 'Resume Review', 'Leadership'],
    availableSlots: 1
  }
];
