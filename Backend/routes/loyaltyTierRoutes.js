// routes/loyaltyTierRoutes.js
/**
 * LOYALTY TIER SYSTEM - API ROUTES
 * 
 * Endpoints for managing client loyalty tiers, protection, and cashback
 */

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const Client = require('../config/Client');
const { projectsCollection } = require('../db');
const loyaltyTierService = require('../services/loyaltyTierService');

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT TIER INFORMATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/loyalty/client/:id
 * Get complete loyalty tier information for a client
 */
router.get('/client/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findById(id).select(
      'name loyaltyTier tierEffectiveDate previousTier ' +
      'tierProtectionType tierProtectionQty tierProtectionPoints ' +
      'cashbackCredits currentMonthEstimateUnits totalUnitsBilledAllTime ' +
      'hasMetMinimumBillingRequirement loyaltySystemEnrolledDate ' +
      'monthlyUsageHistory protectionPointsHistory linkedProjects ' +
      'lastMonthProjectCount lastMonthEstimateUnits lastMonthCalculatedDate'
    );
    
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }
    
    // Auto-enroll client if not enrolled yet (all clients should have loyalty tiers)
    if (!client.loyaltySystemEnrolledDate) {
      client.loyaltySystemEnrolledDate = new Date();
      // Ensure they have a tier set
      if (!client.loyaltyTier) {
        client.loyaltyTier = 'Casual';
      }
      await client.save();
      console.log(`📝 Auto-enrolled client ${client.name} in loyalty system with tier: ${client.loyaltyTier}`);
    }
    
    // Get tier configuration
    const tierConfig = loyaltyTierService.getTierConfig(client.loyaltyTier);
    
    console.log(`📊 GET /loyalty/client/${id}`);
    console.log(`   currentMonthEstimateUnits from DB: ${client.currentMonthEstimateUnits}`);
    console.log(`   loyaltyTier: ${client.loyaltyTier}`);
    console.log(`   tierProtectionType: ${client.tierProtectionType}`);
    console.log(`   tierProtectionQty: ${client.tierProtectionQty}`);
    console.log(`   tierProtectionPoints: ${client.tierProtectionPoints}`);
    
    // Calculate actual previous month and current month project counts
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Check if we have cached last month data (updated within last 24 hours)
    const cacheValid = client.lastMonthCalculatedDate && 
      (now - client.lastMonthCalculatedDate) < (24 * 60 * 60 * 1000);
    
    let lastMonthProjects;
    
    if (cacheValid && client.lastMonthProjectCount !== undefined) {
      // Use cached value
      lastMonthProjects = client.lastMonthProjectCount;
      console.log(`   📦 Using cached last month count: ${lastMonthProjects}`);
    } else {
      // Calculate from DB
      // Note: posting_date is stored as string in format "YYYY-MM-DD"
      // linkedClients is array of string IDs
      const clientIdString = client._id.toString();
      const startDate = `${previousMonth}-01`;
      const endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const endDate = `${endMonth}-01`;
      
      const projectColl = await projectsCollection();
      lastMonthProjects = await projectColl.countDocuments({
        linkedClients: clientIdString,
        posting_date: {
          $gte: startDate,
          $lt: endDate
        }
      });
      
      // Update cache
      await Client.findByIdAndUpdate(id, {
        lastMonthProjectCount: lastMonthProjects,
        lastMonthCalculatedDate: new Date()
      });
      
      console.log(`   🔄 Calculated and cached last month count: ${lastMonthProjects}`);
    }
    
    // Get last month's tier from history
    const lastMonthHistory = client.monthlyUsageHistory?.find(h => h.month === previousMonth);
    
    // Normalize current tier (in case DB has old lowercase values)
    const tierMapping = {
      'standard': 'Casual',
      'casual': 'Casual',
      'pro': 'Pro',
      'elite': 'Elite'
    };
    const currentTier = client.loyaltyTier || 'Casual';
    const normalizedCurrentTier = tierMapping[currentTier.toLowerCase()] || 'Casual';
    
    // Calculate points needed for next protection
    const pointsNeeded = tierConfig.protectionPointsRequired 
      ? tierConfig.protectionPointsRequired - (client.tierProtectionPoints || 0)
      : null;
    
    res.json({
      success: true,
      data: {
        clientId: client._id,
        clientName: client.name,
        
        // Current tier
        loyaltyTier: normalizedCurrentTier,
        tierEffectiveDate: client.tierEffectiveDate,
        previousTier: client.previousTier,
        pricePerUnit: tierConfig.pricePerUnit,
        discount: tierConfig.discount,
        
        // Protection status
        protection: {
          type: client.tierProtectionType,
          monthsHeld: client.tierProtectionQty || 0,
          currentPoints: client.tierProtectionPoints || 0,
          pointsNeededForNext: pointsNeeded,
          maxMonths: loyaltyTierService.LOYALTY_TIER_CONFIG.MAX_PROTECTION_MONTHS
        },
        
        // Cashback
        cashbackBalance: client.cashbackCredits || 0,
        
        // Current month
        currentMonthUnits: client.currentMonthEstimateUnits || 0,
        
        // Previous month (calculated from actual projects)
        lastMonth: {
          month: previousMonth,
          projectCount: lastMonthProjects,
          estimateUnits: lastMonthHistory?.estimateUnits || 0,
          tier: lastMonthHistory?.tier || 'standard'
        },
        
        // Lifetime stats
        totalUnitsBilled: client.totalUnitsBilledAllTime || 0,
        hasMetMinimumRequirement: client.hasMetMinimumBillingRequirement || false,
        
        // System enrollment
        enrolledDate: client.loyaltySystemEnrolledDate,
        
        // History
        monthlyHistory: client.monthlyUsageHistory || [],
        protectionHistory: client.protectionPointsHistory || []
      }
    });
    
  } catch (error) {
    console.error('Error fetching loyalty tier info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch loyalty tier information',
      error: error.message 
    });
  }
});

