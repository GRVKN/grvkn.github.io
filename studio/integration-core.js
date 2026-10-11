export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function approvedProviders(rows) {
  return (Array.isArray(rows) ? rows : []).filter(row => UUID.test(row.business_id || '') && row.studio_allowed === true && row.provider_status === 'active' && row.verification_status === 'verified' && ['owner', 'admin', 'editor'].includes(row.member_role));
}
export function sessionStorageAdapter(storage) {
  // supabase_flutter 2.15.4 stores raw web sessions at the native auth key.
  // Migrate the older SharedPreferences format once; after that, the native
  // key is authoritative, including deletion by the Flutter sign-out flow.
  const formatKey = key => 'grvkn-studio-auth-format:' + key;
  return {
    getItem(key) {
      const native = storage.getItem(key);
      if (native !== null) {
        storage.setItem(formatKey(key), 'native');
        storage.removeItem('flutter.' + key);
        return native;
      }
      if (storage.getItem(formatKey(key)) === 'native') {
        storage.removeItem('flutter.' + key);
        return null;
      }
      const legacy = storage.getItem('flutter.' + key);
      if (legacy === null) return null;
      let value = legacy;
      try { const decoded = JSON.parse(legacy); if (typeof decoded === 'string') value = decoded; } catch {}
      storage.setItem(key, value);
      storage.setItem(formatKey(key), 'native');
      storage.removeItem('flutter.' + key);
      return value;
    },
    setItem(key, value) {
      storage.setItem(key, value);
      storage.setItem(formatKey(key), 'native');
      storage.removeItem('flutter.' + key);
    },
    removeItem(key) {
      storage.setItem(formatKey(key), 'native');
      storage.removeItem(key);
      storage.removeItem('flutter.' + key);
    },
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
