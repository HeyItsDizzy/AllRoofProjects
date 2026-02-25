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

  // 1a) Search tags for easy client finding (e.g., "hjs", "mag" for shorthand names)
  tags:               [{ type: String, trim: true }],

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

  // 10) Pricing & Account Status
  accountStatus:      { type: String, enum: ['Active', 'Hold'], default: 'Active' }, // Account status (Hold = overdue invoices, prevents estimate sending)
  useNewPricing:      { type: Boolean, default: false }, // Feature flag: true = new pricing (Elite 30% off), false = legacy pricing (Elite 40% off)

  // ═══════════════════════════════════════════════════════════════════════════════
  // 11) LOYALTY TIER SYSTEM (Point-Based Protection)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Current Tier Status
  loyaltyTier: {
    type: String,
    enum: ['Casual', 'Pro', 'Elite'],
    default: 'Casual'
  },
  
  // Tier effective date (when current tier started)
  tierEffectiveDate: {
    type: Date,
    default: null
  },
  
  // Previous tier (for tracking downgrades/upgrades)
  previousTier: {
    type: String,
    enum: ['Casual', 'Pro', 'Elite', null],
    default: null
  },
  
  // ─── Loyalty Protection (Point-Based System) ───────────────────────────────────
  
  // Type of protection currently held (matches tier when earned)
  tierProtectionType: {
    type: String,
    enum: ['none', 'Pro', 'Elite'],
    default: 'none'
  },
  
  // Number of protection months accumulated (0-3 max per tier)
  tierProtectionQty: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  
  // Current protection points accumulated toward next protection month
  // Pro: 5 points = 1 protection month | Elite: 10 points = 1 protection month
  tierProtectionPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Track protection point history for analytics
  protectionPointsHistory: [{
    month: String,              // Format: "2026-02"
    tier: String,               // Tier during this month
    unitsSubmitted: Number,     // Units submitted this month
    tierMinimum: Number,        // Tier minimum requirement
    pointsEarned: Number,       // units - minimum
    pointsBalance: Number,      // Running total before award
    protectionAwarded: Boolean, // Did they earn a protection month?
    protectionUsed: Boolean     // Did they consume a protection month?
  }],
  
  // ─── Cashback Tracking ─────────────────────────────────────────────────────────
  
  // Dollar amount of available cashback credits
  cashbackCredits: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Track which tier transitions have already awarded cashback
  // Prevents duplicate cashback for same tier return
  cashbackHistory: [{
    fromTier: String,
    toTier: String,
    awardedDate: Date,
    amount: Number
  }],
  
  // ─── Estimate Tokens (Optional Feature) ────────────────────────────────────────
  
  estimateTokens: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // ─── Monthly Usage Tracking ────────────────────────────────────────────────────
  
  // Current month's estimate unit count
  currentMonthEstimateUnits: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Previous month's project count and units (for performance/caching)
  lastMonthProjectCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lastMonthEstimateUnits: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lastMonthCalculatedDate: {
    type: Date,
    default: null
  },
  
  // Track when monthly counter was last reset
  monthlyCounterResetDate: {
    type: Date,
    default: null
  },
  
  // Historical monthly usage (for analytics & reporting)
  monthlyUsageHistory: [{
    month: String,              // Format: "2026-02" (YYYY-MM)
    year: Number,               // 2026
    monthNumber: Number,        // 1-12
    estimateUnits: Number,      // Units submitted this month
    tier: String,               // Tier during this month
    pricePerUnit: Number,       // Price per unit during this month
    totalBilled: Number,        // Total amount billed this month
    protectionEarned: Boolean,  // Did they earn protection this month?
    protectionUsed: Boolean     // Did they use protection this month?
  }],
  
  // ─── Rollout Tracking ──────────────────────────────────────────────────────────
  
  loyaltySystemEnrolledDate: {
    type: Date,
    default: null // Set to Feb 2, 2026 on rollout
  },
  
  isLoyaltyEliteRollout: {
    type: Boolean,
    default: false // True if they got Elite on initial rollout
  },
  
  // ─── Minimum Billing Requirements ──────────────────────────────────────────────
  
  // Total units billed across all time (cumulative)
  totalUnitsBilledAllTime: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // True once they've been billed for 5+ units (unlocks Pro benefits)
  hasMetMinimumBillingRequirement: {
    type: Boolean,
    default: false
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 12) QUICKBOOKS INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  quickbooks: {
    connected: {
      type: Boolean,
      default: false
    },
    realmId: String,                    // QuickBooks company ID
    accessToken: String,                // OAuth access token (encrypted in production)
    refreshToken: String,               // OAuth refresh token (encrypted in production)
    tokenExpiry: Date,                  // When access token expires
    lastTokenRefresh: Date,             // Last time token was refreshed
    connectedAt: Date,                  // When integration was first connected
    customerId: String,                 // QuickBooks Customer ID for this client
    autoInvoice: {
      type: Boolean,
      default: false                    // Auto-create invoices when estimates complete
    },
    invoicePrefix: String,              // Custom prefix for invoice numbers (optional)
    defaultServiceItem: String,         // Default QuickBooks service item ID
    lastSyncedAt: Date,                 // Last successful sync timestamp
    syncErrors: [{
      timestamp: Date,
      error: String,
      projectId: String
    }]
  }

}, {
  timestamps: true, // adds createdAt & updatedAt
});



module.exports = mongoose.model('Client', ClientSchema);