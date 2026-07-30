const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  businessName: { type: String, required: true },
  category: { type: String, default: '' },
  description: { type: String, default: '' },
  logo: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  address: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  placeName: { type: String, default: '' },
  openingHours: { type: String, default: '09:00' },
  closingHours: { type: String, default: '18:00' },
  workingDays: [{ type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] }],
  timeZone: { type: String, default: 'UTC' },
  verified: { type: Boolean, default: false },
  availabilityStatus: { type: String, enum: ['open','closed','busy','on_break','holiday'], default: 'open' },
  autoReplyEnabled: { type: Boolean, default: false },
  autoReplyMessage: { type: String, default: '' },
  products: [{
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    image: { type: String, default: '' },
    category: { type: String, default: '' },
    sku: { type: String, default: '' },
    stock: { type: Number, default: 0 },
    status: { type: String, enum: ['draft','published','archived'], default: 'draft' },
    images: [{ type: String }],
    tags: [{ type: String }],
    multipartText: [{ title: { type: String }, content: { type: String } }],
    variants: [{
      name: { type: String },
      value: { type: String },
      price: { type: Number },
      stock: { type: Number }
    }],
    qrCode: { type: String, default: '' },
    viewCount: { type: Number, default: 0 },
    purchaseCount: { type: Number, default: 0 }
  }],
  services: [{
    name: { type: String, required: true },
    description: { type: String, default: '' },
    duration: { type: Number, default: 60 },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  }],
  appointments: [{
    customerName: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerEmail: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    service: { type: String, default: '' },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['pending','confirmed','declined','rescheduled','completed','cancelled'], default: 'pending' },
    notes: { type: String, default: '' },
    rescheduledDate: { type: Date },
    rescheduledTime: { type: String }
  }],
  reviews: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],
  averageRating: { type: Number, default: 0 },
  productViews: { type: Number, default: 0 },
  salesInquiries: [{
    customerName: { type: String },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerEmail: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    productId: { type: mongoose.Schema.Types.ObjectId },
    productName: { type: String },
    message: { type: String, default: '' },
    status: { type: String, enum: ['new','contacted','closed'], default: 'new' },
    createdAt: { type: Date, default: Date.now }
  }],
  workshops: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    instructor: { type: String, default: '' },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    duration: { type: Number, default: 60 },
    price: { type: Number, default: 0 },
    capacity: { type: Number, default: 20 },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['upcoming','ongoing','completed','cancelled'], default: 'upcoming' },
    imageUrl: { type: String, default: '' },
    inviteToken: { type: String, default: '' },
    inviteLink: { type: String, default: '' },
    multipartText: [{ title: { type: String }, content: { type: String } }],
    tags: [{ type: String }]
  }],
  events: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String, default: 'Online' },
    price: { type: Number, default: 0 },
    capacity: { type: Number, default: 100 },
    rsvps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    imageUrl: { type: String, default: '' },
    multipartText: [{ title: { type: String }, content: { type: String } }],
    tags: [{ type: String }]
  }]
}, { timestamps: true });

BusinessSchema.index({ businessName: 'text', category: 'text', description: 'text' });
BusinessSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Business', BusinessSchema);
