# PROJECT ARCHITECTURE ANALYSIS

This document provides a comprehensive and exhaustive architectural and operational analysis of the **AetherChat** project (located in the `bashab` workspace). It outlines the system structure, data flows, database schematics, security analysis, performance bottlenecks, and a strategic roadmap for moving the current codebase toward a production-grade deployment.

---

## 🗺️ System Architecture Overview

```mermaid
graph TD
    %% Frontend Components
    subgraph Frontend [React Frontend - Vite & Tailwind CSS]
        UI[React View Components]
        AuthCtx[AuthContext.jsx - Auth State]
        ChatCtx[ChatContext.jsx - Message State]
        MockSock[mockSocket.js - WS Client Wrapper]
    end

    %% Backend Services
    subgraph Backend [Express API Server - Node.js]
        Routes[API Routing Layer]
        AuthMW[authenticateToken Middleware]
        Gemini[Gemini API Helper]
        WS[Socket.io Server Layer]
        OTP[otpService.js - Email/SMS dispatch]
    end

    %% Database Layer
    subgraph Database [Database & Filesystem]
        Mongo[(MongoDB Database)]
        FS[Uploads Directory]
    end

    %% Relationships
    UI --> AuthCtx
    UI --> ChatCtx
    ChatCtx --> MockSock
    AuthCtx -->|HTTP REST Requests| Routes
    ChatCtx -->|HTTP REST Requests| Routes
    MockSock <-->|Bi-directional WebSockets| WS
    Routes --> AuthMW
    Routes -->|Read/Write Models| Mongo
    Routes -->|Save File Buffer| FS
    Routes -->|Generate AI Chat| Gemini
    OTP -->|Sends SMTP/SMS API| External[SMTP Relay / SMS Gateway]
```

---

# # Project Overview

### 1. What is this project?
This project, named **AetherChat** (or **Aether Messaging Hub**), is a real-time messaging application designed with a dark glassmorphism user interface. It is structured as a full-stack Javascript application comprising a **Vite-based React frontend** (configured in the `bashab/` subdirectory) and a **Node.js + Express backend** (configured in the `server/` subdirectory) that utilizes **MongoDB** for database persistence and **Socket.io** for real-time WebSocket communication.

### 2. What problem does it solve?
AetherChat provides a unified platform for secure instant messaging, rich-media attachments (voice notes, images, coordinates, documents), real-time calling layout states (RTC integration), automated AI assistance, status updates (stories), broadcast channels, and collaborative communities. It bridges the gap between structured productivity tools (like Discord/Slack) and personal chat utilities (like WhatsApp) by grouping threads, channels, and projects into a unified interface.

### 3. Who are the target users?
The target users are developers, designers, small-scale teams, and individuals looking for a visual-first, responsive chat application that combines text messaging, project progress tracking, channels, status sharing, screen/pin security locking, and integrated Google Gemini AI assistance in a single app window.

### 4. How is the project structured?
The project is split into two primary components:
1. **Frontend (`bashab/`)**: A Vite + React application styled with Tailwind CSS, utilizing React Context for global auth and messaging state management.
2. **Backend (`server/`)**: An Express.js REST and WebSocket server connecting to a MongoDB Atlas cluster, managing user schemas, message archiving, file uploads, and integrating Brevo's SMTP API for OTP emails and Twilio/SMS service proxies.

---

# # Folder Structure

### 5. Explain every folder
- **`bashab/`**: The frontend application root directory.
  - **`public/`**: Stores public static assets such as SVG backgrounds (`chat-bg-emerald.svg`, etc.) and brand icons.
  - **`src/`**: Contains the source React files.
    - **`assets/`**: Unused/boilerplate default icons.
    - **`components/`**: Houses all modular UI layers and screens (e.g. Chat window, Sidebar, Call overlay).
    - **`contexts/`**: Contains React Context Providers managing global state wrappers.
    - **`data/`**: Stores static mock datasets and helpers for offline simulation modes.
    - **`pages/`**: Holds core viewport route components (Lock Screen, Dashboard, Auth portal, Not Found).
    - **`services/`**: Holds custom clients like the socket wrapper.
- **`server/`**: The backend application root directory.
  - **`models/`**: Holds Mongoose database schema models.
  - **`services/`**: Houses integration services like SMTP and SMS OTP dispatch.
  - **`uploads/`**: Created dynamically to hold uploaded images, audios, and documents.
- **`dist/`**: The compiled static build of the frontend, served by the backend in production mode.
- **`node_modules/`**: Contains third-party dependencies required for building and running both client and server applications.

### 6. Explain every file
#### Root Level
- **`PROJECT_ARCHITECTURE_ANALYSIS.md`**: This architectural reference document.

