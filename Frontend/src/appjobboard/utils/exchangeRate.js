// exchangeRate.js
import axios from 'axios';


/**
 * Fetch the current AUD to NOK exchange rate.
 * Uses exchangerate.host (free, no API key required)
 */
export async function getExchangeRate() {
  try {
    const res = await axios.get('https://api.frankfurter.app/latest?from=AUD&to=NOK');
    return res.data?.rates?.NOK || 7; // fallback to 7 if not available
  } catch (err) {
    console.error("Exchange rate fetch failed:", err);
    return 7; // fallback value
  }
}
