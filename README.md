
# UniLink Nigeria - Functional Specifications & Architecture

## 📖 Project Overview
UniLink is a localized professional network designed specifically for the Nigerian tertiary education context. It bridges the gap between students looking for SIWES/Internships and local organizations looking for talent.

**Core Philosophy:**
- **Students:** Move beyond "Job Hunting" to "Career Discovery" using AI and verified academic data.
- **Organizations:** Move beyond "Resumes" to "Skill-based Hiring" and campus scouting.

---

## 🏗 Technical Architecture

### Tech Stack
- **Frontend Library:** React 18 (TypeScript)
- **Styling:** Tailwind CSS (Mobile-first, Stone/Emerald aesthetic)
- **Icons:** Lucide React
- **Backend:** Supabase
  - **Auth:** Email/Password (Row Level Security enabled)
  - **Database:** PostgreSQL
  - **Realtime:** WebSocket subscriptions for Chat and Feed
- **AI Engine:** Google Gemini Flash (`@google/genai`) for Career Copilot

### Folder Structure & Responsibility
```
/
├── components/
│   ├── Auth.tsx         # Entry point. Handles Login/Signup & Role Selection.
│   ├── Navigation.tsx   # Responsive shell. Sidebar (Desktop) & Header (Mobile).
│   ├── Feed.tsx         # Social stream. Handles posting, liking, commenting.
│   ├── JobBoard.tsx     # Dual-mode board: Apply (Student) / Manage (Org).
│   ├── Network.tsx      # User discovery. Filters based on viewer role.
│   ├── Profile.tsx      # User identity. Edit mode & View mode.
│   ├── CareerAI.tsx     # Gemini integration. Generates roadmaps.
│   ├── Messages.tsx     # Real-time chat UI.
│   └── Notifications.tsx# Activity log.
├── lib/
│   └── supabase.ts      # Singleton Supabase client instance.
├── services/
│   └── geminiService.ts # Abstraction layer for AI prompts.
├── types.ts             # TS Interfaces (User, Job, Post, etc.)
└── constants.ts         # Mock data for fallback/demo.
```

---

## 🧩 Functional Specifications (How It Works)

### 1. Authentication & Onboarding
**File:** `components/Auth.tsx`

*   **Role Selection (Toggle):**
    *   Users must select **Student** or **Organization** before signing up. This sets the `account_type` in the database.
*   **Student Signup:**
    *   **Inputs:** Full Name, University, Department, Email, Password.
    *   **Logic:** Creates a profile with an avatar seed based on the name.
*   **Organization Signup:**
    *   **Inputs:** Company Name, Industry, Location, Website, Work Email, Password.
    *   **Logic:** Creates a profile designed for business verification.

### 2. Navigation
**File:** `components/Navigation.tsx`

*   **Logic:** The sidebar menu changes dynamically based on `account_type`.
*   **Student Menu:** Feed, Network, Internships, Messages, Career Copilot, Profile.
*   **Org Menu:** Feed, Talent Pool (Network), Manage Jobs, Messages, Company Profile.
*   **Mobile Experience:** Sidebar collapses into a hamburger menu on small screens.

### 3. The Feed (Community)
**File:** `components/Feed.tsx`

*   **View Toggle (Student Only):**
    *   **Button:** "Global" vs "My Campus".
    *   **Logic:**
        *   *Global:* Shows posts from all universities.
        *   *My Campus:* Filters posts where `post.author.university === currentUser.university`.
*   **Create Post:**
    *   **Input:** Text area + Image Upload.
    *   **Tagging:**
        *   *Students:* Auto-tagged as "General".
        *   *Orgs:* Auto-tagged as "Company Update".
*   **Interactions:**
    *   **Like:** Optimistic UI update (updates number immediately) -> Writes to DB.
    *   **Comment:** Opens a comment drawer inline. Real-time updates.

### 4. Job Board (SIWES & Internships)
**File:** `components/JobBoard.tsx`

**View A: Student Mode**
*   **Filters:**
    *   *SIWES:* Specifically for mandatory industrial training.
    *   *Remote:* For work-from-home roles.
    *   *Paid:* Filters out unpaid opportunities.
*   **Search:** Searches Job Title and Company Name.
*   **Action:** "Apply Now" button (Simulates application sending).

**View B: Organization Mode**
*   **Action:** "Post Job" (Button).
    *   **Modal:** Opens form for Title, Type (SIWES/Internship), Location, Remote/Paid toggle.
    *   **Logic:** Job is saved to DB linked to the Org ID.
*   **Manage:** "View Applicants" (Button).
    *   **Modal:** Shows a list of students who matched/applied.
    *   **Logic:** Displays Match Score, University, and Department for quick screening.

### 5. Network & Talent Pool
**File:** `components/Network.tsx`

*   **Logic:** The list of users displayed depends on the viewer.
*   **Student View ("Network"):**
    *   Shows other Students (Peers) and Organizations.
    *   **Action:** "Connect".
*   **Organization View ("Talent Pool"):**
    *   **Filter:** Hides other Organizations. Shows *only* Students.
    *   **UI:** Highlights "University", "Department", and "Skills".
    *   **Action:** "Scout Talent" (sends a connection request/message).

### 6. Career Copilot (AI)
**File:** `components/CareerAI.tsx`

*   **Availability:** Students Only.
*   **Input:** Automatically pulls `courses`, `skills`, and `department` from the Student Profile.
*   **Trigger:** "Generate My Roadmap" button.
*   **Process:**
    1.  Checks for API Key.
    2.  Sends prompt to Gemini: *"Act as a Nigerian career mentor for a student in [Department] taking [Courses]..."*
    3.  **Fallback:** If no API key is set, uses a heuristic engine to generate a static, high-quality response based on the Department keyword (e.g., "Economics" -> Data Analyst path).
*   **Output:** Renders Markdown-formatted roadmap with 3 specific steps (Immediate, SIWES target, Project idea).

### 7. Profile Management
**File:** `components/Profile.tsx`

*   **Modes:** View vs. Edit.
*   **Student Fields:**
    *   *Badges:* Verified skills (visual only).
    *   *Courses:* Comma-separated list (e.g., ECO 101, CSC 202). Used for AI generation.
    *   *Skills:* Tags.
*   **Organization Fields:**
    *   *Industry:* e.g., Fintech, Logistics.
    *   *Location:* e.g., Yaba, Lagos.
    *   *Website:* External link.
*   **Edit Action:**
    *   Clicking the "Pen" icon turns text fields into Input/Textarea.
    *   "Save" commits changes to Supabase `profiles` table.

---

## 🗄 Database Schema (Supabase)

**Table: `profiles`**
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key, links to `auth.users` |
| `account_type` | text | 'student' OR 'organization' |
| `university` | text | Student only |
| `department` | text | Student only |
| `industry` | text | Org only |
| `courses` | array | List of course codes |
| `skills` | array | List of skills |

**Table: `jobs`**
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `company` | text | Name of hiring org |
| `type` | text | 'SIWES', 'Internship', etc. |
| `is_paid` | bool | Compensation status |

**Table: `posts`**
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `user_id` | uuid | Foreign Key to `profiles` |
| `content` | text | Post body |
| `tag` | text | Context tag |