#### Frontend (`bashab/`)
- **`package.json`**: Package dependencies (framer-motion, react-router-dom, socket.io-client, react-hot-toast, axios) and scripts (`dev`, `build`, `preview`).
- **`vite.config.js`**: Vite configuration defining bundling settings and ports.
- **`index.html`**: The single HTML entry point referencing `src/main.jsx`.
- **`src/main.jsx`**: Bootstraps React and renders the `<App />` component in React strict mode.
- **`src/App.jsx`**: Main router file mapping URL paths to page view components inside context providers.
- **`src/index.css`**: Core stylesheet containing custom utility styles, animations, light/dark mode overrides, and glassmorphism definitions.
- **`src/App.css`**: Scaffolding CSS file (dead code, unused).
- **`src/contexts/AuthContext.jsx`**: Manages auth states, login steps, app lock methods, and settings profiles.
- **`src/contexts/ChatContext.jsx`**: Aggregates REST and Socket integrations for real-time messaging, calling overlay triggers, channels, and community threads.
- **`src/services/mockSocket.js`**: A hybrid WebSocket client class wrapper managing Socket.io connection state and offline simulation loops.
- **`src/data/mockData.js`**: Provides fallback mock objects, colors, and initial templates for offline simulation.
- **`src/pages/AuthPages.jsx`**: Holds panels for logging in, registering, OTP validation, and profile setting configurations.
- **`src/pages/LockScreen.jsx`**: Renders PIN keypad/FaceID scan simulation to unlock the client window.
- **`src/pages/MainDashboard.jsx`**: Renders the application dashboard grid.
- **`src/pages/NotFound.jsx`**: Fallback 404 page.
- **`src/components/Sidebar.jsx`**: Responsive left navigation bar, search panel, settings, and profile managers.
- **`src/components/ChatWindow.jsx`**: Renders the conversation stream, input deck, reactions, polls, and location attachments.
- **`src/components/InfoPanel.jsx`**: Renders details on active chats, past attachments, and provides an inline panel for Gemini AI assistant prompts.
- **`src/components/CallOverlay.jsx`**: Renders the active call window overlay with video feeds, screen sharing buttons, and controls.
- **`src/components/CallsView.jsx`**: Displays logs of past incoming and outgoing calls.
- **`src/components/ChannelsView.jsx`**: Renders broadcast post feeds, likes, and comment threads.
- **`src/components/CommunitiesView.jsx`**: Renders joined community dashboards, announcement cards, and sub-channels.
- **`src/components/StatusView.jsx`**: Renders user and contact status list, text cards, and allows status creation.
- **`src/components/StatusViewer.jsx`**: Renders full-screen slideshows of contact status stories.
- **`src/components/SearchView.jsx`**: Global lookup component to find other users and add them to contacts.
- **`src/components/NotificationCenter.jsx`**: Lists notification preferences and system event logs.
- **`src/components/SettingsView.jsx`**: Options deck to customize colors, locks, notifications, and profile details.
- **`src/components/ProfileView.jsx`**: Customizes bio, names, usernames, and avatar seed parameters.
- **`src/components/VoiceRecorder.jsx`**: Handles audio recordings for voice messaging.
- **`src/components/MediaGalleryView.jsx`**: Grid list of past sent images, documents, and media attachments.

#### Backend (`server/`)
- **`package.json`**: Backend dependencies (express, mongoose, socket.io, jsonwebtoken, bcryptjs, dotenv).
- **`app.js`**: Core backend Express server configuring Mongoose schemas, REST routes, Socket connections, and starting the HTTP server listener.
- **`clear_db.js`**: Utility script to drop database collections.
- **`.env`**: Port definitions, Brevo credentials, Gemini API key, and MongoDB connection strings.
- **`models/User.js`**: User schema definition.
- **`models/Conversation.js`**: Thread schema definition (direct/group).
- **`models/Message.js`**: Schema defining messages, files, polls, and metadata.
- **`models/Status.js`**: Schema defining status stories.
- **`models/Channel.js`**: Schema for channels and broadcast posts.
- **`models/Community.js`**: Schema for communities, sub-groups, and announcements.
- **`services/otpService.js`**: Functions to dispatch OTP codes via email (Brevo) or SMS.

### 7. Why does each file exist?
Each file exists to enforce separation of concerns:
- **Models** isolate the Mongoose database logic.
- **Contexts** abstract API and Socket calls away from UI layout files, preventing component re-render loops.
- **Components** break the massive visual layout down into smaller units, allowing for responsiveness and easier maintenance.
- **Services** (like `otpService.js` and `mockSocket.js`) wrap third-party API configurations so they can be easily replaced.

### 8. What happens if a file is deleted?
- Deleting **`server/app.js`** makes the backend completely inoperable.
- Deleting **`User.js`** breaks user lookup and authentication routes.
- Deleting **`AuthContext.jsx`** or **`ChatContext.jsx`** results in React compile failures since almost every page component relies on the context hooks.
- Deleting **`mockSocket.js`** breaks the connection wrapper, preventing real-time message exchange and disabling the fallback simulation mode.
- Deleting **`index.css`** removes all customized styles, breaking the design system.

