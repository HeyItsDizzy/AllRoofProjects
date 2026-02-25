/**
 * KEY AREA TILES
 * Clickable tiles for main project modules (Take-offs, Quotes, Orders, Files)
 */
import React from 'react';
import {
  IconScale,
  IconDuplicate,
  IconCart,
  IconFolder,
  IconRight,
} from '@/shared/IconSet.jsx';

const TakeoffsTile = ({ roofFaces = 0, wallFaces = 0, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-primary hover:bg-primary-10 hover:shadow-lg transition-all duration-200 text-left group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary-10">
            <IconScale className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-textBlack group-hover:text-primary transition-colors">
              Take-offs
            </h3>
            <p className="text-sm text-textGray">Measurements & Quantities</p>
          </div>
        </div>
        <IconRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-bold text-textBlack">{roofFaces}</div>
            <div className="text-xs text-textGray">Roof faces</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-Orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-bold text-textBlack">{wallFaces}</div>
            <div className="text-xs text-textGray">Wall faces</div>
          </div>
        </div>
      </div>
    </button>
  );
};

const QuotesTile = ({ draftCount = 0, latestAmount = 0, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-secondary hover:bg-blue-50 hover:shadow-lg transition-all duration-200 text-left group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-50">
            <IconDuplicate className="w-7 h-7 text-secondary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-textBlack group-hover:text-secondary transition-colors">
              Quotes
            </h3>
            <p className="text-sm text-textGray">Pricing & Proposals</p>
          </div>
        </div>
        <IconRight className="w-5 h-5 text-gray-400 group-hover:text-secondary transition-colors" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-textGray">Draft quotes</span>
          <span className="text-lg font-bold text-textBlack">{draftCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-textGray">Latest quote</span>
          <span className="text-xl font-bold text-primary">
            ${latestAmount.toLocaleString()}
          </span>
        </div>
      </div>
    </button>
  );
};

const OrdersTile = ({ openCount = 0, statusText = 'No active orders', onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-purple-600 hover:bg-purple-50 hover:shadow-lg transition-all duration-200 text-left group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-purple-50">
            <IconCart className="w-7 h-7 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-textBlack group-hover:text-purple-600 transition-colors">
              Orders
            </h3>
            <p className="text-sm text-textGray">Materials & Suppliers</p>
          </div>
        </div>
        <IconRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-textGray">Open orders</span>
          <span className="text-2xl font-bold text-textBlack">{openCount}</span>
        </div>
        <div className="text-sm text-textGray italic">{statusText}</div>
      </div>
    </button>
  );
};

const FilesTile = ({ fileCount = 0, categories = [], onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-Orange hover:bg-orange-50 hover:shadow-lg transition-all duration-200 text-left group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-orange-50">
            <IconFolder className="w-7 h-7 text-Orange" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-textBlack group-hover:text-Orange transition-colors">
              Files
            </h3>
            <p className="text-sm text-textGray">Documents & Attachments</p>
          </div>
        </div>
        <IconRight className="w-5 h-5 text-gray-400 group-hover:text-Orange transition-colors" />
      </div>

      <div className="space-y-3">
        <div className="text-3xl font-bold text-textBlack">{fileCount}</div>
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 4).map((cat, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 rounded-full bg-gray-100 text-textGray"
            >
              {cat.label}: {cat.count}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
};

export { TakeoffsTile, QuotesTile, OrdersTile, FilesTile };
