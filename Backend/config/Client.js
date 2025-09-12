// config/Client.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const AddressSchema = new Schema({
  line1:        String,
  line2:        String,
  city:         String,
  state:        String,
  postalCode:   String,
  country:      { type: String, enum: ['Australia','United States','Norway'], required: true }, // Full country name
  region:       { type: String, enum: ['AU','US','NO'], required: true }, // Country code
  streetNumber: String,     // Street/Unit number
  full_address: String,     // Full formatted address from Mapbox
}, { _id: false });

const ContactSchema = new Schema({
  name:         String,
  email:        String,
  phone:        String,
  accountsEmail: String,    // NEW: Separate accounting email
}, { _id: false });

const PaymentMethodSchema = new Schema({
  type:    { type: String, enum: ['card','bank_transfer','paypal'] },
  details: Schema.Types.Mixed, // token or masked info
}, { _id: false });

const SubscriptionSchema = new Schema({
  plan:         { type: String, enum: ['free','basic','pro','enterprise'], default: 'free' },
  subscriptionStart: Date,
  renewalDate:  Date,
  status:       { type: String, enum: ['active','past_due','canceled'], default: 'active' },
  paymentMethod: PaymentMethodSchema,
}, { _id: false });

const ClientSchema = new Schema({
  // 1) Identity
  name:               { type: String, required: true },
  legalName:          String,
  registrationNumber: String,

  // 1b) Which users belong to this client
   linkedUsers: [
    { type: Schema.Types.ObjectId, ref: "User" }
  ],

  // 2) Tax IDs & Registration Numbers
  // Australia fields
  abn:                String, // AU Business Number
  acn:                String, // AU Company Number
  gstRegistered:      String, // NEW: 'yes'/'no'
  taxInvoiceRequired: String, // NEW: 'yes'/'no'
  abrData:            Schema.Types.Mixed, // NEW: Complete ABR API response data
  
  // US fields
  ein:                String, // US Employer ID
  stateTaxId:         String, // US state sales/resale
  ssnItin:            String, // NEW: SSN or ITIN for sole proprietors
  w9OnFile:           String, // NEW: 'yes'/'no'
  
  // Norway fields
  organizationNumber: String, // NO org.nr
  vatNumber:          String, // NO/EU VAT
  vatRegistered:      String, // NEW: 'yes'/'no'

  // 3) Addresses
  billingAddress:     AddressSchema,
  physicalAddress:    AddressSchema,

  // 4) Contacts
  mainContact:        ContactSchema,   // e.g. Accounts Payable
  accountManager:     ContactSchema,   // your internal rep
  sameAsMainContact:  { type: Boolean, default: false }, // NEW: Use main contact email for accounting

  // 5) Website & industry
  website:            String,
  industry:           String,

  // 6) Subscription & billing
  subscription:       SubscriptionSchema,

  // 7) Seats
  seatLimit:          { type: Number, default: 1 },
  seatsPurchased:     { type: Number, default: 0 },
  seatOveragePrice:   Number,          // per-seat fee beyond limit
  
  // ── Linking codes ────────────────────────────────────────────────
 userLinkingCode:  { type: String, default: null },
  adminLinkingCode: { type: String, default: null },

  // 8) Misc & audit
  numberOfEmployees:  Number,
  notes:              String,

  // 9) Company Images & Branding
  logoUrl:            String,         // Company logo URL
  headerImageUrl:     String,         // Header image URL  
  footerImageUrl:     String,         // Footer banner URL
  headerRatio:        { type: String, enum: ['2:1', '3:1'], default: '2:1' }, // Header aspect ratio
  headerFit:          { type: Boolean, default: false }, // Header image fit style (true = contain, false = cover)
  footerPlacement:    { type: String, enum: ['full', 'left', 'center', 'right'], default: 'full' }, // Footer placement

}, {
  timestamps: true, // adds createdAt & updatedAt
});



module.exports = mongoose.model('Client', ClientSchema);