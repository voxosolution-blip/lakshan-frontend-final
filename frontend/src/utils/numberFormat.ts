/**
 * Format a number, removing unnecessary trailing zeros and decimals
 * Examples:
 * - 100.00 → "100"
 * - 0.100 → "0.1"
 * - 0.10 → "0.1"
 * - 100.5 → "100.5"
 * - 0.123 → "0.123"
 * - 10 → "10" (not "1")
 * - 50 → "50" (not "5")
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  // Convert to string
  const str = num.toString();
  
  // If it's a whole number (no decimal point), return as is
  if (!str.includes('.')) {
    return str;
  }
  
  // Remove trailing zeros after decimal point, then remove decimal if no digits remain
  return str.replace(/\.0+$/, '').replace(/(\d+\.\d*?)0+$/, '$1');
}

/**
 * Format a number with a specific number of decimal places, but remove trailing zeros
 * Examples:
 * - formatNumberDecimals(100.00, 2) → "100"
 * - formatNumberDecimals(0.100, 3) → "0.1"
 * - formatNumberDecimals(100.5, 2) → "100.5"
 * - formatNumberDecimals(10, 2) → "10" (not "1")
 */
export function formatNumberDecimals(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  // Format with decimals
  const formatted = num.toFixed(decimals);
  
  // Remove trailing zeros only if there's a decimal point
  // First remove all trailing zeros after decimal, then remove decimal if no digits remain
  return formatted.replace(/\.?0+$/, '');
}

export default {
  formatNumber,
  formatNumberDecimals
};

