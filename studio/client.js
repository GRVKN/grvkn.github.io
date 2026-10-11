import { createClient } from '@supabase/supabase-js';
import { sessionStorageAdapter } from './integration-core.js';
export const account = { client: null, user: null, provider: null, providers: [], business: null, locations: [], categories: [], ads: [] };
export async function initializeClient() {
  const response = await fetch('/studio/config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Die GRVKN-Verbindung ist noch nicht eingerichtet.');
  const config = await response.json();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl || '') || !config.supabaseAnonKey) throw new Error('Die GRVKN-Verbindung ist noch nicht eingerichtet.');
  account.client = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { storage: sessionStorageAdapter(localStorage), persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return account.client;
}
export function studioOwner() { return account.user.id + ':' + account.provider.business_id; }
export async function refreshProvider() {
  const { data, error } = await account.client.rpc('get_my_studio_access');
  if (error) throw new Error('Die Anbieterfreigabe konnte nicht geprüft werden. Bitte versuche es später erneut.');
  const row = data.find(item => item.business_id === account.provider?.business_id);
  if (!row?.studio_allowed || row.provider_status !== 'active' || row.verification_status !== 'verified' || !['owner','admin','editor'].includes(row.member_role)) throw new Error('Deine Studio-Freigabe ist nicht mehr aktiv. Bitte wende dich an GRVKN.');
  account.provider = row;
}
export function unwrap(result, message = 'Die Aktion konnte nicht gespeichert werden.') { if (result.error) throw new Error(message); return result.data; }
