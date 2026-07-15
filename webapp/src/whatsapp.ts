// WhatsApp "tıkla-sohbet" (wa.me) yardımcıları. Sunucu/entegrasyon
// gerektirmez: numarayı ve hazır mesajı içeren bir bağlantı açar, kullanıcı
// WhatsApp'ta "gönder"e basar.

// Türkiye telefon numarasını wa.me'nin beklediği uluslararası biçime (ülke
// kodu + numara, + işareti olmadan) çevirir. 0XXXXXXXXXX, XXXXXXXXXX ve
// 90XXXXXXXXXX gibi yaygın girişleri destekler.
export function normalizeTrPhone(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  if (digits.length === 10) return `90${digits}`;
  // Zaten ülke kodlu ya da beklenmedik biçim — olduğu gibi kullan.
  return digits;
}

// Verilen telefon ve metinle bir wa.me bağlantısı üretir; telefon yoksa null.
export function waLink(phone: string | undefined, text: string): string | null {
  const num = normalizeTrPhone(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