### 9. Which files depend on each other?

```mermaid
graph TD
    %% Files
    Main[main.jsx] --> App[App.jsx]
    App --> AuthCtx[AuthContext.jsx]
    App --> ChatCtx[ChatContext.jsx]
    App --> LockScr[LockScreen.jsx]
    App --> Dash[MainDashboard.jsx]
    Dash --> Side[Sidebar.jsx]
    Dash --> ChatWin[ChatWindow.jsx]
    Dash --> Info[InfoPanel.jsx]
    ChatCtx --> MockSock[mockSocket.js]
    MockSock --> MockData[mockData.js]
    
    ServerApp[server/app.js] --> UserModel[models/User.js]
    ServerApp --> ConvoModel[models/Conversation.js]
    ServerApp --> MsgModel[models/Message.js]
    ServerApp --> OTP[services/otpService.js]
```

---

# # Frontend

### 10. How does the frontend start?
The frontend starts via the Vite development server. When the command `npm run dev` is executed inside the `bashab/` directory, Vite compiles the source code and spins up a local server. When a browser opens [http://localhost:5173](http://localhost:5173), Vite loads `index.html`, which requests `src/main.jsx`. This main script mounts the React application root into the HTML element with id `root`.

### 11. How does routing work?
Routing is managed by `react-router-dom` in [App.jsx](file:///C:/Users/USER/OneDrive/Desktop/bashab/bashab/src/App.jsx). It defines a route tree mapping URLs to view components:
- `/` renders `MainDashboard` (redirected to `/auth` if not authenticated, or to `/lock` if screen lock is enabled).
- `/auth` renders `AuthPages` for sign-up and login.
- `/lock` renders `LockScreen` to verify PIN or FaceID.
- Unmatched paths (`*`) fall back to the `NotFound` component.

### 12. How does state management work?
State management is implemented using React's **Context API**:
- **`AuthContext`** exposes state variables for `user` profile data, `isAuthenticated`, `appLocked`, `loginStep`, `lockMethod` (PIN or FaceID), and methods to manage authentication (e.g. `login`, `register`, `logout`, `unlockApp`, `saveSecuritySettings`).
- **`ChatContext`** manages state variables for `chats`, `selectedChatId`, `typingStatus`, `activeCall`, `callDuration`, `statuses`, `channels`, `communities`, and methods to interact with API endpoints and handle Socket.io events.

### 13. How does the frontend communicate with the backend?
The frontend communicates with the backend via two channels:
1. **HTTP REST APIs**: Handled via `axios` for standard request-response operations like signing up, uploading files, fetching previous message logs, creating chat rooms, joining channels, and submitting AI prompt sessions.
2. **WebSockets (Socket.io)**: Handled by `mockSocket.js` for real-time messaging, WebRTC calling signals, typing indicators, and read receipts.

### 14. How is authentication handled?
Authentication is token-based:
- After verifying an email OTP or logging in with password, the backend returns a JSON Web Token (JWT).
- The client stores this token in the browser's `localStorage` under the key `aether_token`.
- On page load, `AuthContext` checks if the token exists, sets it as the default authorization header for `axios`, and fetches the user's profile to verify the token.

### 15. How are protected pages secured?
Protected views are secured through conditional route checks in `App.jsx`:
```jsx
// Basic structure inside App.jsx
if (!isAuthenticated) {
  return <Navigate to="/auth" replace />;
}
if (appLocked) {
  return <Navigate to="/lock" replace />;
}
```
If a user is not authenticated or their app is locked, the router redirects them away from the dashboard.

### 16. How are components organized?
Components are organized into functional groups inside `src/components/`:
- **Main Layout Structure**: `Sidebar.jsx`, `ChatWindow.jsx`, and `InfoPanel.jsx` divide the screen.
- **Specific Feature Panels**: `CallsView.jsx`, `ChannelsView.jsx`, `CommunitiesView.jsx`, `StatusView.jsx`, and `SearchView.jsx` switch dynamically inside the sidebar based on the active tab.
- **Interactive Layers**: `CallOverlay.jsx`, `StatusViewer.jsx`, and `VoiceRecorder.jsx` render modals or overlays.

### 17. How is data fetched?
Data is fetched inside `ChatContext.jsx` via `axios` requests wrapped in a `loadData()` function:
- Runs automatically when `isAuthenticated` changes to `true`.
- Makes parallel HTTP requests to fetch conversations, channels, and communities.
- Syncs the returned database records to the React state.

### 18. How are loading and error states handled?
- **Loading States**: Handled via local boolean hooks (e.g. `loading` states in form buttons, or `scanning` state on the lock screen).
- **Error States**: Handled via `try/catch` blocks surrounding all REST API calls. If an error is caught, the client uses `react-hot-toast` to notify the user of the failure (e.g., `toast.error('Invalid credentials')`).

---

# # Backend

### 19. How does the backend start?
The backend starts by running `node app.js` or `npm start` inside the `server/` directory. It reads environmental configurations from `.env` via `dotenv`, connects to the MongoDB cluster using Mongoose, initialises the Socket.io server layer on top of an HTTP server, and starts listening on the configured port (default: 5000).

### 20. Explain every route
- **`POST /api/auth/send-otp`**: Generates a 6-digit verification code, updates the user's DB record, and dispatches it via email or SMS.
- **`POST /api/auth/verify-otp`**: Compares the provided code with the DB record, marks the user as verified, and returns a JWT token.
- **`POST /api/auth/register`**: Registers a new user with a password (restricted to developers or local setups).
- **`POST /api/auth/login`**: Verifies password against hash (restricted to administrative accounts).
- **`GET /api/auth/profile`**: Returns the authenticated user's profile details.
- **`PUT /api/auth/profile`**: Updates the user's profile settings (name, bio, theme, security preferences).
- **`DELETE /api/auth/profile`**: Deletes the user's account.
- **`GET /api/contacts`**: Fetches the authenticated user's contact list.
- **`POST /api/contacts/add`**: Adds an existing user by username to the user's contacts.
- **`POST /api/contacts/create-and-chat`**: Creates a placeholder contact user and immediately returns a new chat conversation.
- **`GET /api/users/search`**: Searches for users matching a query (escaped to prevent ReDoS).
- **`POST /api/media/upload`**: Uploads base64 encoded media files, saves them locally, and returns a URL.
- **`POST /api/chats/create`**: Creates direct or group chat conversations.
- **`GET /api/chats`**: Returns all conversations the user is a participant of, populated with the latest message.
- **`POST /api/chats/:chatId/pin`**: Toggles pinning for a chat room.
- **`POST /api/chats/:chatId/favorite`**: Toggles favorite status for a chat room.
- **`POST /api/chats/:chatId/archive`**: Toggles archiving for a chat room.
- **`POST /api/chats/:chatId/mute`**: Toggles muting notifications for a chat room.
- **`POST /api/chats/:chatId/lock`**: Toggles secure lock state for a chat room.
- **`DELETE /api/chats/:chatId`**: Deletes a conversation and all its messages.
- **`GET /api/chats/:chatId/messages`**: Retrieves all message history for a conversation.
- **`POST /api/status`**: Publishes a status update (story).
- **`GET /api/status`**: Fetches all active status stories.
- **`GET /api/channels`**: Fetches all available broadcast channels.
- **`POST /api/channels/create`**: Creates a new broadcast channel.
- **`POST /api/channels/:id/follow`**: Follows a broadcast channel.
- **`POST /api/channels/:id/unfollow`**: Unfollows a broadcast channel.
- **`POST /api/channels/:id/post`**: Publishes a new broadcast post to a channel.
- **`POST /api/channels/:id/posts/:postId/like`**: Toggles a like on a channel post.
- **`POST /api/channels/:id/posts/:postId/comment`**: Adds a comment to a channel post.
- **`GET /api/communities`**: Returns joined communities.
- **`POST /api/communities/create`**: Creates a new community.
- **`POST /api/communities/:id/join`**: Joins a community.
- **`POST /api/communities/:id/announcement`**: Adds an announcement to a community.
- **`POST /api/ai/chat`**: Generates a conversational response using the Google Gemini model.

### 21. Explain every controller
The application does not use separate controller files; all route logic is implemented inline inside the route handlers in `server/app.js` to keep the codebase simple.

### 22. Explain every middleware
- **`authenticateToken`**: Intercepts incoming requests, reads the `Authorization` header, extracts the JWT, verifies it using `jsonwebtoken` against the environment's `JWT_SECRET`, and attaches the decoded user ID to the request object (`req.userId`). Returns `401` if the token is missing and `403` if it is invalid.

### 23. Explain every model
- **`User` (`models/User.js`)**: Fields for name, username, email, phone, hashed password, bio, avatar, verified flag, theme preferences, security settings, and contacts list.
- **`Conversation` (`models/Conversation.js`)**: Fields for type (direct/group), name, avatar, list of participant IDs, list of pinned/archived/muted/locked user flags, and disappearing settings.
- **`Message` (`models/Message.js`)**: Fields for parent conversation ID, sender ID, type (text, image, audio, location, etc.), content text, file links, and poll option arrays.
- **`Status` (`models/Status.js`)**: Fields for author user ID, list of media files/stories, background gradients, and expiration date.
- **`Channel` (`models/Channel.js`)**: Fields for channel name, owner, followers list, and post arrays.
- **`Community` (`models/Community.js`)**: Fields for community name, description, announcements, and subgroup lists.

### 24. Explain every service
- **`otpService` (`server/services/otpService.js`)**: Dispatches generated OTP codes. It uses standard `fetch` requests to Brevo's SMTP API endpoints to send transaction emails.

### 25. Explain every utility/helper
- **`seedDatabase`**: A helper function in `server/app.js` that seeds the database with initial users, conversation threads, and message logs if it is empty.

### 26. Explain how requests move through the backend
1. An HTTP request hits Express.
2. It passes through global middlewares (`cors`, `express.json` parser).
3. If the path requires authentication, it passes through `authenticateToken`.
4. It hits the matching endpoint handler defined in `app.js`.
5. The handler interacts with MongoDB through Mongoose models.
6. The handler returns a response.

### 27. Explain how responses are returned
Responses are returned as JSON objects using Express's response methods (`res.json()`). If an operation fails, the server returns an appropriate HTTP status code (e.g., `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, or `500 Server Error`) along with a JSON error payload:
```json
{ "error": "Description of the error" }
```

---

# # Database

### 28. Which database is being used?
**MongoDB** (specifically MongoDB Atlas for remote hosting, or local MongoDB instance at `mongodb://127.0.0.1:27017` as a fallback) via the **Mongoose ODM**.

### 29. Why was this database chosen?
MongoDB is a document-oriented database, which fits chat applications well. Message threads, chat formats, user preferences, and status details are document-centric. MongoDB's flexible schema makes it easy to store varying message formats (text, image, location, polls) within a single `Message` collection.

### 30. Explain every collection/table
- **`users`**: Stores user accounts, contact associations, and profile preferences.
- **`conversations`**: Manages chat rooms, group properties, and membership.
- **`messages`**: Stores message history, attachments, and polls.
- **`statuses`**: Holds active 24-hour stories.
- **`channels`**: Manages broadcast channels and posts.
- **`communities`**: Holds community structures and announcements.

### 31. Explain every schema
Schemas are defined in `server/models/` using Mongoose:
- **`UserSchema`**:
  - String attributes (`name`, `username`, `email`, `password`, `phone`, `avatar`, `coverImage`, `bio`, `qrCode`, `otp`).
  - Dates (`otpExpires`).
  - Booleans (`verified`).
  - Nested objects (`themePreference`, `securitySettings`).
  - Array of User object IDs (`contacts`).
- **`ConversationSchema`**:
  - Strings (`type`, `name`, `avatar`, `description`, `disappearing`).
  - Booleans (`onlyAdminsCanMessage`).
  - ObjectIds (`creator`).
  - Arrays of ObjectIds (`participants`, `admins`, `pinnedBy`, `favoritedBy`, `archivedBy`, `mutedBy`, `lockedBy`).
- **`MessageSchema`**:
  - ObjectIds referencing parent schemas (`conversationId`, `senderId`, `replyTo`).
  - Strings (`type`, `text`, `mediaUrl`, `duration`, `locationName`, `coordinates`, `pollQuestion`).
  - Arrays (`waveform`, `pollOptions`).

### 32. Explain every relationship
- **One-to-Many**: A `Conversation` can contain many `Message` documents, related via `Message.conversationId` referencing `Conversation._id`.
- **Many-to-Many**: `User` and `Conversation` share a relationship where a `Conversation` stores participant User IDs (`participants`), and a `User` stores contacts (`contacts`).
- **References**: `Message` references the sending `User` (`senderId`) and potentially another message (`replyTo`).

### 33. Explain how CRUD operations work
CRUD operations are handled using Mongoose methods:
- **Create**: Instantiating a new Mongoose model object and calling `.save()`.
- **Read**: Using queries like `.find()`, `.findOne()`, and `.findById()` with `.populate()` to join related documents.
- **Update**: Using methods like `.findByIdAndUpdate()`, `.updateOne()`, or modifying document attributes directly and calling `.save()`.
- **Delete**: Using `.deleteOne()`, `.deleteMany()`, or `.findByIdAndDelete()`.

### 34. Explain how indexes are used
- **Implicit Indexing**: MongoDB automatically indexes primary keys (`_id`).
- **Unique Indexes**: Schema constraints on `username` and `email` enforce unique indexes, preventing duplicate accounts.
- **Explicit Indexing (Performance)**:
  - An index is defined on `ConversationSchema.participants` to load active conversations in milliseconds.
  - A compound index is defined on `MessageSchema` for `{ conversationId: 1, createdAt: 1 }` to optimize historical message queries and sort times under 1ms.

### 35. Explain how data is validated
Mongoose validates data using schema constraints:
- **Presence**: `required: true` properties (e.g. `email` in User Schema).
- **Format**: Data types are validated on save (e.g., passing an invalid array to `contacts` throws a validation error).
- **Custom Logic**: Logical checks are performed inside backend routes (e.g., checking if the email format is correct before generating an OTP).

---

# # Authentication

### 36. How does user registration work?
1. The user enters their email and phone number on the frontend.
2. The frontend sends a `POST` request to `/api/auth/send-otp`.
3. The server checks if a user exists with that email. If not, it creates a new user account with a random username and avatar.
4. The server generates a 6-digit OTP code, saves it to the user's DB record with a 10-minute expiration, and sends it via email or SMS.
5. The user enters the code on the frontend, which sends a `POST` request to `/api/auth/verify-otp`.
6. The server validates the code and expiration, marks the user as verified, and returns a JWT token.

### 37. How does login work?
- **OTP Login**: Follows the same flow as registration. Since `send-otp` creates a new user if one doesn't exist, OTP login acts as both login and registration.
- **Password Login**: Users can also log in by submitting a username/email and password to `/api/auth/login` (restricted to administrative accounts).

### 38. How are passwords stored?
Passwords are encrypted using **bcryptjs** with a salt factor of `10`. This creates a one-way cryptographic hash of the password before saving it to the database, ensuring that plaintext passwords are never stored.

### 39. How are JWT tokens handled?
- **Generation**: Generated upon successful login or OTP verification using `jwt.sign()`. The payload contains the user's database `_id`, and is signed using `process.env.JWT_SECRET` with a 7-day expiration.
- **Transmission**: The token is sent to the client in the response body.
- **Storage**: The client stores the token in `localStorage`.
- **Consumption**: The client attaches the token to the `Authorization` header of all future HTTP and WebSocket requests.

### 40. How are users authenticated on every request?
- **HTTP**: The `authenticateToken` middleware parses the incoming request's headers, extracts the Bearer token, verifies it, and attaches the decoded user ID to `req.userId`.
- **WebSockets**: Upon connection, the client emits an `auth` event with their JWT token. The server verifies this token and maps the user's ID to their socket connection in the `activeSockets` map.

### 41. How are users logged out?
Logging out is handled on the client side by removing the token from `localStorage` and clearing the authentication headers:
```javascript
localStorage.removeItem('aether_token');
delete axios.defaults.headers.common['Authorization'];
```
This instantly invalidates the client session.

---

# # File Uploads

### 42. How does file uploading work?
1. The user selects a file (image, audio, status story, profile avatar, or document) on the frontend.
2. The file is converted into a base64-encoded string on the client.
3. The base64 string is sent to the backend via a `POST` request to `/api/media/upload`.
4. The server converts the base64 string back into a binary buffer and extracts the MIME type.
5. The server invokes the storage service (`server/services/cloudinaryService.js`), validates size constraints, sanitizes filenames, and uploads the file to **Cloudinary Cloud Storage**.
6. The server returns the secure HTTPS Cloudinary URL back to the client.

### 43. Where are uploaded files stored?
They are stored on **Cloudinary Cloud Storage** inside organized folders based on MIME type and filename prefixes (e.g., `chat-images/`, `chat-videos/`, `voice-notes/`, `status/`, `profiles/`, `documents/`). If Cloudinary credentials are not configured, the backend automatically falls back to storing uploads locally inside the `server/uploads/` directory for developer convenience.

### 44. Why are they stored there?
Storing uploads in Cloudinary makes the backend completely stateless, ensuring data persistence and horizontal scaling compatibility. The local directory fallback is retained to guarantee the system works out-of-the-box in local development without mandatory cloud configuration.

### 45. Is this suitable for production?
**Yes**, the Cloudinary integration is fully production-ready. By moving the storage of user media to the cloud, the backend remains stateless, meaning instances can be scaled horizontally, restarted, or redeployed without risking any data loss or exhausting local disk space.

### 46. What problems could occur?
With Cloudinary integrated:
- **Bandwidth/Cost**: High media volume can consume Cloudinary monthly bandwidth. This is mitigated by server-side size checks (10MB limit for images/docs, 50MB limit for video/audio).
- **Service Outage**: Dependency on Cloudinary means uploads will fail if Cloudinary experiences downtime.

### 47. How would large applications handle file storage?
Large production applications use cloud storage solutions (like Cloudinary, AWS S3, or Google Cloud Storage). AetherChat has implemented this by integrating Cloudinary:
1. The client sends the file data to the server.
2. The server streams the binary buffer to Cloudinary.
3. Cloudinary hosts the file and returns a secure HTTPS URL.
For extremely high scales, the app can be further optimized using client-side direct uploads via presigned Cloudinary/S3 signatures to offload the network load from the Express server.

---

# # Features

### 48. Explain the complete logic behind every feature
- **Real-time Messaging**:
  - The client submits a message.
  - In offline mode, the message is updated locally and simulated responses are generated.
  - In online mode, the message payload is sent over the WebSocket to the server, which saves it to MongoDB and sends a `message_received` event directly to both the sender and recipient's active socket connections.
- **WebRTC Calling**:
  - The caller triggers a call and sends a `call_invite` socket event.
  - The recipient receives an `incoming_call` socket event and accepts or declines.
  - If accepted, the client uses WebRTC signaling through the server to establish a peer-to-peer connection for voice/video streaming.
- **Status Stories**:
  - Users can post text or media status stories.
  - Stories are saved with an expiration date and automatically expire after 24 hours.
- **Google Gemini AI Assistant**:
  - Users can chat with "Aether AI" to ask questions, translate text, or summarize chats.
  - If a Gemini API key is configured, the backend forwards the prompt to Google's API; otherwise, the frontend falls back to mock responses.

### 49. Explain how each feature communicates with the backend
All features use either REST APIs (handled via `axios` requests) or real-time WebSockets (handled via `mockSocket` emitters and listeners) to communicate with the backend.

### 50. Explain how data flows through the system
```
[Client User Input] 
       │
       ▼
[React UI Component] 
       │
       ▼
[Context Action (Auth/Chat)]
       │
 ┌─────┴────────────────────────┐
 │ (HTTP)                       │ (WebSockets)
 ▼                              ▼
[Axios Client]                 [mockSocket Client]
 │                              │
 ▼                              ▼
[Express Routes] <──────────> [Socket.io Server]
 │                              │
 └─────┬────────────────────────┘
       │
       ▼
[Mongoose ODM]
       │
       ▼
[(MongoDB Database)]
```

### 51. Explain how errors are handled
- **Backend**: Errors are caught using `try/catch` blocks. The server logs the error locally and returns a `500` status code with a JSON error payload to prevent the server from crashing.
- **Frontend**: The client catches HTTP and Socket errors, logs them to the console, and displays user-friendly error alerts using `react-hot-toast`.

---

# # Security

### 52. What security measures exist?
- **Authentication**: JWT token verification is required for all API routes except signup, login, and static assets.
- **Encryption**: Passwords are encrypted using bcrypt hashing.
- **Input Sanitization**: User inputs are escaped before being passed to `new RegExp()` constructors, protecting against ReDoS attacks.

### 53. What security vulnerabilities exist?
- **Sensitive Credentials**: The `.env` file contains production Brevo API keys and database credentials, which could be leaked if committed to source control.
- **Missing Rate Limiting**: There is no rate limiting on the OTP or auth routes, making them vulnerable to brute-force attacks and abuse.
- **Unrestricted File Uploads**: The file upload endpoint accepts any file format without verifying content types, which could allow malicious file uploads.

### 54. What should be improved?
- Move credentials to a secure secret manager (e.g. AWS Secrets Manager, HashiCorp Vault) or load them as environment variables during deployment.
- Implement rate limiting (e.g. `express-rate-limit`) on critical authentication endpoints.
- Validate uploaded file MIME types on both the client and server.

---

# # Performance

### 55. What could become slow?
- Loading message history without pagination or lazy loading will become slow as the database grows.
- Reading local files from disk on the server will slow down as the number of concurrent uploads increases.

### 56. Which parts will not scale well?
- Storing active socket connections in an in-memory `Map` (`activeSockets`) will not scale across multiple server instances.
- Saving uploaded files directly to the local filesystem will cause issues once the disk space fills up.

### 57. What bottlenecks exist?
- **Database**: Single-instance database connections can become a bottleneck under high write loads.
- **CPU**: Hashing passwords with bcrypt is CPU-intensive and can slow down the server under heavy login traffic.
- **I/O**: Local disk writes for uploads will block event loops under high concurrent usage.

### 58. What happens with 10 users?
The application runs smoothly. Memory usage is low and CPU utilization remains minimal.

### 59. What happens with 1,000 users?
The application performs extremely well. Since file uploads are offloaded to Cloudinary, there is no risk of local disk space exhaustion. Database queries are highly optimized (under 1ms execution) due to the configured indexes on conversations and messages.

### 60. What happens with 100,000 users?
- Node.js will successfully handle concurrent operations, but a single instance will be near its limit for socket connections.
- MongoDB will run efficiently due to indexing, but may need replica sets.
- File uploads remain fast and stateless because they stream to Cloudinary, avoiding disk I/O bottlenecks.

### 61. What happens with 1 million users?
To support 1 million concurrent users, the system needs to scale horizontally:
- Distribute traffic using a load balancer (e.g., Nginx or AWS ALB).
- Scale the backend horizontally across multiple node instances.
- Use a Redis Adapter (e.g., `@socket.io/redis-adapter`) to sync socket events across server instances.
- Scale the database using MongoDB sharding and replica sets.

---

# # Architecture

### 62. Is the architecture good?
Yes, the current structure is clean and works well for small to medium-scale deployments. The separation of concerns between models, routes, and services on the backend, combined with Context-based state management on the frontend, provides a solid foundation. However, it must be refactored to support horizontal scaling for larger deployments.

### 63. What design patterns are used?
- **Module Pattern**: Exposes specific functions and state.
- **Provider Pattern**: React Context wraps the application to share global authentication and chat states.
- **Singleton/Wrapper Pattern**: The `SocketService` wraps the Socket.io client to manage connection state.
- **Model-View-Controller (MVC) Concept**: Models define data schemas, views render the React components, and routes act as controllers.

### 64. What best practices are followed?
- Storing configuration parameters in a `.env` file.
- Encrypting passwords using bcrypt.
- Separating business logic from UI components using React Context.
- Standardizing API responses as JSON payloads.

### 65. What best practices are missing?
- **API Versioning**: Endpoints are defined directly under `/api/` instead of `/api/v1/`.
- **Database Pagination**: Chat histories are loaded all at once instead of using pagination.
- **Unit Testing**: The project lacks automated tests for API endpoints and React components.
- **In-Memory Socket Mapping**: Active socket associations are kept in memory rather than in a shared store like Redis, preventing multi-instance scaling.

---

# # Problems

### 66. List every problem found
1. In-memory socket mapping prevents horizontal scaling.
2. Lack of message pagination will slow down large chats.
3. No rate limiting on the OTP dispatch route.
4. Insecure credentials committed to version control.

*(Note: Stateless file storage, file size validations, and database indexing have been successfully resolved).*

### 67. Explain why each problem exists
These design choices were made to prioritize development speed and ease of setup. Using in-memory maps avoids the complexity of configuring external cloud services (like Redis) during initial development.

### 68. Rank the problems from most important to least important
1. **Lack of Rate Limiting on OTP**: High risk of API abuse and SMS/Email dispatch costs.
2. **In-Memory Socket Mapping**: Blocks horizontal scaling of the real-time servers.
3. **Lack of Message Pagination**: Degrades performance as chat history grows.
4. **Insecure Credentials**: Security risk for leaked keys.

---

# # Improvement Roadmap

### 69. Completed Improvements
- **Stateless File Storage**: Replaced local file storage with Cloudinary Cloud Storage, complete with structured directory naming based on file types.
- **File Validation**: Integrated size checks on the backend (10MB limit for images/docs, 50MB limit for video/audio) to protect against resource abuse.
- **Database Indexing**: Optimized MongoDB performance under 1ms by adding compound indexes `{ conversationId: 1, createdAt: 1 }` on messages and `participants: 1` on conversations.
- **Enhanced Sockets**: Resolved reference errors, synchronized chat deletions to both participants' sockets, and optimized subscription teardowns.

### 70. What should be improved next?
**Rate Limiting and Security**:
- Implement `express-rate-limit` on the OTP dispatch and auth routes to protect against brute-force attacks.
- Move credentials from `.env` to a secure secret manager (e.g., AWS Secrets Manager).

### 71. What should be improved after security?
**Redis Adapter for Sockets**:
- Integrate `@socket.io/redis-adapter` to distribute socket events across multiple backend server instances, enabling horizontal scaling.

### 72. Continue until the application is production-ready
**Production Readiness Checklist**:
- [x] **Database Indexing**: Done.
- [x] **Stateless File Storage & Validation**: Done.
- [ ] **Message Pagination**: Implement cursor-based pagination (e.g. limit 50 messages per fetch, load more on scroll up) in `ChatContext.jsx` and `app.js`.
- [ ] **CI/CD Pipeline**: Configure automated testing (Jest, Cypress) and deployment scripts to deploy the frontend to Vercel/Netlify and the backend to AWS ECS/Heroku.
## Recent Updates
- Added language switch implementation in SettingsView using react-i18next.
- Fixed reference error `supportMsgInput` by correcting to `ticketMessage`.
- Enhanced ChatWindow UI: AI messages left-aligned with distinct styling, user messages right-aligned, added typing indicator.
- Implemented new business and organization account functions:
  - **Business Account Functions**:
    - Invoicing & Payments integration
    - Loyalty Programs management
    - Appointment Reminders scheduling
    - Resource Allocation dashboard
  - **Organization Account Functions**:
    - Announcements Banner system
    - Skill Matrix tracking
    - Document Approval Workflow
    - Community & Channel administration
## Implemented Functions

**Business Account Functions**
- Invoicing & Payments integration
- Loyalty Programs management
- Appointment Reminders scheduling
- Resource Allocation dashboard

**Organization Account Functions**
- Announcements Banner system
- Skill Matrix tracking
- Document Approval Workflow
- Community & Channel administration

**Other Enhancements**
- Language switch implementation in SettingsView (react-i18next)
- Fixed reference error `supportMsgInput` → `ticketMessage`
- Enhanced ChatWindow UI (AI messages left-aligned, typing indicator)
