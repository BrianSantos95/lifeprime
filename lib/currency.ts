/** Converts currency text in either pt-BR or plain decimal notation to a number. */
export const parseCurrencyInput = (value: string): number => {
  const sanitized = value.trim().replace(/[^\d,.-]/g, '');
  if (!sanitized) return Number.NaN;
  const isNegative = sanitized.startsWith('-');
  const unsigned = sanitized.replace(/-/g, '');
  const lastComma = unsigned.lastIndexOf(',');
  const lastDot = unsigned.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = unsigned.split(thousandsSeparator).join('').replace(decimalSeparator, '.');
  } else if (lastComma >= 0) {
    const parts = unsigned.split(',');
    normalized = parts.length === 2 && parts[1].length !== 3 ? `${parts[0]}.${parts[1]}` : parts.join('');
  } else if (lastDot >= 0) {
    const parts = unsigned.split('.');
    normalized = parts.length === 2 && parts[1].length !== 3 ? `${parts[0]}.${parts[1]}` : parts.join('');
  } else {
    normalized = unsigned;
  }
  const parsed = Number(normalized);
  return isNegative ? -parsed : parsed;
};
