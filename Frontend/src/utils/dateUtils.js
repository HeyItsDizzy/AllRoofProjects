// utils/dateUtils.js

/**
 * Take any ISO-date string (or Date) and return a locale-formatted date.
 *
 * @param {string|Date} dateInput  ISO string like "2025-07-25" or a full Date.
 * @param {string|string[]} [locale]  e.g. "en-AU", "en-US", or undefined to use browser default.
 * @param {Intl.DateTimeFormatOptions} [options]
 *   defaults to numeric year/month/day.
 * @returns {string}  e.g. "25/07/2025" in en-AU, "07/25/2025" in en-US, etc.
 */
export function formatLocalDate(
  dateInput,
  locale = undefined,
  options = { year: "numeric", month: "2-digit", day: "2-digit" }
) {
  let dt;
  if (dateInput instanceof Date) {
    dt = dateInput;
  } else {
    dt = new Date(dateInput);
  }
  if (isNaN(dt.getTime())) return String(dateInput);
  return dt.toLocaleDateString(locale, options);
}

/**
 * React hook wrapper around formatLocalDate.
 * Memoizes the result so re-renders don’t redo the formatting.
 */
import { useMemo } from "react";
export function useLocalDate(dateInput, locale, options) {
  return useMemo(
    () => formatLocalDate(dateInput, locale, options),
    [dateInput, locale, JSON.stringify(options)]
  );
}
