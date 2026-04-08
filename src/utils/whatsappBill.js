/**
 * Frontend-only: builds bill text and opens WhatsApp (wa.me). No server calls.
 */
import { Alert, Linking } from 'react-native';

export function normalizeWhatsAppDigits(raw) {
  return String(raw || '').replace(/\D/g, '');
}

/** @param {object} sale – shape from POST /api/sales response `sale` field */
export function buildBillMessageFromSale(sale) {
  if (!sale) return '';
  const lines = ['*Bill / Receipt*', ''];
  const when = sale.saleDate ? new Date(sale.saleDate) : new Date();
  lines.push(`Date: ${when.toLocaleString()}`);
  lines.push('');
  (sale.items || []).forEach((it, i) => {
    lines.push(`${i + 1}. ${it.productName}`);
    lines.push(
      `   ${it.quantity} × ₹${Number(it.sellPrice).toFixed(2)} = ₹${Number(it.totalRevenue).toFixed(2)}`,
    );
  });
  lines.push('');
  lines.push(`*Total:* ₹${Number(sale.totalRevenue).toFixed(2)}`);
  lines.push('');
  lines.push('Thank you for your purchase!');
  return lines.join('\n');
}

export async function openWhatsAppWithBill(phone, message) {
  const digits = normalizeWhatsAppDigits(phone);
  if (digits.length < 10) {
    Alert.alert(
      'Invalid number',
      'Enter a WhatsApp number with country code, digits only (e.g. 919876543210).',
    );
    return;
  }
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Error', 'Could not open WhatsApp. Install WhatsApp or try again.');
  }
}
