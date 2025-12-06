/**
 * Currency formatting utilities
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  position: 'before' | 'after';
  decimals: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

// Currency configurations for supported currencies
// SDG is the primary currency - must be first and default
export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  SDG: {
    code: 'SDG',
    symbol: 'ج.س',
    position: 'after',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  SAR: {
    code: 'SAR',
    symbol: 'ر.س',
    position: 'after',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    position: 'after',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  OMR: {
    code: 'OMR',
    symbol: 'ر.ع',
    position: 'after',
    decimals: 3,
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    position: 'before',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    position: 'before',
    decimals: 2,
    thousandsSeparator: '.',
    decimalSeparator: ','
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    position: 'before',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.'
  }
};

/**
 * Format amount with currency
 * @param amount The numeric amount
 * @param currencyCode The currency code (e.g., 'SDG', 'SAR', 'USD')
 * @param options Optional formatting options
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  currencyCode: string = 'SDG',
  options?: {
    showCode?: boolean;
    showSymbol?: boolean;
    compact?: boolean;
  }
): string {
  // Handle null/undefined amounts
  if (amount === null || amount === undefined) {
    amount = 0;
  }

  // Convert to number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Get currency config
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.SDG;
  
  // Format the number
  const formatted = numAmount.toFixed(config.decimals);
  
  // Add thousands separators
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandsSeparator);
  const formattedNumber = parts.join(config.decimalSeparator);
  
  // Build the final string
  const { showCode = false, showSymbol = true, compact = false } = options || {};
  
  if (compact && showSymbol) {
    // Compact format with symbol only
    return config.position === 'before' 
      ? `${config.symbol}${formattedNumber}`
      : `${formattedNumber} ${config.symbol}`;
  }
  
  if (showCode && !showSymbol) {
    // Show code only
    return `${config.code} ${formattedNumber}`;
  }
  
  if (showCode && showSymbol) {
    // Show both symbol and code
    return config.position === 'before'
      ? `${config.symbol}${formattedNumber} ${config.code}`
      : `${formattedNumber} ${config.symbol} (${config.code})`;
  }
  
  // Default: symbol only
  return config.position === 'before' 
    ? `${config.symbol}${formattedNumber}`
    : `${formattedNumber} ${config.symbol}`;
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string = 'SDG'): string {
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.SDG;
  return config.symbol;
}

/**
 * Format amount for display in order cards and lists
 */
export function formatOrderAmount(
  amount: number | string | undefined | null,
  currencyCode: string = 'SDG'
): string {
  return formatCurrency(amount, currencyCode, { compact: true });
}