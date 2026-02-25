// AdminAnalyticsPanel.jsx - Bottom panel showing filtered stats for Admin only
import React, { useMemo, useState } from 'react';
import { calculateAUD, calculatePay, calculateNOK } from '@/shared/jobPricingUtils';
import { planTypes } from '@/shared/planPricing';

/**
 * Admin Analytics Panel - Shows aggregated stats based on current filtered view
 * Only visible to Admin users at bottom of Job Board
 * 
 * @param {Array} filteredJobs - Currently filtered/visible jobs from table
 * @param {Object} exchangeRates - Live exchange rates from API (NOK, USD, EUR)
 */
const AdminAnalyticsPanel = ({ filteredJobs = [], exchangeRates = { NOK: 6.5, USD: 0.65, EUR: 0.60 } }) => {
  const [selectedCurrency, setSelectedCurrency] = useState('NOK');
  const [isSynced, setIsSynced] = useState(false);
  const [syncedRate, setSyncedRate] = useState(null);
  
  // Manual exchange rates (AUD to target currency) - used by default
  const manualExchangeRates = {
    NOK: 6.5,  // AUD to NOK
    USD: 0.65, // AUD to USD
    EUR: 0.60  // AUD to EUR
  };
  
  // Live exchange rates from API (updated weekly via Frankfurter API)
  const liveExchangeRates = exchangeRates;
  
  // Handle sync toggle
  const handleSyncToggle = () => {
    if (!isSynced) {
      // Syncing: capture the current live rate for selected currency
      const liveRate = liveExchangeRates[selectedCurrency];
      console.log('🔄 Syncing to live rate:', {
        currency: selectedCurrency,
        manualRate: manualExchangeRates[selectedCurrency],
        liveRate: liveRate,
        allLiveRates: liveExchangeRates
      });
      setSyncedRate(liveRate);
      setIsSynced(true);
    } else {
      // Unsyncing: clear synced rate
      console.log('🔓 Unsyncing - returning to manual rate');
      setSyncedRate(null);
      setIsSynced(false);
    }
  };
  
  // Determine which rate to use
  const currentRate = isSynced ? syncedRate : manualExchangeRates[selectedCurrency];
  
  // Calculate all stats from filtered jobs
  const stats = useMemo(() => {
    if (!filteredJobs || filteredJobs.length === 0) {
      return {
        totalProjects: 0,
        totalEstPay: 0,
        totalEstQty: 0,
        totalAUD: 0,
        totalNOK: 0,
        totalAUDexGST: 0,
        avgKPIRatio: 0,
        totalAdminHours: 0,
      };
    }

    let totalEstPay = 0;
    let totalEstQty = 0;
    let totalAUD = 0;
    let totalNOK = 0;
    let totalAUDexGST = 0;
    let totalKPIRatioSum = 0;
    let kpiCount = 0;
    let totalAdminHours = 0;

    filteredJobs.forEach(job => {
      // Estimator Pay - calculated from EstQty * $30
      const estPay = calculatePay(job, 30);
      totalEstPay += estPay;

      // Estimate Quantity (EstQty) - number of estimate units
      const estQty = parseFloat(job.EstQty) || 0;
      totalEstQty += estQty;

      // Total AUD (PriceEach * Qty)
      const priceAUD = calculateAUD(job, planTypes);
      const qty = parseFloat(job.Qty) || 0;
      if (priceAUD && qty) {
        const jobTotal = priceAUD * qty;
        totalAUD += jobTotal;
      }

      // Total Foreign Currency (price in AUD converted to selected currency * Qty)
      if (priceAUD && qty) {
        const jobTotalForeign = priceAUD * qty * currentRate;
        totalNOK += jobTotalForeign;
      }

      // KPI Ratio for averaging - if field exists
      if (job.kpiRatio && !isNaN(job.kpiRatio)) {
        totalKPIRatioSum += parseFloat(job.kpiRatio);
        kpiCount++;
      }

      // Admin hours - if field exists
      if (job.adminHours && !isNaN(job.adminHours)) {
        totalAdminHours += parseFloat(job.adminHours);
      }
    });

    // totalAUD is already exc GST, so we keep it as is for "AUD exc GST"
    totalAUDexGST = totalAUD;
    
    // For "Total AUD inc GST" we need to add GST (multiply by 1.1)
    const totalAUDincGST = totalAUD * 1.1;

    const avgKPIRatio = kpiCount > 0 ? totalKPIRatioSum / kpiCount : 0;

    return {
      totalProjects: filteredJobs.length,
      totalEstPay: totalEstPay,
      totalEstQty: totalEstQty,
      totalAUD: totalAUD,
      totalNOK: totalNOK,
      totalAUDexGST: totalAUDexGST,
      avgKPIRatio: avgKPIRatio,
      totalAdminHours: totalAdminHours,
    };
  }, [filteredJobs, currentRate]);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t-4 border-blue-600 p-6 mt-4">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Admin Analytics - Filtered View Stats
        </h3>

        <div className="grid grid-cols-12 gap-4">
          {/* ROW 1 */}
          
          {/* Projects - Slots 1-2 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Projects</div>
            <div className="text-2xl font-bold text-gray-900 text-right">{stats.totalProjects}</div>
          </div>

          {/* Qty (Total Quantity) - Slots 3-4 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-amber-200">
            <div className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Qty (Estimate Units)</div>
            <div className="text-2xl font-bold text-amber-700 text-right">
              {filteredJobs.reduce((sum, job) => sum + (parseFloat(job.Qty) || 0), 0).toFixed(1)}
            </div>
          </div>

          {/* Est Qty - Slots 5-6 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-purple-200">
            <div className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Est Qty (Estimate Units)</div>
            <div className="text-2xl font-bold text-purple-700 text-right">{stats.totalEstQty.toFixed(1)}</div>
          </div>

          {/* Est Pay - Slots 7-8 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-green-200">
            <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Est Pay</div>
            <div className="text-2xl font-bold text-green-700 text-right">${stats.totalEstPay.toFixed(2)}</div>
          </div>

          {/* AUD exc GST - Slots 9-12 */}
          <div className="col-span-4 bg-white rounded-lg shadow-sm p-4 border border-blue-200">
            <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">AUD (exc GST)</div>
            <div className="text-2xl font-bold text-blue-700 text-right">${stats.totalAUDexGST.toFixed(2)}</div>
          </div>

          {/* ROW 2 */}

          {/* Exchange Rate - Slots 13-14 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {isSynced ? 'Synced Exchange' : 'Exchange Rate'}: AUD→
              </span>
              <button
                onClick={handleSyncToggle}
                className={`group relative transition-colors ${
                  isSynced ? 'text-green-500' : 'text-gray-400 hover:text-blue-500'
                }`}
                title={isSynced ? 'Using synced rate - click to use manual' : 'Click to sync with live rate'}
              >
                <svg className="w-4 h-4 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {!isSynced && (
                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                    Live: {liveExchangeRates[selectedCurrency]?.toFixed(2) || 'N/A'}
                  </div>
                )}
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <select 
                value={selectedCurrency} 
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="text-lg font-semibold text-gray-600 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer p-0"
              >
                <option value="NOK">NOK</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <span className="text-2xl font-bold text-gray-700">
                {currentRate.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Total Foreign Currency - Slots 15-16 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-indigo-200">
            <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">Total {selectedCurrency}</div>
            <div className="text-2xl font-bold text-indigo-700 text-right">
              {selectedCurrency === 'NOK' && 'kr '}
              {selectedCurrency === 'USD' && '$'}
              {selectedCurrency === 'EUR' && '€'}
              {stats.totalNOK.toFixed(2)}
            </div>
          </div>

          {/* Estimated Profit - Slots 17-20 */}
          <div className="col-span-4 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Estimated Profit</div>
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-2xl font-bold text-green-600">
                ${(stats.totalAUDexGST - stats.totalEstPay).toFixed(2)}
              </span>
              <span className="text-sm text-gray-500">
                ({stats.totalAUDexGST > 0 ? (((stats.totalAUDexGST - stats.totalEstPay) / stats.totalAUDexGST) * 100).toFixed(1) : 0}% margin)
              </span>
            </div>
          </div>

          {/* AUD inc GST - Slots 21-24 */}
          <div className="col-span-4 bg-white rounded-lg shadow-sm p-4 border border-teal-200">
            <div className="text-xs font-medium text-teal-600 uppercase tracking-wide mb-1">AUD (inc GST)</div>
            <div className="text-2xl font-bold text-teal-700 text-right">${(stats.totalAUDexGST * 1.1).toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPanel;
