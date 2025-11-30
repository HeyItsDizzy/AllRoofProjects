// EstimatorAnalyticsPanel.jsx - Analytics panel for Estimator role
import React, { useMemo } from 'react';
import { calculatePay } from '@/shared/jobPricingUtils';

/**
 * Estimator Analytics Panel - Shows aggregated stats for current estimator
 * Only visible to Estimator users at bottom of Job Board
 * Shows: Projects, EstQty, EstPay, Pending/Approved counts, Averages
 * 
 * @param {Array} filteredJobs - Currently filtered/visible jobs from table
 */
const EstimatorAnalyticsPanel = ({ filteredJobs = [] }) => {
  
  // Calculate all stats from filtered jobs
  const stats = useMemo(() => {
    if (!filteredJobs || filteredJobs.length === 0) {
      return {
        totalProjects: 0,
        totalEstQty: 0,
        totalEstPay: 0,
        pendingApprovals: 0,
        approvedJobs: 0,
        avgEstQtyPerProject: 0,
        statusBreakdown: {}
      };
    }

    let totalEstQty = 0;
    let totalEstPay = 0;
    let pendingApprovals = 0;
    let approvedJobs = 0;
    const statusBreakdown = {};

    filteredJobs.forEach(job => {
      // Estimate Quantity (EstQty)
      const estQty = parseFloat(job.EstQty) || 0;
      totalEstQty += estQty;

      // Estimator Pay - calculated from EstQty * $30
      const estPay = calculatePay(job, 30);
      totalEstPay += estPay;

      // Count pending approvals (EstPayStatus NOT 'Confirmed' and has EstQty > 0 OR has Qty > 0)
      // This matches the logic in JobBoardConfig where pending badge shows
      const hasQty = parseFloat(job.Qty || 0) > 0;
      const showApprovalControls = estQty > 0 || (estQty === 0 && hasQty);
      if (job.EstPayStatus !== 'Confirmed' && showApprovalControls) {
        pendingApprovals++;
      }

      // Count approved jobs (EstPayStatus = 'Confirmed')
      if (job.EstPayStatus === 'Confirmed') {
        approvedJobs++;
      }

      // Status breakdown for jobBoardStatus
      const status = job.jobBoardStatus || 'Unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    const avgEstQtyPerProject = filteredJobs.length > 0 ? totalEstQty / filteredJobs.length : 0;

    return {
      totalProjects: filteredJobs.length,
      totalEstQty,
      totalEstPay,
      pendingApprovals,
      approvedJobs,
      avgEstQtyPerProject,
      statusBreakdown
    };
  }, [filteredJobs]);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-t-4 border-purple-600 p-6 mt-4">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          My Estimates - Filtered View Stats
        </h3>

        <div className="grid grid-cols-12 gap-4">
          {/* ROW 1 */}
          
          {/* Total Projects - Slots 1-2 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Projects</div>
            <div className="text-2xl font-bold text-gray-900 text-right">{stats.totalProjects}</div>
          </div>

          {/* Total EstQty - Slots 3-4 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-purple-200">
            <div className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Est Qty (Units)</div>
            <div className="text-2xl font-bold text-purple-700 text-right">{stats.totalEstQty.toFixed(1)}</div>
          </div>

          {/* Total EstPay - Slots 5-6 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-green-200">
            <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Total Pay</div>
            <div className="text-2xl font-bold text-green-700 text-right">${stats.totalEstPay.toFixed(2)}</div>
          </div>

          {/* Pending Approvals - Slots 7-8 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-yellow-200">
            <div className="text-xs font-medium text-yellow-600 uppercase tracking-wide mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-700 text-right">{stats.pendingApprovals}</div>
          </div>

          {/* Approved Jobs - Slots 9-10 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-teal-200">
            <div className="text-xs font-medium text-teal-600 uppercase tracking-wide mb-1">Approved</div>
            <div className="text-2xl font-bold text-teal-700 text-right">{stats.approvedJobs}</div>
          </div>

          {/* Avg EstQty per Project - Slots 11-12 */}
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4 border border-blue-200">
            <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Avg Units</div>
            <div className="text-2xl font-bold text-blue-700 text-right">{stats.avgEstQtyPerProject.toFixed(1)}</div>
          </div>

          {/* ROW 2 - Status Breakdown */}
          
          {/* Status Breakdown Header - Slots 13-24 */}
          <div className="col-span-12 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Status Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="bg-gray-50 rounded p-3 border border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">{status}</div>
                  <div className="text-xl font-bold text-gray-900">{count}</div>
                </div>
              ))}
              
              {Object.keys(stats.statusBreakdown).length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-4">
                  No projects in current filter
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estimator Tips */}
        <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Quick Tips:
          </h4>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• <strong>Est Qty:</strong> Number of estimate units you've completed (editable until approved)</li>
            <li>• <strong>Total Pay:</strong> Your earnings based on completed units (Est Qty × $30/unit)</li>
            <li>• <strong>Pending:</strong> Estimates awaiting admin approval for payment</li>
            <li>• <strong>Approved:</strong> Confirmed payments - Est Qty is now locked</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EstimatorAnalyticsPanel;
