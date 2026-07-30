# Aether Chat — Project Structure

> A full-stack real-time messaging platform built entirely in **JavaScript**  
> Frontend: **React + Vite + Tailwind CSS**  
> Backend: **Node.js + Express + MongoDB**

---

## 📁 Project Structure

```
bashab/
├── client/                    # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── assets/            # Static assets (images, icons)
│   │   ├── components/        # Reusable UI components
│   │   │   ├── AddContactView.jsx
│   │   │   ├── AnnouncementBanner.jsx
│   │   │   ├── BusinessBookingFlow.jsx
│   │   │   ├── BusinessDashboard.jsx
│   │   │   ├── BusinessPublicProfile.jsx
│   │   │   ├── BusinessWorkshop.jsx
│   │   │   ├── CallOverlay.jsx
│   │   │   ├── CallsView.jsx
│   │   │   ├── ChannelsView.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── CommunitiesView.jsx
│   │   │   ├── GifPicker.jsx
│   │   │   ├── IdentitySwitcher.jsx
│   │   │   ├── InfoPanel.jsx
│   │   │   ├── LocationPicker.jsx
│   │   │   ├── MediaGalleryView.jsx
│   │   │   ├── NavSidebar.jsx
│   │   │   ├── NotificationCenter.jsx
│   │   │   ├── OrgPublicProfile.jsx
│   │   │   ├── OrganizationWorkspace.jsx
│   │   │   ├── OrganizationsView.jsx
│   │   │   ├── ProfileView.jsx
│   │   │   ├── SearchView.jsx
│   │   │   ├── SettingsView.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatusView.jsx
│   │   │   ├── StatusViewer.jsx
│   │   │   ├── SupportDashboard.jsx
│   │   │   ├── TasksDashboard.jsx
│   │   │   └── VoiceRecorder.jsx
│   │   ├── contexts/          # React global state contexts
│   │   │   ├── AuthContext.jsx
│   │   │   └── ChatContext.jsx
│   │   ├── data/              # Mock/seed data
│   │   │   └── mockData.js
│   │   ├── pages/             # Route-level page components
│   │   │   ├── AuthPages.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LockScreen.jsx
│   │   │   ├── MainDashboard.jsx
│   │   │   └── NotFound.jsx
│   │   ├── services/          # External service integrations
│   │   │   └── mockSocket.js
│   │   ├── App.jsx            # Root app + routing
│   │   ├── index.css          # Global styles + Tailwind
│   │   └── main.jsx           # React DOM entry point
│   ├── .gitignore
│   ├── index.html
│   ├── jsconfig.json          # JS IntelliSense config
│   ├── package.json
│   └── vite.config.js
│
└── server/                    # Express backend (Node.js)
    ├── models/                # Mongoose schemas
    │   ├── Business.js
    │   ├── Channel.js
    │   ├── Community.js
    │   ├── ContactRequest.js
    │   ├── Conversation.js
    │   ├── Message.js
    │   ├── Notification.js
    │   ├── Organization.js
    │   ├── Project.js
    │   ├── Task.js
    │   ├── User.js
    │   └── ...
    ├── routes/                # Express route handlers
    │   ├── business.js
    │   ├── business-extras.js
    │   ├── organization-chat.js
    │   ├── organization-extras.js
    │   ├── organizations.js
    │   └── support.js
    ├── services/              # Business logic services
    ├── uploads/               # User uploaded media files
    ├── .env                   # Environment variables (not committed)
    ├── app.js                 # Express server entry point
    └── package.json
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 2. Configure environment

Create `server/.env`:
```env
MONGO_URI=mongodb://localhost:27017/aetherchat
JWT_SECRET=your_secret_key
PORT=5000
```

### 3. Run development servers

```bash
# Start backend (from server/)
node app.js

# Start frontend (from client/)
npm run dev
```

The app will be available at **http://localhost:5173** (frontend proxies `/api` → `http://localhost:5000`).

---

## 🏗 Deploy to Production

The full app (frontend + backend) is served by a single Express server.

### Quick deploy

```bash
# From the project root (bashab/)
cd server
npm run deploy
```

This builds the frontend and starts the server. The Express server will:
1. Serve the built React app as static files
2. Handle all `/api/*` routes
3. Serve Socket.IO connections

### Manual build & start

```bash
# Build the frontend
cd client && npm run build && cd ..

# Start the server (serves both API and frontend)
cd server && npm start
```

The app is then available at **http://localhost:5000** (or `PORT` from `.env`).

### Environment variables for production

Ensure `server/.env` has the correct values for your deployment target:

```env
PORT=5000
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secret>
BREVO_API_KEY=<your-key>
CLOUDINARY_CLOUD_NAME=<your-cloud>
CLOUDINARY_API_KEY=<your-key>
CLOUDINARY_API_SECRET=<your-secret>
```

### Deploy to platforms

| Platform | Notes |
|----------|-------|
| **Render** | Set start command to `npm start` in `server/`, point to `server/` directory |
| **Railway** | Add `server/` as service, set `PORT` from environment |
| **Fly.io** | Add `Dockerfile`, set `PORT` from environment |
| **VPS / PM2** | Run `npm start` in `server/`, use PM2 or `systemd` |

---

## 🛠 Tech Stack

| Layer      | Technology                         |
|------------|-------------------------------------|
| Language   | JavaScript (100%)                   |
| Frontend   | React 18, Vite 5, Tailwind CSS 4   |
| Routing    | React Router v6                     |
| State      | React Context API                   |
| Backend    | Node.js, Express.js                 |
| Database   | MongoDB with Mongoose               |
| Auth       | JWT (JSON Web Tokens)               |
| Realtime   | Socket.IO                           |
| HTTP       | Axios                               |

---

## 📦 Build for Production

```bash
cd client
npm run build
```

Output will be in `client/dist/`.
