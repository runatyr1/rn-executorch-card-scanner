export const DEFAULT_TIMEOUT = 120;
export const DEFAULT_SCAN_INTERVAL = 1000;
export const DEFAULT_REQUIRED_TICKS = 2;

export const CHAR_TO_DIGIT: Record<string, string> = {
  'O': '0', 'o': '0', 'D': '0',
  'I': '1', 'l': '1', 'i': '1', '|': '1',
  'Z': '2', 'z': '2',
  'E': '3', 'B': '8',
  'A': '4', 'a': '4', 'U': '4', 'u': '4',
  'S': '5', 's': '5',
  'G': '6', 'b': '6', 'L': '6',
  'T': '1', 't': '1',
  'g': '9', 'q': '9',
};

export const BANNED_WORDS = new Set([
  // English
  'card', 'holder', 'cardholder', 'expires', 'expiry', 'expiration',
  'valid', 'thru', 'through', 'from', 'member', 'since', 'date', 'last',
  'visa', 'mastercard', 'amex', 'american', 'express', 'discover',
  'maestro', 'debit', 'credit', 'platinum', 'gold', 'classic', 'signature',
  'bank', 'international', 'electronic', 'use', 'only', 'month', 'year',
  'number', 'name', 'first', 'middle', 'security', 'code', 'cvv', 'cvc', 'exp', 'pin',
  'issued', 'customer', 'account', 'prepaid', 'business', 'corporate',
  'world', 'elite', 'premium', 'rewards', 'contactless', 'chip',
  // Spanish
  'tarjeta', 'titular', 'vencimiento', 'vence', 'valida', 'valido',
  'desde', 'miembro', 'nombre', 'fecha', 'debito', 'credito',
  'habiente', 'tarjetahabiente', 'segundo', 'apellido', 'primer',
  'numero', 'cliente', 'cuenta', 'emision', 'banco', 'sucursal',
]);
