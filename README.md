# ⚡ SalesOS — Personal Sales Intelligence Platform

SalesOS is a full-stack, web-based personal sales platform designed to help you store, organize, and instantly search all your sales frameworks, pitch decks, interview materials, and core sales playbooks.

---

## 🏗️ Architecture & Storage

- **Is data stored in the browser?**  
  **NO.** Data is stored in a server-side SQLite database (`salesos.db`) managed by the Node.js + Express backend.
- **Where are uploaded files stored?**  
  Uploaded PDFs, spreadsheets, slides, and images are stored in `backend/uploads/` on the backend server.

---

## 🚀 How to Run Locally

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Start the server
node server.js
```

Open **http://localhost:3001** in your browser.

---

## 🌐 Free Hosting & GitHub Access

### Step 1: Push Code to GitHub

```bash
# Initialize git in project root
git init

# Add all files & commit
git add .
git commit -m "Initial SalesOS release"

# Push to your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/sales-os.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Free on Render.com (Accessible Anywhere)

1. Sign up for a free account at [Render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`sales-os`).
4. Fill in these settings:
   - **Name**: `sales-os`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Create Web Service**.

🎉 Your platform will be live at `https://sales-os.onrender.com` accessible from any device!

---

## 🔍 Spotlight Search & Slash Commands

Type `/` in the homepage search bar to bring up instant commands:

- `/framework` — Search frameworks
- `/presentation` — Client & interview decks
- `/interview` — All interview resources
- `/interview/script` — Pitch scripts & notes
- `/interview/resume` — Resumes & CVs
- `/interview/presentations` — Interview decks
- `/sales` — Core sales entries
- `/objection` — Objection handling
- `/email` — Email templates
- `/outbound` — Outbound methods

---

## 🛠️ Features

1. **Frameworks**: Sortable grid for PDFs, sheets, images, and links.
2. **Presentations**: Dedicated client & interview slide management.
3. **Interview Hub**: Sub-tabs for Script 📜, Resume 📄, Presentations 🎤, plus custom user tabs.
4. **Core Sales**: Topic-based playbooks with document/sheet/link attachments, entry pinning, and rich text.
