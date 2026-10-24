import {runwaySceneSeconds} from './core.js';

// Fixed, explicitly selected models. Keep provider validation and this quote in sync.
export function productionQuote(project, mode = 'video', voice = true, {indices = [0,1,2,3], speechReserveMicro = 1_000_000, creditMicro = 10_000} = {}) {
  const imageCount = mode === 'video' && project.visualSource === 'generated' ? indices.length : 0;
  const generatedSeconds = mode === 'video' ? indices.reduce((sum, i) => sum + runwaySceneSeconds(project.scenes?.[i]?.seconds || project.duration / 4), 0) : 0;
  const imageCredits = imageCount * 5, videoCredits = generatedSeconds * 5, credits = imageCredits + videoCredits;
  const reserveMicro = credits * creditMicro + (voice ? speechReserveMicro : 0);
  return {model: mode === 'video' ? 'gen4_turbo' : 'photos', imageModel: imageCount ? 'gen4_image' : null,
    imageCount, imageCredits, videoCredits, generatedSeconds, credits, videoUsd: videoCredits * creditMicro / 1e6,
    imageUsd: imageCredits * creditMicro / 1e6, voiceReserveUsd: voice ? speechReserveMicro / 1e6 : 0,
    reserveMicro, reserveUsd: reserveMicro / 1e6, calls: imageCount + (mode === 'video' ? indices.length : 0) + (voice ? 1 : 0),
    currency: 'USD', musicUsd: 0, excludes: 'Bereits erfolgte Recherche und Planung, Hosting und Steuern', checkedAt: '2026-10-24'};
}
