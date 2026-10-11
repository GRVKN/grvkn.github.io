// Same public link and content identifiers as GRVKN 0.12.x.
export const GRVKN_PUBLIC_ORIGIN = 'https://grvkn.github.io';
export const PROVIDER_TYPES = [
  { id: 'business', label: 'Unternehmen' },
  { id: 'club', label: 'Verein' },
  { id: 'event_organizer', label: 'Veranstalter' },
  { id: 'municipality', label: 'Kommune' },
  { id: 'institution', label: 'Einrichtung / Organisation' },
  { id: 'landlord', label: 'Vermieter' },
];
export const CONTENT_AREAS = [
  { id: 'business', label: 'Anbieter & Angebote' },
  { id: 'jobs_training', label: 'Jobs & Ausbildung' },
  { id: 'property', label: 'Immobilien & Wohnen' },
  { id: 'event', label: 'Veranstaltungen' },
  { id: 'municipality', label: 'Kommune' },
];

export function providerType(value) {
  return PROVIDER_TYPES.some(type => type.id === value) ? value : 'business';
}
export function normalizeAdId(value) {
  const input = typeof value === 'string' ? value.trim() : '';
  return /^[A-Za-z0-9_-]{1,128}$/.test(input) ? input : '';
}
export function publicAdLink(adId) {
  const id = normalizeAdId(adId);
  if (!id) throw new Error('Bitte verwende eine gültige GRVKN-Beitrags-ID.');
  const url = new URL('/v/', GRVKN_PUBLIC_ORIGIN);
  url.searchParams.set('id', id);
  return url.href;
}
export function readAdReference(value) {
  const input = String(value ?? '').trim();
  let id = normalizeAdId(input);
  if (!id) {
    let url;
    try { url = new URL(input); } catch { throw new Error('Füge den GRVKN-Beitragslink oder die Beitrags-ID aus GRVKN ein.'); }
    if (url.origin !== GRVKN_PUBLIC_ORIGIN || url.username || url.password || !['/v/', '/v'].includes(url.pathname) || url.searchParams.getAll('id').length !== 1) {
      throw new Error('Bitte verwende einen GRVKN-Beitragslink von grvkn.github.io/v/.');
    }
    id = normalizeAdId(url.searchParams.get('id'));
  }
  if (!id) throw new Error('Der GRVKN-Beitragslink enthält keine gültige Beitrags-ID.');
  return { adId: id, url: publicAdLink(id) };
}
