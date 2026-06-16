# Team Tracker — Marketing Operations Portal

## Tech Stack
- **Frontend**: React + Vite
- **Backend/DB**: Supabase (free tier)
- **Hosting**: Vercel (free)
- **Auth**: Supabase Auth (email/password)

---

## Step 1 — Supabase Setup (10 min)

1. Go to **https://supabase.com** → "New Project"
2. Name it `team-tracker`, note your password
3. Once created, go to **SQL Editor** → paste entire `supabase_setup.sql` → Run
4. Go to **Project Settings → API** → copy:
   - `Project URL` → this is your `VITE_SUPABASE_URL`
   - `anon public` key → this is your `VITE_SUPABASE_ANON_KEY`

---

## Step 2 — Create User Accounts (5 min)

In Supabase → **Authentication → Users → Invite User**:

| Name | Email | Role |
|------|-------|------|
| You (Admin) | your@email.com | admin |
| Aman | aman@yourcompany.com | member |
| Anurag | anurag@yourcompany.com | member |
| Kunal | kunal@yourcompany.com | member |
| Harshita | harshita@agency.com | member |

After creating each user, run this in SQL Editor to set their name & role:
```sql
-- For admin (you):
UPDATE profiles SET name = 'Your Name', role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');

-- For team members:
UPDATE profiles SET name = 'Aman', role = 'member'
WHERE id = (SELECT id FROM auth.users WHERE email = 'aman@yourcompany.com');
-- Repeat for Anurag, Kunal, Harshita
```

---

## Step 3 — Deploy to Vercel (5 min)

### Option A — GitHub (recommended)
1. Create a GitHub repo, push this code
2. Go to **https://vercel.com** → "Import Project" → select your repo
3. Add Environment Variables:
   - `VITE_SUPABASE_URL` = your supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Deploy → Done! Share the URL with your team.

### Option B — Vercel CLI
```bash
npm install -g vercel
cd team-tracker
npm install
vercel
# Follow prompts, add env vars when asked
```

---

## Step 4 — Add Your Tasks (5 min)

Option 1 — Via the app: Login as admin → All Tasks → + New Task

Option 2 — Via SQL (bulk import):
```sql
INSERT INTO tasks (title, status, priority, assigned_to, note, deadline, created_by) VALUES
('Reel / Influencer / Post ideas for Millet Bar', 'running', 'medium', 'Kunal', 'Ongoing content ideation', null, 'Admin'),
('Anurag coordinating 4 farmers for barter collabs', 'running', 'high', 'Anurag', '4 farmers shortlisted', null, 'Admin'),
('Toll-free number rollout', 'running', 'high', 'Admin', 'High priority', null, 'Admin'),
('Pineapple engagement video — under review', 'running', 'medium', 'Kunal', 'Under review', null, 'Admin'),
('Mahua shoot editing ongoing', 'running', 'medium', 'Kunal', 'Edit in progress', null, 'Admin'),
('Mahua video — under review', 'running', 'medium', 'Kunal', 'Review pending', null, 'Admin'),
('BigBasket order delivery — 2 orders remaining', 'running', 'high', 'Admin', 'PO extended till 6 June. Call Suresh.', '2025-06-06', 'Admin'),
('Pancake & Fruit Muesli colour and design', 'pending', 'medium', 'Harshita', '', null, 'Admin'),
('Founder Story for WeConnect Magazine', 'pending', 'high', 'Admin', 'Delayed due to website issue.', null, 'Admin'),
('Puff Bar promotional video', 'pending', 'medium', 'Kunal', '', null, 'Admin'),
('Fruit Mix and Mango design', 'pending', 'medium', 'Harshita', 'Pending from agency', null, 'Admin'),
('Cashfree account creation', 'pending', 'high', 'Admin', '', null, 'Admin'),
('Airport creative update from Satendra', 'onhold', 'low', 'Admin', 'Waiting on Satendra', null, 'Admin'),
('Offline training batch', 'upcoming', 'high', 'Admin', 'Scheduled 10–11 June', '2025-06-11', 'Admin'),
('Connect with Dimple (FKM) — Listing & PO projection', 'pending', 'high', 'Admin', '', null, 'Admin'),
('Call Kartik (Firstclub) — further coordination', 'pending', 'high', 'Admin', '', null, 'Admin'),
('Samples dispatch to Q Comms KAMs for NPI', 'pending', 'high', 'Admin', '', null, 'Admin'),
('Discuss with Varun — Barefruit further operations', 'pending', 'medium', 'Anurag', '', null, 'Admin'),
('Video delivery — Proudly Made Indian Bar theme', 'pending', 'high', 'Kunal', '', null, 'Admin'),
('New packaging design from Harshita', 'pending', 'high', 'Harshita', '', null, 'Admin'),
('New product design — Chocolate Millet Bar', 'pending', 'high', 'Harshita', 'New product, design brief needed.', null, 'Admin');
```

---

## Features

### For You (Admin / Marketing Head)
- **Dashboard** — full team overview, stats, activity feed, needs-attention list
- **All Tasks** — filter by status, person, search
- **Team View** — per-member task list with progress bar
- **AI Summary** — 3 modes: Full Analysis / Quick Bullets / Team View
- **Add/Edit/Delete** tasks, assign to anyone

### For Team (Aman, Anurag, Kunal)
- **My Tasks** — only their assigned tasks
- **Morning Checkin** — prioritized list: overdue → due today → stuck → ongoing
- **EOD Update** — one-screen status update + notes for all their tasks

### Smart Features
- Auto status detection from remarks ("done kar diya" → Done)
- Overdue auto-highlight with red border
- Timeline: start date + deadline + target completion
- Real-time remarks log with timestamps
- Role-based access (team can't edit others' tasks)

---

## Local Development
```bash
cp .env.example .env
# Fill in your Supabase credentials
npm install
npm run dev
```

---

## Total Cost: ₹0/month
- Supabase free tier: 500MB DB, 50,000 MAU
- Vercel free tier: unlimited hobby projects
