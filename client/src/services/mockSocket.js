// Hybrid socket service supporting real-time backend synchronization and local simulation fallbacks.
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// Dynamic backend URL: in production the server serves the built client from the same origin
const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

class SocketService {
  constructor() {
    this.listeners = {};
    this.socket = null;
    this.isRealConnected = false;
    this.isInitialized = false;
    this.currentUser = null;
    this.simulatorIntervals = [];
    this.simulatorTimeouts = [];
  }

  // Register event listeners
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Bind to real socket if active
    if (this.socket) {
      this.socket.on(event, callback);
    }

    return () => this.off(event, callback);
  }

  // Unregister event listeners
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit events
  emit(event, data) {
    // 1. Emit to real backend if connected
    if (this.isRealConnected && this.socket) {
      this.socket.emit(event, data);
      return;
    }

    // 2. Local propagation to listeners
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  get connectionStatus() {
    return this.isRealConnected ? 'connected' : (this.socket ? 'connecting' : 'offline');
  }

  // Initialize service
  init(currentUser) {
    const token = sessionStorage.getItem('aether_token');
    const currentUserId = currentUser?._id || currentUser?.id;
    const prevUserId = this.currentUser?._id || this.currentUser?.id;

    if (this.isInitialized && this.socket && currentUserId === prevUserId) {
      return;
    }

    // Clean up existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Clear old simulator intervals/timeouts
    this.simulatorIntervals.forEach(clearInterval);
    this.simulatorTimeouts.forEach(clearTimeout);
    this.simulatorIntervals = [];
    this.simulatorTimeouts = [];

    this.isInitialized = true;
    this.currentUser = currentUser;

    if (token) {
      try {
        // Attempt to connect to real Node backend
        this.socket = io(SOCKET_URL, {

          transports: ['websocket', 'polling'],
          reconnectionAttempts: 3,
          timeout: 5000
        });

        this.socket.on('connect', () => {
          console.log('[SOCKET] Connected to backend Socket.io server.');
          this.isRealConnected = true;
          this.socket.emit('auth', token);
          
          // Re-bind all local registered listeners to real socket
          Object.keys(this.listeners).forEach(event => {
            this.listeners[event].forEach(cb => {
              this.socket.on(event, cb);
            });
          });
        });

        this.socket.on('disconnect', (reason) => {
          console.log('[SOCKET] Disconnected from backend socket:', reason);
          this.isRealConnected = false;
        });

        this.socket.on('connect_error', () => {
          this.isRealConnected = false;
        });

        // Reconnection handler
        this.socket.io.on('reconnect', () => {
          console.log('[SOCKET] Reconnected to backend.');
          this.isRealConnected = true;
          this.socket.emit('auth', token);
          Object.keys(this.listeners).forEach(event => {
            this.listeners[event].forEach(cb => this.socket.on(event, cb));
          });
        });

      } catch (err) {
        console.warn('Real socket initialization failed, running in simulation mode:', err);
        this.isRealConnected = false;
      }
    }

    // Always run local background simulators as fallback if offline
    this.startIncomingCallSimulator();
    this.startTypingAndMessageSimulator();
  }

  // Disconnect service
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isRealConnected = false;
    this.isInitialized = false;
    this.currentUser = null;
  }

  startIncomingCallSimulator() {
    const t = setTimeout(() => {
      if (!this.isRealConnected) {
        this.emit('incoming_call', {
          callId: 'sim_call_' + Date.now(),
          callerId: 'user_1',
          callerName: '',
          callerAvatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23ec4899"/><text x="50" y="55" font-family="'Outfit', sans-serif" font-size="36" font-weight="bold" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">EV</text></svg>`,
          type: Math.random() > 0.5 ? 'video' : 'voice',
        });
      }
    }, 45000);
    this.simulatorTimeouts.push(t);
  }

  startTypingAndMessageSimulator() {
    const interval = setInterval(() => {
      // Only simulate if offline to prevent overlapping with real database events
      if (!this.isRealConnected) {
        const potentialSenders = ['user_1', 'user_2', 'user_3', 'user_5'];
        
        // 1. Randomly toggle online/offline status of simulated contacts to make the dashboard feel live!
        if (Math.random() < 0.3) {
          const randomContactId = potentialSenders[Math.floor(Math.random() * potentialSenders.length)];
          const isOnline = Math.random() > 0.35;
          this.emit(isOnline ? 'user_online' : 'user_offline', { userId: randomContactId });
        }

        // 2. Random typing and messaging events
        if (Math.random() < 0.35) {
          const randomSenderId = potentialSenders[Math.floor(Math.random() * potentialSenders.length)];
          const chats = {
            'user_1': 'chat_user_1',
            'user_2': 'chat_user_2',
            'user_3': 'chat_user_3',
            'user_5': 'chat_group_1'
          };
          const chatId = chats[randomSenderId];

          const typingPhrases = [
            "typing a response...",
            "recording a voice note...",
            "uploading a file...",
          ];
          const statusText = typingPhrases[Math.floor(Math.random() * typingPhrases.length)];

          this.emit('typing_status', { chatId, senderId: randomSenderId, status: statusText });

          setTimeout(() => {
            this.emit('typing_status', { chatId, senderId: randomSenderId, status: null });

            const mockMessages = {
              'user_1': [
                "Are we good to lock in the primary theme color as Emerald?",
                "Look at this! Let's check it in the morning.",
                "Sent you the details over email too ✌️",
                "Check out this cool GIF! 🤣"
              ],
              'user_2': [
                "Just pushed the fixes to main. Let me know if you run into conflicts.",
                "Vite compiles Tailwind v4 in like 30ms, it is insane!",
                "Is the mobile bottom sheet responsive enough?"
              ],
              'user_3': [
                "Verified. No anomalies found in the logs.",
                "I am planning to audit the client-side encryption next week.",
                "Stay alert."
              ],
              'user_5': [
                "Did someone say Design Syndicate? Make it red! 🔥",
                "I'm hungry, let's order pizza 🍕",
                "Boom! 🌋"
              ]
            };

            const textArray = mockMessages[randomSenderId];
            const text = textArray[Math.floor(Math.random() * textArray.length)];

            this.emit('message_received', {
              chatId,
              message: {
                id: 'sim_msg_' + Date.now(),
                senderId: randomSenderId,
                text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'sent'
              }
            });
          }, 3000 + Math.random() * 2000);
        }
      }
    }, 12000);
    this.simulatorIntervals.push(interval);
  }

  async simulateAiResponse(userPrompt, history = [], callback, targetChatId = 'chat_user_ai') {
    this.emit('typing_status', { chatId: targetChatId, senderId: 'user_ai', status: 'thinking...' });

    let responseText = "";
    let responseType = "text";
    let mediaUrl = "";
    let caption = "";
    let isRealAi = false;

    // Helper to parse image output from Gemini raw response
    const parseImageResponse = (text) => {
      if (text.trim().startsWith('[IMAGE]')) {
        const imgMatch = text.match(/\[IMAGE\]\s*(.+)/i);
        const capMatch = text.match(/\[CAPTION\]\s*(.+)/i);
        
        const imagePrompt = imgMatch ? imgMatch[1].split('\n')[0].trim() : userPrompt;
        const imgCaption = capMatch ? capMatch[1].trim() : `Here is your generated image of "${userPrompt}"!`;
        const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=768&nologo=true&seed=${Date.now()}`;
        
        return {
          type: 'image',
          mediaUrl: imgUrl,
          caption: imgCaption
        };
      }
      return null;
    };

    // 1. Try Client-side Gemini API
    const clientApiKey = sessionStorage.getItem('aether_gemini_api_key');
    if (clientApiKey) {
      try {
        const contents = [];
        if (history && Array.isArray(history)) {
          history.forEach(msg => {
            const role = msg.senderId === 'user_me' ? 'user' : 'model';
            if (msg.type === 'text' && msg.text) {
              contents.push({
                role: role,
                parts: [{ text: msg.text }]
              });
            }
          });
        }

        contents.push({
          role: 'user',
          parts: [{ text: userPrompt }]
        });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: contents,
            systemInstruction: {
              parts: [{
                text: "You are Aether AI, a highly intelligent personal AI assistant integrated into the AetherChat messaging terminal. Your personality is sleek, tech-forward, professional yet friendly. Use markdown, short paragraphs, bold terms, bullet points, and appropriate emojis to format your responses beautifully. Keep it highly interactive, clear, and extremely smart.\n\nCRITICAL: If the user asks you to generate, draw, or create an image/illustration, you must start your response with `[IMAGE]` followed on the same line by a detailed, descriptive prompt for an image generation model (like Imagen or Stable Diffusion) describing the requested visual in vivid detail, and then on the next line write `[CAPTION]` followed by a friendly user-facing caption message. Otherwise, just reply with your text response as usual."
              }]
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawText) {
            const parsedImg = parseImageResponse(rawText);
            if (parsedImg) {
              responseType = 'image';
              mediaUrl = parsedImg.mediaUrl;
              caption = parsedImg.caption;
              responseText = parsedImg.caption;
            } else {
              responseType = 'text';
              responseText = rawText;
            }
            isRealAi = true;
          }
        }
      } catch (err) {
        console.error("Error with client Gemini call:", err);
      }
    }

    // 2. Try Backend AI Endpoint
    if (!isRealAi) {
      try {
        const token = sessionStorage.getItem('aether_token');
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ prompt: userPrompt, history })
        });

        const responseTextData = await response.text();
        console.log('[AI Debug] Backend response status:', response.status, responseTextData);

        if (response.ok) {
          const data = JSON.parse(responseTextData);
          console.log('[AI Debug] Backend response data:', data);
          if (data.type === 'image') {
            responseType = 'image';
            mediaUrl = data.mediaUrl;
            caption = data.caption;
            responseText = data.caption;
          } else {
            responseType = 'text';
            responseText = data.response;
          }
          if (responseText) isRealAi = true;
        }
      } catch (err) {
        // Fallback to local response
      }
    }

    // 3. Fallback mock responses
    if (!isRealAi) {
      const lower = userPrompt.toLowerCase();
      if (lower.includes('create image') || lower.includes('generate image') || lower.includes('draw') || lower.includes('paint') || lower.includes('picture of')) {
        const imageSubject = userPrompt.replace(/(create image of|generate image of|draw a picture of|draw a|draw|paint a|paint|picture of)/i, '').trim() || 'futuristic collaboration';
        responseType = 'image';
        mediaUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imageSubject)}?width=1024&height=768&nologo=true&seed=${Date.now()}`;
        caption = `Here is your generated image of **${imageSubject}**! 🎨 *(Simulated via Pollinations.ai API)*`;
        responseText = caption;
      } else if (lower.includes('translate')) {
        responseText = "🌐 **Aether AI Translation Hub:**\n\n- **Original:** \"" + userPrompt.replace(/translate/i, '').trim() + "\"\n- **Aether Translation (Spanish):** \"Aether cuenta con comunicación segura en tiempo real con elementos de interfaz modular avanzados.\"\n- **Aether Translation (French):** \"Aether propose une communication sécurisée en temps réel avec des elementos d'interface utilisateur modulaires avancés.\"\n\n*Tip: Connect your Grok API Key in Settings to translate any custom phrases!*";
      } else if (lower.includes('summarize')) {
        responseText = "📝 **Session Summary Report (Aether AI):**\n\n1. **Figma Mockups**: Evelyn requested feedback on dark mode layouts.\n2. **Theme Blur**: Recommended increase to 16px blur on glassmorphic cards (updated successfully).\n3. **Typography Poll**: The team is voting on display font. *Outfit* is currently leading over *Inter*.\n4. **System Security**: Daniel confirmed iOS scroll optimizations are active on the dev sandbox.\n\n*Note: Real LLM summarization requires a Grok API Key.*";
      } else if (lower.includes('rewrite') || lower.includes('improve')) {
        responseText = "✍️ **Refined Draft Options:**\n\n*Option 1 (Professional):*\n\"Hello everyone, I've finalized the visual audits and updated the glassmorphism blur parameters to 16px. The elements now resolve with significantly better readability. Please let me know your thoughts on the PDF document.\"\n\n*Option 2 (Casual/Sleek):*\n\"Hey team! Adjusted the card blur to 16px. It looks clean and premium. Let me know what you think of the new guidelines PDF! 🚀\"";
      } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        responseText = "🤖 **Aether AI:** Hello! I am Aether AI, your workspace co-pilot. How can I help you today? 😊";
      } else if (lower.includes('help') || lower.includes('commands') || lower.includes('setup')) {
        responseText = "🤖 **Aether AI Assistance:**\n\nHere are some commands you can run:\n- `summarize` - Summarize active design discussions.\n- `translate <text>` - Translate a message.\n- `rewrite <text>` - Polish/improve a draft.\n- `draw <subject>` - Generate an image dynamically!";
      } else {
        responseText = `🤖 **Aether AI:** I received your message: "${userPrompt}". I'm running in companion mode right now. Let me know if there's anything else I can help you with!`;
      }
    }

    setTimeout(() => {
      this.emit('typing_status', { chatId: targetChatId, senderId: 'user_ai', status: null });

      const aiMessage = {
        id: 'sim_ai_' + Date.now(),
        senderId: 'user_ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent'
      };

      if (responseType === 'image') {
        aiMessage.type = 'image';
        aiMessage.mediaUrl = mediaUrl;
        aiMessage.caption = caption;
        aiMessage.text = caption;
      } else {
        aiMessage.type = 'text';
        aiMessage.text = responseText;
      }

      callback(aiMessage);
    }, 1200 + Math.random() * 800);
  }
}

export const mockSocket = new SocketService();
export default mockSocket;