/**
 * POST /api/loyalty/client/:id/enroll
 * Enroll a client in the loyalty tier system
 */
router.post('/client/:id/enroll', async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findById(id);
    
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }
    
    // Check if already enrolled
    if (client.loyaltySystemEnrolledDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Client is already enrolled in loyalty tier system' 
      });
    }
    
    // Initialize loyalty tier fields
    await Client.findByIdAndUpdate(id, {
      // Tier status
      loyaltyTier: 'standard',
      tierEffectiveDate: new Date(),
      previousTier: null,
      
      // Protection
      tierProtectionType: 'none',
      tierProtectionQty: 0,
      tierProtectionPoints: 0,
      protectionPointsHistory: [],
      
      // Cashback
      cashbackCredits: 0,
      cashbackHistory: [],
      
      // Tokens
      estimateTokens: 0,
      
      // Monthly tracking
      currentMonthEstimateUnits: 0,
      monthlyCounterResetDate: new Date(),
      monthlyUsageHistory: [],
      
      // Enrollment
      loyaltySystemEnrolledDate: new Date(),
      isLoyaltyEliteRollout: false,
      
      // Billing
      totalUnitsBilledAllTime: 0,
      hasMetMinimumBillingRequirement: false
    });
    
    res.json({
      success: true,
      message: `${client.name} enrolled in loyalty tier system`,
      data: {
        clientId: id,
        tier: 'standard',
        enrolledDate: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error enrolling client:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to enroll client in loyalty system',
      error: error.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/loyalty/client/:id/sync-from-projects
 * Sync estimate units from client's projects for current month
 * Query params: month (optional) - "2025-10" format (same as MonthFilterTabs)
 */
router.post('/client/:id/sync-from-projects', async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query; // Optional month filter in "YYYY-MM" format
    const { projectsCollection } = require('../db');
    const { ObjectId } = require('mongodb');
    
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }
    
    // Use month filter pattern from projectRoutes (same as MonthFilterTabs)
    let startDateStr, endDateStr, monthLabel;
    if (month) {
      // Month filter provided: "2025-10" -> projects posted in October 2025
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59);
      startDateStr = startDate.toISOString().split('T')[0];
      endDateStr = endDate.toISOString().split('T')[0];
      monthLabel = month;
    } else {
      // Default to CURRENT MONTH (accumulating units for next tier evaluation)
      const now = new Date();
      // Format: YY-MM (e.g., "26-01" for January 2026)
      const year = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      monthLabel = `${year}-${month}`;
      startDateStr = null; // We'll use projectNumber instead
      endDateStr = null;
    }
    
    console.log(`\n📊 Syncing units for client ${id} (${client.name})`);
    console.log(`   Month filter: ${monthLabel}`);
    console.log(`   Using projectNumber prefix filter: ^${monthLabel}`);
    console.log(`   Client ID type: ${typeof id}, value: "${id}"`);
    console.log(`   Current date: ${new Date().toISOString()}`);
    
    // Get projects collection
    const projectsCol = await projectsCollection();
    
    // First, check what projects exist for this client (any date)
    const allProjects = await projectsCol.find({ linkedClients: id }).toArray();
    console.log(`   Total projects with this client (any date): ${allProjects.length}`);
    if (allProjects.length > 0) {
      console.log(`   Sample project numbers:`)
      allProjects.slice(0, 5).forEach(p => {
        console.log(`     - ${p.projectNumber}: Qty=${p.Qty}`);
      });
    }
    
    // Query using projectNumber prefix (e.g., "25-12" for Dec 2025)
    // Format: YY-MMXXX (e.g., 25-12034)
    const projectNumberRegex = new RegExp(`^${monthLabel}\\d`, 'i');
    const projects = await projectsCol.find({
      linkedClients: id,
      projectNumber: projectNumberRegex
    }).toArray();
    
    console.log(`   Found ${projects.length} projects in date range`);
    
    if (projects.length > 0) {
      console.log(`   Projects in range:`);
      projects.forEach(p => {
        console.log(`     - ${p.projectNumber} (${p.name}): posting_date=${p.posting_date}, Qty=${p.Qty}`);
      });
    }
    
    // Calculate total units from projects
    // Based on JobBoardConfig.jsx, the field is 'Qty' (capital Q)
    let totalUnits = 0;
    projects.forEach(project => {
      // The Qty field from JobBoard
      const qty = parseFloat(project.Qty || 0);
      console.log(`   - Project ${project.name || project.projectNumber}: ${qty} units (from Qty field)`);
      totalUnits += qty;
    });
    
    console.log(`   Total units calculated: ${totalUnits}`);
    
    // Update client's current month units
    console.log(`   Updating currentMonthEstimateUnits to ${totalUnits}...`);
    const updateResult = await Client.findByIdAndUpdate(id, {
      currentMonthEstimateUnits: totalUnits
    }, { new: true });
    
    console.log(`   ✅ Database updated. New value: ${updateResult.currentMonthEstimateUnits}`);
    
    // Only evaluate tier if evaluateTier parameter is true (manual button click)
    const shouldEvaluate = req.body.evaluateTier || req.query.evaluateTier;
    if (shouldEvaluate) {
      console.log(`   🔍 Evaluating tier...`);
      await loyaltyTierService.evaluateMonthlyTier(id);
    } else {
      console.log(`   ⏭️ Skipping tier evaluation (auto-sync)`);
    }
    
    const updatedClient = await Client.findById(id).select('name currentMonthEstimateUnits loyaltyTier');
    
    console.log(`   Final tier: ${updatedClient.loyaltyTier}`);
    console.log(`   Final units: ${updatedClient.currentMonthEstimateUnits}\n`);
    
    res.json({
      success: true,
      message: shouldEvaluate 
        ? `Synced ${totalUnits} units and evaluated tier`
        : `Synced ${totalUnits} units from ${projects.length} projects`,
      data: {
        clientId: id,
        projectsFound: projects.length,
        totalUnits: totalUnits,
        currentMonthUnits: updatedClient.currentMonthEstimateUnits,
        tier: updatedClient.loyaltyTier,
        monthFilter: monthLabel
      }
    });
    
  } catch (error) {
    console.error('Error syncing units from projects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to sync units from projects',
      error: error.message 
    });
  }
});

