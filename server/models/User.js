const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  avatar: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  bio: { type: String, default: 'Available' },
  website: { type: String, default: '' },
  location: { type: String, default: '' },
  pin: { type: String, default: '1234' },
  verified: { type: Boolean, default: false },
  qrCode: { type: String, default: '' },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  accountType: { type: String, enum: ['personal','business','organization'], default: 'personal' },
  role: { type: String, enum: ['user','support','admin'], default: 'user' },
  banned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
  bannedAt: { type: Date },
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  suspendedUntil: { type: Date, default: null },
  suspendReason: { type: String, default: '' },
  businessProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null },
  organizationMemberships: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationMember' }],
  themePreference: {
    mode: { type: String, default: 'light' },
    primaryColor: { type: String, default: 'emerald' },
    fontSize: { type: String, default: 'medium' },
    bubbleStyle: { type: String, default: 'rounded' },
    chatWallpaper: { type: String, default: 'grid' },
    language: { type: String, default: 'en' }
  },
  securitySettings: {
    pinLock: { type: Boolean, default: false },
    faceId: { type: Boolean, default: false },
    twoFactor: { type: Boolean, default: false }
  },
  notifications: {
    showPreview: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    doNotDisturb: { type: Boolean, default: false }
  },
  privacySettings: {
    lastSeen: { type: String, default: 'everyone' },
    readReceipts: { type: Boolean, default: true },
    profilePhoto: { type: String, default: 'everyone' }
  },
  chatPrefs: {
    enterToSend: { type: Boolean, default: true },
    autoDownloadMedia: { type: Boolean, default: true },
    disappearingMessagesDefault: { type: String, default: 'off' }
  },
  aiPrefs: {
    smartReplies: { type: Boolean, default: true },
    autoTranslate: { type: Boolean, default: false },
    discussionSummary: { type: Boolean, default: true }
  },
  accessibilityPrefs: {
    highContrast: { type: Boolean, default: false },
    reduceMotion: { type: Boolean, default: false },
    screenReaderLabels: { type: Boolean, default: true }
  },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  internalNotes: [{
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, default: 'Support Agent' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.password;
      delete ret.otp;
      delete ret.otpExpires;
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model('User', UserSchema);
