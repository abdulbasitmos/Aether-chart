# AetherChat — Unified Messaging Terminal

AetherChat is a responsive, modern, premium-quality messaging web application inspired by WhatsApp. Built as a fully functional **full-stack** application, AetherChat features a React/Vite frontend integrated with a Node.js/Express backend, persisted in MongoDB, and synchronized in real-time via Socket.io. It supports OTP-based verification, secure biometrics locks, multi-user messaging, group chats with advanced co-admin permissions, disappearing messages, video/voice calls, and Gemini AI assistant integrations.

---

## 🚀 Key Features

- **Unified Dashboard Layout**: Responsive left sidebar navigation, center chat console, and right detail information panels. On mobile screens, it dynamically pivots to focused full-screen views.
- **Visual Design System**: Tailored glassmorphism styles, soft lighting gradients, custom animations (pulses, waves, and tick draws), and support for multiple accent themes (Emerald, Sapphire, Amethyst, Rose).
- **Comprehensive Auth States**: Welcome portal, Login, Signup, OTP email code validation (sent via SMTP/Brevo), and initials-avatar profile generation.
- **Advanced Chat Tools**:
  - One-to-one, AI assistant, and Group chats.
  - WhatsApp-style group wizard with horizontal member trays, 25-char subject limits, descriptions, and co-admin controls (promotions, demotions, members kicking, and creator-only group deletions).
  - Media support for cloud uploads (Cloudinary or local static fallback directory), document attachments, location maps, and voice notes.
  - Interactive widgets like live-updating polls and scheduled messages.
  - Chat context actions: replying, editing, deleting, and reacting.
- **Timed Status Stories**: View contact updates sequentially with progress bars, submit instant replies, or publish text stories with customizable gradient backgrounds.
- **Biometric & Security Locks**: Screen lock simulation requiring a PIN (default `1234`) or simulated FaceID scanning.
- **Integrated AI Assistant**: Summarize active sessions, translate drafts, or write polished responses instantly.

---

## 🛠️ Technology Stack

- **Framework**: [React](https://react.dev/) + [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS v4.0](https://tailwindcss.com/) (CSS-first engine)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Routing**: [React Router DOM v6](https://reactrouter.com/)
- **Forms**: [React Hook Form](https://react-hook-form.com/)
- **Toasts**: [React Hot Toast](https://react-hot-toast.com/)
- **Emojis**: [Emoji Picker React](https://github.com/ealush/emoji-picker-react)
- **Icons**: [React Icons (Feather package)](https://react-icons.github.io/react-icons/)

---

## 📂 Project Structure

```bash
bashab/
├── index.html            # Entry DOM structure
├── vite.config.js        # Vite compilation configuration & paths
├── package.json          # Node dependencies
├── src/
│   ├── main.jsx          # ES modules bootstrap
│   ├── App.jsx           # Main routing & layout controller
│   ├── index.css         # Styling directives & animations
│   ├── components/       # Reusable layout layers
│   │   ├── Sidebar.jsx       # Search, conversations, calls, settings sub-panels
│   │   ├── ChatWindow.jsx    # Messaging grid, inputs & attachments
│   │   ├── InfoPanel.jsx     # AI assistant, media links, and local search
│   │   ├── CallOverlay.jsx   # Voice/Video call simulation screen
│   │   └── StatusViewer.jsx  # timed status stories
│   ├── pages/            # View states
│   │   ├── AuthPages.jsx     # Login, Signup, OTP, Profile creations
│   │   ├── LockScreen.jsx    # PIN / FaceID screen locks
│   │   ├── MainDashboard.jsx # Layout grid and mobile viewports
│   │   └── NotFound.jsx      # Error boundary page
│   ├── contexts/         # React state managers
│   │   ├── AuthContext.jsx   # Login status & appearance effects
│   │   └── ChatContext.jsx   # Messaging actions, calls, status uploads
│   ├── services/         # Async simulation layer
│   │   └── mockSocket.js     # Periodic messages, typing signals, AI responses
│   └── data/             # Local database
│       └── mockData.js       # Preloaded users, groups, logs, & vector assets
```

---

## 🏁 Run the Application

To test both the React frontend and Node.js backend:

### 1. Start the Node.js Express Backend
```bash
# Navigate to the server directory
cd server
# Install backend dependencies
npm install
# Start the server on port 5000 (auto-reloads with nodemon)
npm start
```

### 2. Start the Vite React Frontend
```bash
# Navigate to the bashab directory
cd bashab
# Install frontend dependencies
npm install
# Run the dev server on port 5173
npm run dev
```
Open your browser at [http://localhost:5173](http://localhost:5173).

### 3. Production Compilation
To compile the frontend bundle for production:
```bash
npm run build
```

---

## 🔒 Testing Guide

- **Bypass App Lock**: If you enable screen lock (FaceID/PIN) in settings, lock the terminal. Enter PIN `1234` or click the biometric scanner to unlock.
- **Simulate Call**: Keep the dashboard open for **45 seconds**—an incoming call modal (from Evelyn Vane) will automatically ring! Accept or decline call states to test RTC layout overlays.
- **Talk to AI Assistant**: Navigate to the **Aether AI** contact chat. Send any message (e.g. *translate hello*, *summarize*, or custom prompts) to receive immediate AI answers. Alternatively, open the **AI** tab in the right panel to test quick actions.
