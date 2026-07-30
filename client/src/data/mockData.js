// Mock database for the unified messaging platform

// Beautiful SVG avatar generator for self-contained, premium vector avatars
export const getAvatarSvg = (seed, bg = '4f46e5', fg = 'ffffff') => {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="%23${bg}"/>
    <text x="50" y="55" font-family="'Outfit', sans-serif" font-size="36" font-weight="bold" fill="%23${fg}" text-anchor="middle" dominant-baseline="middle">
      ${seed.slice(0, 2).toUpperCase()}
    </text>
  </svg>`;
};

// Generates a mock QR code SVG
export const getQrCodeSvg = (text) => {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200" style="background:white;padding:10px;">
    <path d="M10 10h30v30H10zm10 10v10h10V20zm30-10h30v30H50zm10 10v10h10V20zM10 50h30v30H10zm10 10v10h10V60zm30-10h10v10H50zm20 0h10v20H70zm-10 10h10v10H60zm10 10h20v10H70zm-20 10h10v10H50zm20 0h10v10H70z" fill="black"/>
    <rect x="42" y="42" width="16" height="16" fill="%2310b981"/>
  </svg>`;
};

export const currentUser = {
  id: 'user_me',
  role: 'admin',
  accountType: 'personal', // 'personal' | 'business' | 'organization'
  username: 'alex_aether',
  name: 'Alex Mercer',
  email: 'alex.mercer@aether.io',
  phone: '+1 (555) 019-2834',
  bio: 'Designing the future of communication. Always active on Aether.',
  avatar: getAvatarSvg('AM', '10b981', 'ffffff'),
  coverImage: '#1e293b',
  qrCode: getQrCodeSvg('alex_aether_profile_link'),
  blockedUsers: ['blocked_user_1'],
  privacy: {
    lastSeen: 'everyone',
    profilePhoto: 'everyone',
    about: 'everyone',
    groups: 'contacts',
    disappearingMessages: 'off',
    readReceipts: true,
  },
  security: {
    twoFactor: false,
    faceId: false,
    pinLock: false,
    pin: '1234'
  },
  notifications: {
    messageSound: 'default',
    callSound: 'ringtone',
    showPreview: true,
    groupNotifications: true,
    channelNotifications: true,
  },
  theme: {
    mode: 'light', // 'dark' | 'light'
    primaryColor: 'emerald', // 'emerald' | 'sapphire' | 'amethyst' | 'rose'
    chatWallpaper: 'grid', // 'grid' | 'dots' | 'solid' | 'neon'
    fontSize: 'medium', // 'small' | 'medium' | 'large'
    bubbleStyle: 'rounded' // 'rounded' | 'sharp' | 'playful'
  }
};

export const mockUsers = [
  {
    _id: 'user_1', id: 'user_1',
    name: '',
    username: 'evelyn_vane',
    email: 'evelyn@aether.io',
    phone: '+1 (555) 123-4567',
    avatar: getAvatarSvg('EV', 'ec4899', 'ffffff'),
    online: true, verified: true,
    bio: 'Lead designer • Dark mode enthusiast'
  },
  {
    _id: 'user_2', id: 'user_2',
    name: 'Daniel Park',
    username: 'daniel_park',
    email: 'daniel@aether.io',
    phone: '+1 (555) 234-5678',
    avatar: getAvatarSvg('DP', '3b82f6', 'ffffff'),
    online: true, verified: true,
    bio: 'Full-stack developer • Open source contributor'
  },
  {
    _id: 'user_3', id: 'user_3',
    name: 'Sophia Chen',
    username: 'sophia_chen',
    email: 'sophia@aether.io',
    phone: '+1 (555) 345-6789',
    avatar: getAvatarSvg('SC', 'f59e0b', 'ffffff'),
    online: false, verified: true,
    bio: 'Security researcher • Encryption advocate'
  },
  {
    _id: 'user_4', id: 'user_4',
    name: 'Marcus Rivera',
    username: 'marcus_r',
    email: 'marcus@aether.io',
    phone: '+1 (555) 456-7890',
    avatar: getAvatarSvg('MR', '8b5cf6', 'ffffff'),
    online: true, verified: true,
    bio: 'Product manager • Agile enthusiast'
  },
  {
    _id: 'user_5', id: 'user_5',
    name: 'Aria Foster',
    username: 'aria_foster',
    email: 'aria@aether.io',
    phone: '+1 (555) 567-8901',
    avatar: getAvatarSvg('AF', '06b6d4', 'ffffff'),
    online: false, verified: true,
    bio: 'UX researcher • Accessibility first'
  },
  {
    _id: 'user_6', id: 'user_6',
    name: 'James Okafor',
    username: 'james_o',
    email: 'james@aether.io',
    phone: '+1 (555) 678-9012',
    avatar: getAvatarSvg('JO', '10b981', 'ffffff'),
    online: true, verified: true,
    bio: 'DevOps engineer • Cloud architect'
  },
  {
    _id: 'user_7', id: 'user_7',
    name: 'Luna Martinez',
    username: 'luna_m',
    email: 'luna@aether.io',
    phone: '+1 (555) 789-0123',
    avatar: getAvatarSvg('LM', 'ef4444', 'ffffff'),
    online: true, verified: true,
    bio: 'Data scientist • AI/ML pipelines'
  }
];
export const mockGroups = [];
export const mockCommunities = [];
export const mockChannels = [];
export const mockStatuses = [];
export const mockCalls = [];
export const initialChats = [];
