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
export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
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
  SDG: {
    code: 'SDG',
    symbol: 'ج.س',
    position: 'after',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  USD: {
    code: 'SDG',
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
 * @param currencyCode The currency code (e.g., 'SAR', 'SDG')
 * @param options Optional formatting options
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  currencyCode: string = 'SAR',
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
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.SAR;
  
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
export function getCurrencySymbol(currencyCode: string = 'SAR'): string {
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.SAR;
  return config.symbol;
}

/**
 * Format amount for display in order cards and lists
 */
export function formatOrderAmount(
  amount: number | string | undefined | null,
  currencyCode: string = 'SAR'
): string {
  return formatCurrency(amount, currencyCode, { compact: true });
}