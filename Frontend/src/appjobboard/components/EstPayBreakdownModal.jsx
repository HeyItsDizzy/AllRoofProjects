// EstPayBreakdownModal.jsx - Modal for splitting Est Pay across multiple estimators
import React, { useState, useEffect } from 'react';
import Swal from '@/shared/swalConfig';
import Avatar from '@/shared/Avatar';

/**
 * Modal for managing estimate pay breakdown across multiple estimators
 * Used when a project has 2+ estimators (e.g., roof + walls)
 * 
 * @param {Array} linkedEstimators - Array of estimator IDs assigned to project
 * @param {Array} estimators - Full list of estimators with details
 * @param {Object} currentBreakdown - Existing breakdown { estimatorId: units }
 * @param {Function} onSave - Callback(breakdown) when user saves
 * @param {Function} onClose - Callback to close modal
 */
const EstPayBreakdownModal = ({ 
  linkedEstimators = [], 
  estimators = [], 
  currentBreakdown = {},
  onSave,
  onClose 
}) => {
  const RATE_PER_UNIT = 30;
  
  // Initialize breakdown state with current values or zeros
  const [breakdown, setBreakdown] = useState(() => {
    const initial = {};
    linkedEstimators.forEach(estId => {
      initial[estId] = currentBreakdown[estId] || 0;
    });
    return initial;
  });

  const handleUnitsChange = (estimatorId, value) => {
    const numValue = parseFloat(value) || 0;
    setBreakdown(prev => ({
      ...prev,
      [estimatorId]: numValue
    }));
  };

  const calculateTotal = () => {
    return Object.values(breakdown).reduce((sum, units) => sum + units, 0);
  };

  const calculateTotalPay = () => {
    return calculateTotal() * RATE_PER_UNIT;
  };

  const handleSave = () => {
    const totalUnits = calculateTotal();
    
    if (totalUnits === 0) {
      Swal.fire({
        title: 'No Units Entered',
        text: 'Please enter estimate units for at least one estimator.',
        icon: 'warning'
      });
      return;
    }

    // Create array of breakdown items with estimator details
    const breakdownArray = linkedEstimators.map(estId => {
      const estimator = estimators.find(e => e._id === estId) || {};
      const units = breakdown[estId] || 0;
      return {
        estimatorId: estId,
        estimatorName: `${estimator.firstName || ''} ${estimator.lastName || ''}`.trim() || estimator.email,
        units: units,
        amount: units * RATE_PER_UNIT
      };
    }).filter(item => item.units > 0); // Only include estimators with units > 0

    onSave({
      breakdown: breakdownArray,
      totalUnits: totalUnits,
      totalPay: calculateTotalPay()
    });
  };

  const handleQuickSplit = () => {
    const numEstimators = linkedEstimators.length;
    const currentTotal = calculateTotal();
    const unitsPerEstimator = currentTotal > 0 ? Math.round((currentTotal / numEstimators) * 10) / 10 : 1;
    
    const equalSplit = {};
    linkedEstimators.forEach(estId => {
      equalSplit[estId] = unitsPerEstimator;
    });
    
    setBreakdown(equalSplit);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <h2 className="text-2xl font-bold mb-2">Estimate Pay Breakdown</h2>
          <p className="text-blue-100 text-sm">
            Split estimate units across {linkedEstimators.length} estimators • ${RATE_PER_UNIT}/unit
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {linkedEstimators.map((estId, index) => {
            const estimator = estimators.find(e => e._id === estId) || {};
            const estimatorName = `${estimator.firstName || ''} ${estimator.lastName || ''}`.trim() || estimator.email;
            const units = breakdown[estId] || 0;
            const pay = units * RATE_PER_UNIT;

            return (
              <div 
                key={estId} 
                className="mb-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Estimator Avatar & Name */}
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar
                      name={estimatorName}
                      avatarUrl={estimator.avatar}
                      size="md"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{estimatorName}</div>
                      <div className="text-sm text-gray-500">{estimator.email}</div>
                    </div>
                  </div>

                  {/* Units Input */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <label className="block text-xs text-gray-500 mb-1">Units</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={units}
                        onChange={(e) => handleUnitsChange(estId, e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md text-center font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                    
                    {/* Pay Amount */}
                    <div className="text-right w-24">
                      <label className="block text-xs text-gray-500 mb-1">Pay</label>
                      <div className="text-lg font-bold text-green-600">
                        ${pay.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick Actions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <button
              onClick={handleQuickSplit}
              className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors text-sm font-medium"
            >
              ⚡ Split Evenly
            </button>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">Total Units:</span>
              <span className="text-2xl font-bold text-blue-600">{calculateTotal().toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Total Pay:</span>
              <span className="text-2xl font-bold text-green-600">${calculateTotalPay().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-md font-medium transition-colors shadow-md"
          >
            Save Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstPayBreakdownModal;
