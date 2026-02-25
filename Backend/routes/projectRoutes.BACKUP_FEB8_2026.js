// BACKUP OF PRICING SNAPSHOT LOGIC - February 8, 2026
// This version calculates and stores actual priceEach and totalPrice values

/*
    // 📸 CAPTURE PRICING SNAPSHOT - Only if not already captured
    if (!project.pricingSnapshot || !project.pricingSnapshot.capturedAt) {
      // Import pricing utilities to calculate current price
      const { calculateAUD } = require('../utils/jobPricingUtils');
      const { planTypes } = require('../utils/planPricing');
      
      // Calculate actual price at time of sending
      const priceEach = calculateAUD(project, planTypes, clientData);
      const qty = parseFloat(project.Qty || 0);
      const totalPrice = priceEach && qty ? priceEach * qty : 0;
      
      const pricingSnapshot = {
        capturedAt: new Date(),
        clientPricingTier: clientData?.loyaltyTier || clientData?.pricingTier || 'Casual',
        clientUseNewPricing: clientData?.useNewPricing || false,
        priceEach: priceEach,  // Store actual locked price
        totalPrice: totalPrice, // Store actual locked total
        // Keep multiplier for reference
        priceMultiplier: (() => {
          const tier = clientData?.loyaltyTier || clientData?.pricingTier || 'Casual';
          const useNew = clientData?.useNewPricing || false;
          
          if (tier === 'Elite') return useNew ? 0.7 : 0.6; // New: 30% off, Legacy: 40% off
          if (tier === 'Pro') return 0.8; // 20% off (same for both)
          return 1.0; // Casual - full price
        })(),
        exchangeRate: null, // Will be set if NOK pricing is used
      };

      // Update project with pricing snapshot
      await collection.updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { pricingSnapshot } }
      );

      console.log(`📸 Pricing snapshot captured for project ${projectId}:`, {
        tier: pricingSnapshot.clientPricingTier,
        useNewPricing: pricingSnapshot.clientUseNewPricing,
        multiplier: pricingSnapshot.priceMultiplier
      });
    } else {
      console.log(`ℹ️ Pricing snapshot already exists for project ${projectId} (captured ${project.pricingSnapshot.capturedAt})`);
    }
*/
