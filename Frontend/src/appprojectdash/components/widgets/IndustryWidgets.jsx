/**
 * INDUSTRY WIDGETS
 * Specialized tools for roofing industry (Supplier Checker, Wind Detector, Color Selector)
 */
import React, { useState } from 'react';
import {
  IconDollar,
  IconCloud,
  IconPalette,
  IconComplete,
  IconRight,
} from '@/shared/IconSet.jsx';
import { SUPPLIERS, WIND_REGIONS, ROOFING_COLORS } from '@/appprojectdash/config/ProjectDashConfig.jsx';

const SupplierPriceChecker = ({ selectedMaterial = 'Colorbond', pricePerSqm = 21.5, onCheck }) => {
  return (
    <div className="p-6 rounded-xl border-2 border-gray-200 bg-white hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-2 mb-4">
        <IconDollar className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold text-textBlack">Supplier Price Checker</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm text-textGray">{selectedMaterial} / Steel</span>
          </div>
          <button
            onClick={onCheck}
            className="text-xs text-primary hover:text-green-700 font-medium flex items-center gap-1"
          >
            Check prices
            <IconRight className="w-3 h-3" />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-primary-10 border border-primary">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">
              ${pricePerSqm.toFixed(2)}
            </span>
            <span className="text-sm text-textGray">/m²</span>
          </div>
          <div className="text-xs text-textGray mt-1">Current market rate</div>
        </div>

        <div className="flex items-center gap-2 text-xs text-textGray">
          <IconComplete className="w-4 h-4 text-primary" />
          <span>Updated 2 hours ago</span>
        </div>
      </div>
    </div>
  );
};

const WindRegionDetector = ({ detectedRegion = 'C', verified = true, address, onVerify }) => {
  const region = WIND_REGIONS.find((r) => r.code === detectedRegion) || WIND_REGIONS[2];

  return (
    <div className="p-6 rounded-xl border-2 border-gray-200 bg-white hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-2 mb-4">
        <IconCloud className="w-5 h-5 text-secondary" />
        <h3 className="text-base font-semibold text-textBlack">Wind Region Detector</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {verified ? (
              <IconComplete className="w-5 h-5 text-primary" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className="text-sm font-medium text-textBlack">{region.label}</span>
          </div>
          {verified ? (
            <span className="text-xs px-2 py-1 rounded-full bg-primary text-white">
              Verified
            </span>
          ) : (
            <button
              onClick={onVerify}
              className="text-xs text-secondary hover:text-blue-700 font-medium"
            >
              Verify
            </button>
          )}
        </div>

        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div className="text-sm font-medium text-textBlack mb-1">Region {region.code}</div>
          <div className="text-xs text-textGray">{region.description}</div>
        </div>

        {address && (
          <div className="text-xs text-textGray">
            📍 Auto-detected from site address
          </div>
        )}
      </div>
    </div>
  );
};

const ColorSelector = ({ selectedColor = 'Surfmist', onSelect }) => {
  const [showPicker, setShowPicker] = useState(false);
  const currentColor = ROOFING_COLORS.find((c) => c.id === selectedColor.toLowerCase()) || ROOFING_COLORS[0];

  return (
    <div className="p-6 rounded-xl border-2 border-gray-200 bg-white hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-2 mb-4">
        <IconPalette className="w-5 h-5 text-Orange" />
        <h3 className="text-base font-semibold text-textBlack">Colour Selector</h3>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-full p-3 rounded-lg border-2 border-gray-200 hover:border-primary transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border-2 border-gray-300 shadow-sm"
              style={{ backgroundColor: currentColor.hex }}
            />
            <div className="text-left">
              <div className="text-sm font-medium text-textBlack group-hover:text-primary transition-colors">
                {currentColor.name}
              </div>
              <div className="text-xs text-textGray">{currentColor.hex}</div>
            </div>
          </div>
          <IconRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
        </button>

        {showPicker && (
          <div className="grid grid-cols-5 gap-2 p-3 bg-gray-50 rounded-lg">
            {ROOFING_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => {
                  onSelect?.(color.id);
                  setShowPicker(false);
                }}
                className={`
                  w-10 h-10 rounded-lg border-2 shadow-sm transition-all hover:scale-110
                  ${color.id === currentColor.id ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-gray-300'}
                `}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        )}

        <div className="text-xs text-textGray">
          Click to view all Colorbond colours
        </div>
      </div>
    </div>
  );
};

export { SupplierPriceChecker, WindRegionDetector, ColorSelector };
