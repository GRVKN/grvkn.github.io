export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function approvedProviders(rows) {
  return (Array.isArray(rows) ? rows : []).filter(row => UUID.test(row.business_id || '') && row.studio_allowed === true && row.provider_status === 'active' && row.verification_status === 'verified' && ['owner', 'admin', 'editor'].includes(row.member_role));
}
export function sessionStorageAdapter(storage) {
  // Flutter SharedPreferences stores the same session under its own prefix,
  // with an extra JSON string layer. Flutter logout removes this authoritative key.
  // Never revive a signed-out session from the JavaScript compatibility copy.
  return {
    getItem(key) { const value = storage.getItem('flutter.' + key); if (value !== null) { try { const decoded = JSON.parse(value); if (typeof decoded === 'string') return decoded; } catch {} return value; } return null; },
    setItem(key, value) { storage.setItem(key, value); storage.setItem('flutter.' + key, JSON.stringify(value)); },
    removeItem(key) { storage.removeItem(key); storage.removeItem('flutter.' + key); },
  };
}
export function validateSubmission(input) {
  const title = String(input.title || '').trim(), description = String(input.description || '').trim();
  if (title.length < 5 || title.length > 90) throw new Error('Der Titel braucht 5 bis 90 Zeichen.');
  if (description.length < 10 || description.length > 500) throw new Error('Die Beschreibung braucht 10 bis 500 Zeichen.');
  if (!UUID.test(input.categoryId || '') || !UUID.test(input.locationId || '')) throw new Error('Bitte wähle Kategorie und Standort.');
  if (input.rights !== true) throw new Error('Bitte bestätige die Rechte am Video.');
  const allowed = ['website', 'shop', 'call', 'route', 'offer', 'apply', 'contact'];
  if (!allowed.includes(input.ctaType)) throw new Error('Bitte wähle eine gültige Kontaktart.');
  const ctaUrl = String(input.ctaUrl || '').trim();
  if (input.ctaType === 'website' || ['shop','route','offer','apply'].includes(input.ctaType)) { let url; try { url = new URL(ctaUrl); } catch {} if (!url || url.protocol !== 'https:' || url.username || url.password) throw new Error('Bitte verwende eine HTTPS-Adresse für den Link.'); }
  if (input.ctaType === 'call' && !/^tel:\+?[0-9 ()-]{4,30}$/.test(ctaUrl)) throw new Error('Telefonnummer bitte als tel:+49… eintragen.');
  if (input.ctaType === 'contact' && !/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ctaUrl)) throw new Error('E-Mail bitte als mailto:kontakt@… eintragen.');
  return { title, description, categoryId: input.categoryId, locationId: input.locationId, ctaType: input.ctaType, ctaUrl };
}