/**
 * POST /api/loyalty/client/:id/add-units
 * Add estimate units to a client's current month counter
 * Body: { units: number }
 */
router.post('/client/:id/add-units', async (req, res) => {
  try {
    const { id } = req.params;
    const { units = 1 } = req.body;
    
    if (typeof units !== 'number' || units <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Units must be a positive number' 
      });
    }
    
    await loyaltyTierService.addEstimateUnits(id, units);
    
    // Get updated client info
    const client = await Client.findById(id).select('name currentMonthEstimateUnits');
    
    res.json({
      success: true,
      message: `Added ${units} unit(s) to ${client.name}`,
      data: {
        clientId: id,
        currentMonthUnits: client.currentMonthEstimateUnits
      }
    });
    
  } catch (error) {
    console.error('Error adding estimate units:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add estimate units',
      error: error.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIER EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/loyalty/client/:id/evaluate
 * Manually trigger tier evaluation for a specific client
 */
router.post('/client/:id/evaluate', async (req, res) => {
  try {
    const { id } = req.params;
    
    await loyaltyTierService.evaluateMonthlyTier(id);
    
    // Get updated client info
    const client = await Client.findById(id).select(
      'name loyaltyTier tierProtectionQty tierProtectionPoints cashbackCredits'
    );
    
    res.json({
      success: true,
      message: `Tier evaluation complete for ${client.name}`,
      data: {
        clientId: id,
        tier: client.loyaltyTier,
        protectionMonths: client.tierProtectionQty,
        protectionPoints: client.tierProtectionPoints,
        cashbackBalance: client.cashbackCredits
      }
    });
    
  } catch (error) {
    console.error('Error evaluating tier:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to evaluate tier',
      error: error.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/loyalty/evaluate-all
 * Manually trigger monthly evaluation for all clients
 * (Admin only - normally runs via cron)
 */
router.post('/evaluate-all', async (req, res) => {
  try {
    await loyaltyTierService.runMonthlyEvaluationForAllClients();
    
    res.json({
      success: true,
      message: 'Monthly evaluation completed for all clients'
    });
    
  } catch (error) {
    console.error('Error running monthly evaluation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to run monthly evaluation',
      error: error.message 
    });
  }
});

/**
 * POST /api/loyalty/reset-counters
 * Manually reset monthly counters for all clients
 * (Admin only - normally runs via cron)
 */
router.post('/reset-counters', async (req, res) => {
  try {
    await loyaltyTierService.resetMonthlyCounters();
    
    res.json({
      success: true,
      message: 'Monthly counters reset for all clients'
    });
    
  } catch (error) {
    console.error('Error resetting counters:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset counters',
      error: error.message 
    });
  }
});

/**
 * POST /api/loyalty/rollout
 * Initialize loyalty system rollout (run once on Feb 2, 2026)
 * Sets all clients to Elite tier
 */
router.post('/rollout', async (req, res) => {
  try {
    await loyaltyTierService.initializeLoyaltyRollout();
    
    res.json({
      success: true,
      message: 'Loyalty system rollout completed - all clients set to Elite tier'
    });
    
  } catch (error) {
    console.error('Error initializing rollout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize loyalty rollout',
      error: error.message 
    });
  }
});

/**
 * GET /api/loyalty/analytics
 * Get system-wide loyalty tier analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    // Get all enrolled clients
    const clients = await Client.find({ 
      loyaltySystemEnrolledDate: { $ne: null } 
    }).select(
      'name loyaltyTier tierProtectionQty currentMonthEstimateUnits ' +
      'totalUnitsBilledAllTime cashbackCredits'
    );
    
    // Calculate statistics
    const stats = {
      totalClients: clients.length,
      tierDistribution: {
        casual: clients.filter(c => c.loyaltyTier === 'casual').length,
        pro: clients.filter(c => c.loyaltyTier === 'pro').length,
        elite: clients.filter(c => c.loyaltyTier === 'elite').length
      },
      protection: {
        clientsWithProtection: clients.filter(c => (c.tierProtectionQty || 0) > 0).length,
        totalProtectionMonths: clients.reduce((sum, c) => sum + (c.tierProtectionQty || 0), 0)
      },
      currentMonth: {
        totalUnits: clients.reduce((sum, c) => sum + (c.currentMonthEstimateUnits || 0), 0),
        averageUnitsPerClient: clients.length > 0 
          ? (clients.reduce((sum, c) => sum + (c.currentMonthEstimateUnits || 0), 0) / clients.length).toFixed(2)
          : 0
      },
      lifetime: {
        totalUnitsBilled: clients.reduce((sum, c) => sum + (c.totalUnitsBilledAllTime || 0), 0),
        totalCashbackIssued: clients.reduce((sum, c) => sum + (c.cashbackCredits || 0), 0)
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch analytics',
      error: error.message 
    });
  }
});

/**
 * GET /api/loyalty/clients-by-tier/:tier
 * Get list of clients in a specific tier
 * Params: tier = 'casual' | 'pro' | 'elite'
 */
router.get('/clients-by-tier/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    
    if (!['casual', 'pro', 'elite'].includes(tier)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid tier. Must be: casual, pro, or elite' 
      });
    }
    
    const clients = await Client.find({ 
      loyaltyTier: tier,
      loyaltySystemEnrolledDate: { $ne: null }
    }).select(
      'name loyaltyTier tierEffectiveDate tierProtectionQty tierProtectionPoints ' +
      'currentMonthEstimateUnits totalUnitsBilledAllTime'
    ).sort({ name: 1 });
    
    res.json({
      success: true,
      tier,
      count: clients.length,
      data: clients
    });
    
  } catch (error) {
    console.error('Error fetching clients by tier:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch clients',
      error: error.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CASHBACK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/loyalty/client/:id/cashback
 * Get cashback balance and history for a client
 */
router.get('/client/:id/cashback', async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findById(id).select(
      'name cashbackCredits cashbackHistory'
    );
    
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        clientId: id,
        clientName: client.name,
        balance: client.cashbackCredits || 0,
        history: client.cashbackHistory || []
      }
    });
    
  } catch (error) {
    console.error('Error fetching cashback info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch cashback information',
      error: error.message 
    });
  }
});

/**
 * POST /api/loyalty/client/:id/cashback/apply
 * Apply cashback credit to reduce balance
 * Body: { amount: number, invoiceId: string }
 */
router.post('/client/:id/cashback/apply', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, invoiceId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount must be a positive number' 
      });
    }
    
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }
    
    const currentBalance = client.cashbackCredits || 0;
    
    if (amount > currentBalance) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient cashback balance. Available: $${currentBalance}` 
      });
    }
    
    // Deduct from balance
    const newBalance = currentBalance - amount;
    
    await Client.findByIdAndUpdate(id, {
      cashbackCredits: newBalance
    });
    
    res.json({
      success: true,
      message: `Applied $${amount} cashback credit`,
      data: {
        clientId: id,
        amountApplied: amount,
        previousBalance: currentBalance,
        newBalance,
        invoiceId
      }
    });
    
  } catch (error) {
    console.error('Error applying cashback:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to apply cashback',
      error: error.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESTIMATE TOKENS (Optional Feature)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/loyalty/client/:id/tokens/add
 * Add estimate tokens to a client
 * Body: { tokens: number }
 */
router.post('/client/:id/tokens/add', async (req, res) => {
  try {
    const { id } = req.params;
    const { tokens } = req.body;
    
    if (!tokens || tokens <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tokens must be a positive number' 
      });
    }
    
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }
    
    const currentTokens = client.estimateTokens || 0;
    const newTokens = currentTokens + tokens;
    
    await Client.findByIdAndUpdate(id, {
      estimateTokens: newTokens
    });
    
    res.json({
      success: true,
      message: `Added ${tokens} token(s) to ${client.name}`,
      data: {
        clientId: id,
        tokensAdded: tokens,
        previousBalance: currentTokens,
        newBalance: newTokens
      }
    });
    
  } catch (error) {
    console.error('Error adding tokens:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add tokens',
      error: error.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL TIER OVERRIDE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/loyalty/client/:id/manual-tier-update
 * Manually set a client's tier (admin override)
 */
router.post('/client/:id/manual-tier-update', async (req, res) => {
  try {
    const { id } = req.params;
    const { tier, reason } = req.body;

    if (!tier || !['casual', 'pro', 'elite'].includes(tier.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier. Must be: Casual, Pro, or Elite'
      });
    }

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const normalizedTier = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
    const oldTier = client.loyaltyTier || 'Casual';
    
    // Map old tier names to new schema
    const tierMapping = {
      'standard': 'Casual',
      'casual': 'Casual',
      'pro': 'Pro',
      'elite': 'Elite'
    };
    
    const normalizedOldTier = tierMapping[oldTier.toLowerCase()] || 'Casual';

    // Update tier (previousTier is optional, only set if different)
    if (normalizedOldTier !== normalizedTier) {
      client.previousTier = normalizedOldTier;
    }
    client.loyaltyTier = normalizedTier;
    client.tierEffectiveDate = new Date();
    
    // Add to current month's history or create new entry
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const existingMonthIndex = client.monthlyUsageHistory?.findIndex(h => h.month === currentMonth);
    
    if (existingMonthIndex !== undefined && existingMonthIndex >= 0) {
      // Update existing month
      client.monthlyUsageHistory[existingMonthIndex].tier = normalizedTier;
      client.monthlyUsageHistory[existingMonthIndex].tierChangeReason = reason || 'Manual admin override';
      client.monthlyUsageHistory[existingMonthIndex].recordedAt = new Date();
    } else {
      // Create new month entry
      const newHistory = {
        month: currentMonth,
        year: now.getFullYear(),
        monthNumber: now.getMonth() + 1,
        tier: normalizedTier,
        unitsCompleted: client.currentMonthEstimateUnits || 0,
        tierChangeReason: reason || 'Manual admin override',
        recordedAt: new Date()
      };
      
      if (!client.monthlyUsageHistory) {
        client.monthlyUsageHistory = [];
      }
      client.monthlyUsageHistory.unshift(newHistory);
    }

    await client.save();

    console.log(`✅ Manually updated tier for client ${client.name}: ${normalizedOldTier} → ${normalizedTier}`);

    res.json({
      success: true,
      message: `Tier updated from ${normalizedOldTier} to ${normalizedTier}`,
      data: {
        clientId: id,
        oldTier: normalizedOldTier,
        newTier: normalizedTier,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error manually updating tier:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tier',
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL PROTECTION ADJUSTMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/loyalty/client/:id/adjust-protection-points
 * Manually adjust protection points balance
 */
router.post('/client/:id/adjust-protection-points', async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    if (!adjustment || isNaN(adjustment)) {
      return res.status(400).json({
        success: false,
        message: 'Valid adjustment value required'
      });
    }

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const adjustmentValue = parseInt(adjustment);
    const oldBalance = client.tierProtectionPoints || 0;
    const newBalance = Math.max(0, oldBalance + adjustmentValue);

    client.tierProtectionPoints = newBalance;
    await client.save();

    console.log(`🛡️ Protection points adjusted for ${client.name}: ${oldBalance} → ${newBalance} (${adjustmentValue > 0 ? '+' : ''}${adjustmentValue})`);

    res.json({
      success: true,
      message: `Protection points ${adjustmentValue > 0 ? 'added' : 'removed'}: ${Math.abs(adjustmentValue)}`,
      data: {
        oldBalance,
        newBalance,
        adjustment: adjustmentValue,
        reason: reason || 'Manual admin adjustment'
      }
    });

  } catch (error) {
    console.error('❌ Error adjusting protection points:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust protection points',
      error: error.message
    });
  }
});

/**
 * POST /api/loyalty/client/:id/adjust-protection-months
 * Manually adjust protection months held
 */
router.post('/client/:id/adjust-protection-months', async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    if (!adjustment || isNaN(adjustment)) {
      return res.status(400).json({
        success: false,
        message: 'Valid adjustment value required'
      });
    }

    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const adjustmentValue = parseInt(adjustment);
    const oldMonths = client.tierProtectionQty || 0;
    const newMonths = Math.max(0, Math.min(3, oldMonths + adjustmentValue)); // Cap at 3 months

    client.tierProtectionQty = newMonths;
    
    // Update protection type based on months
    if (newMonths === 0) {
      client.tierProtectionType = 'none';
    } else if (newMonths === 1) {
      client.tierProtectionType = 'month';
    } else {
      client.tierProtectionType = 'months';
    }
    
    await client.save();

    console.log(`🛡️ Protection months adjusted for ${client.name}: ${oldMonths} → ${newMonths} (${adjustmentValue > 0 ? '+' : ''}${adjustmentValue})`);

    res.json({
      success: true,
      message: `Protection months ${adjustmentValue > 0 ? 'added' : 'removed'}: ${Math.abs(adjustmentValue)}`,
      data: {
        oldMonths,
        newMonths,
        adjustment: adjustmentValue,
        protectionType: client.tierProtectionType,
        reason: reason || 'Manual admin adjustment'
      }
    });

  } catch (error) {
    console.error('❌ Error adjusting protection months:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust protection months',
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORICAL BACKFILL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/loyalty/client/:id/backfill-history
 * Backfills monthlyUsageHistory for all historical months from July 2024 onwards
 * Calculates what tier would have been based on project units for each month
 */
router.post('/client/:id/backfill-history', async (req, res) => {
  try {
    const { id } = req.params;
    const { startMonth = '2024-07' } = req.body; // Default to July 2024
    
    console.log(`📊 Starting historical backfill for client ${id} from ${startMonth}`);
    
    const client = await Client.findById(id).select('name linkedProjects');
    console.log(`   Client found:`, client ? client.name : 'NOT FOUND');
    
    if (!client) {
      console.log('❌ Client not found');
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    console.log(`   LinkedProjects array:`, client.linkedProjects);
    console.log(`   LinkedProjects count: ${client.linkedProjects?.length || 0}`);
    
    if (!client.linkedProjects || client.linkedProjects.length === 0) {
      console.log('❌ No linked projects');
      return res.status(400).json({ 
        success: false, 
        message: 'Client has no linked projects to analyze' 
      });
    }
    
    // Get all projects for this client
    console.log('   Fetching projects collection...');
    const projectsCol = await projectsCollection();
    const projectIds = client.linkedProjects.map(pid => new ObjectId(pid));
    
    console.log(`   Querying ${projectIds.length} project IDs...`);
    const projects = await projectsCol.find({
      _id: { $in: projectIds },
      projectNumber: { $exists: true, $ne: null }
    }).toArray();
    
    console.log(`   Found ${projects.length} projects with projectNumber`);
    
    // Parse start month
    const [startYear, startMonthNum] = startMonth.split('-').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Generate list of months to process (from startMonth to last month)
    const monthsToProcess = [];
    let year = startYear;
    let month = startMonthNum;
    
    while (year < currentYear || (year === currentYear && month < currentMonth)) {
      const monthLabel = `${String(year).slice(-2)}-${String(month).padStart(2, '0')}`;
      const monthString = `${year}-${String(month).padStart(2, '0')}`;
      monthsToProcess.push({ year, month, monthLabel, monthString });
      
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    
    console.log(`   Processing ${monthsToProcess.length} months:`, monthsToProcess.map(m => m.monthString));
    
    // Clear existing history to avoid duplicates
    await Client.findByIdAndUpdate(id, {
      monthlyUsageHistory: [],
      protectionPointsHistory: []
    });
    
    const historyEntries = [];
    const protectionEntries = [];
    
    // Process each month
    for (const { year, month, monthLabel, monthString } of monthsToProcess) {
      // Find projects for this month using projectNumber prefix (e.g., "24-07")
      const monthProjects = projects.filter(p => {
        if (!p.projectNumber) return false;
        const regex = new RegExp(`^${monthLabel}`, 'i');
        return regex.test(p.projectNumber);
      });
      
      // Calculate total estimate units for this month
      let totalUnits = 0;
      for (const project of monthProjects) {
        const qty = parseFloat(project.Qty || 0);
        const planType = project.PlanType || '';
        
        // Apply same EstQty logic as current system
        let units = qty;
        if (planType.toLowerCase() === 'basic') {
          units = qty / 2;
        }
        
        totalUnits += units;
      }
      
      // Determine tier based on units
      let tier = 'casual';
      let pricePerUnit = 100;
      if (totalUnits >= 11) {
        tier = 'elite';
        pricePerUnit = 70;
      } else if (totalUnits >= 6) {
        tier = 'pro';
        pricePerUnit = 80;
      }
      
      // Calculate protection points (only for pro/elite)
      let protectionPoints = 0;
      let tierMinUnits = 0;
      if (tier === 'pro') {
        tierMinUnits = 6;
        protectionPoints = Math.max(0, totalUnits - tierMinUnits);
      } else if (tier === 'elite') {
        tierMinUnits = 11;
        protectionPoints = Math.max(0, totalUnits - tierMinUnits);
      }
      
      // Create history entry
      historyEntries.push({
        month: monthString,
        year,
        monthNumber: month,
        estimateUnits: totalUnits,
        tier,
        pricePerUnit,
        totalBilled: totalUnits * pricePerUnit,
        protectionEarned: 0, // Historical - no protection awarded retroactively
        protectionUsed: 0,
        projectCount: monthProjects.length
      });
      
      // Create protection history entry
      protectionEntries.push({
        month: monthString,
        tier,
        unitsSubmitted: totalUnits,
        tierMinimum: tierMinUnits,
        pointsEarned: protectionPoints,
        pointsBalance: 0, // Historical - no carryover
        protectionAwarded: 0,
        protectionUsed: 0
      });
      
      console.log(`   ${monthString}: ${totalUnits.toFixed(1)} units, tier: ${tier}, ${monthProjects.length} projects`);
    }
    
    // Save all history entries
    await Client.findByIdAndUpdate(id, {
      $push: {
        monthlyUsageHistory: { $each: historyEntries },
        protectionPointsHistory: { $each: protectionEntries }
      }
    });
    
    // Calculate total historical units
    const totalHistoricalUnits = historyEntries.reduce((sum, entry) => sum + entry.estimateUnits, 0);
    
    console.log(`✅ Backfill complete: ${historyEntries.length} months processed, ${totalHistoricalUnits.toFixed(1)} total units`);
    
    res.json({
      success: true,
      message: `Historical data backfilled for ${historyEntries.length} months`,
      data: {
        monthsProcessed: historyEntries.length,
        totalHistoricalUnits: totalHistoricalUnits,
        startMonth,
        endMonth: monthsToProcess[monthsToProcess.length - 1]?.monthString,
        history: historyEntries
      }
    });
    
  } catch (error) {
    console.error('❌ Error backfilling history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to backfill historical data',
      error: error.message
    });
  }
});

/**
 * GET /api/loyalty/client/:id/project-counts-by-month
 * Get project counts grouped by month for debugging/verification
 */
router.get('/client/:id/project-counts-by-month', async (req, res) => {
  try {
    const { id } = req.params;
    const { months = 6 } = req.query; // Default to last 6 months
    
    const client = await Client.findById(id).select('_id name');
    
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }
    
    // Aggregate projects by month
    const projectsByMonth = await projectsCollection().aggregate([
      {
        $match: {
          linkedClients: new ObjectId(id)
        }
      },
      {
        $addFields: {
          monthYear: { 
            $dateToString: { format: '%Y-%m', date: '$posting_date' } 
          }
        }
      },
      {
        $group: {
          _id: '$monthYear',
          projectCount: { $sum: 1 },
          totalUnits: { $sum: { $ifNull: ['$estimateUnits', 0] } }
        }
      },
      {
        $sort: { _id: -1 }
      },
      {
        $limit: parseInt(months)
      }
    ]).toArray();
    
    res.json({
      success: true,
      data: {
        clientId: client._id,
        clientName: client.name,
        monthlyBreakdown: projectsByMonth.map(m => ({
          month: m._id,
          projectCount: m.projectCount,
          estimateUnits: m.totalUnits
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching project counts by month:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch project counts',
      error: error.message 
    });
  }
});

module.exports = router;
