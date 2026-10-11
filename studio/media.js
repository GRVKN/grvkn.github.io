import { getSceneAt } from './core.js';

export class ProductionMedia {
  constructor(onFrame = () => {}) { this.videos = []; this.jobId = ''; this.context = null; this.buffer = null; this.audioSource = null; this.loadError = ''; this.playbackError = ''; this.duration = 20; this.onFrame = onFrame; }
  async load(job) {
    if (this.jobId === job.id) return;
    this.reset(); this.jobId = job.id; this.duration = job.snapshot.duration;
    try {
      if (job.mode === 'video') {
        this.videos = await Promise.all(job.scenes.map(scene => new Promise((resolve, reject) => {
          const video = document.createElement('video'); video.crossOrigin = 'anonymous'; video.muted = true; video.playsInline = true; video.preload = 'auto';
          video.addEventListener('seeked', () => this.onFrame());
          const timer = setTimeout(() => reject(new Error('Eine KI-Szene konnte nicht geladen werden. Bitte lade den Auftrag erneut.')), 30_000);
          const fail = () => { clearTimeout(timer); reject(new Error('Dein Browser kann eine KI-Szene nicht abspielen.')); };
          video.addEventListener('error', fail, { once: true });
          video.addEventListener('loadeddata', () => {
            clearTimeout(timer); video.removeEventListener('error', fail);
            if (!video.videoWidth || video.duration + .15 < job.snapshot.scenes[scene.index].seconds) return reject(new Error('Eine KI-Szene ist kürzer als das Storyboard. Bitte prüfe den Anbieterauftrag.'));
            resolve(video);
          }, { once: true });
          video.src = scene.url; video.load();
        })));
      }
      if (job.audio) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        const response = await fetch(job.audio.url, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Der KI-Sprecher konnte nicht geladen werden.');
        this.buffer = await this.context.decodeAudioData(await response.arrayBuffer());
        if (this.buffer.duration > (this.duration - .15) * 1.3) throw new Error('Der Sprechertext ist zu lang für dieses Video. Kürze ihn und erstelle einen neuen Produktionsauftrag.');
      }
    } catch (error) { this.loadError = error.message; throw error; }
  }
  current(scenes, time, playing) {
    if (!this.videos.length) return null;
    const current = getSceneAt(scenes, time), video = this.videos[current.index];
    if (!video || video.readyState < 2) return null;
    const target = Math.min(Math.max(0, time - current.start), Math.max(0, video.duration - .01));
    this.videos.forEach(other => { if (other !== video) other.pause(); });
    if (Math.abs(video.currentTime - target) > (playing ? .2 : .04) && !video.seeking) video.currentTime = target;
    if (playing && video.paused) video.play().catch(() => { this.playbackError = 'Eine KI-Szene konnte nicht abgespielt werden. Bitte lade die Produktion erneut.'; });
    if (!playing) video.pause();
    return video;
  }
  async prepare(scenes) {
    if (this.loadError) throw new Error(this.loadError);
    this.playbackError = '';
    for (const video of this.videos) {
      video.pause();
      if (video.currentTime > .01 || video.readyState < 2) await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { video.removeEventListener('seeked', ready); reject(new Error('Eine KI-Szene konnte nicht zum Anfang gespult werden.')); }, 10_000);
        const ready = () => { clearTimeout(timer); resolve(); };
        video.addEventListener('seeked', ready, { once: true }); video.currentTime = 0;
      });
    }
    if (this.context) await this.context.resume();
  }
  async startAudio(time, destination = null) {
    this.stopAudio();
    if (!this.buffer || !this.context) return;
    await this.context.resume();
    const rate = Math.max(1, this.buffer.duration / Math.max(1, this.duration - .15));
    const source = this.context.createBufferSource(); source.buffer = this.buffer; source.playbackRate.value = rate;
    source.connect(destination || this.context.destination);
    const offset = Math.min(this.buffer.duration, Math.max(0, time) * rate);
    if (offset < this.buffer.duration) { source.start(0, offset); this.audioSource = source; }
  }
  stopAudio() { if (this.audioSource) { try { this.audioSource.stop(); } catch {} this.audioSource.disconnect(); this.audioSource = null; } }
  pause() { this.videos.forEach(video => video.pause()); this.stopAudio(); }
  reset() {
    this.pause(); this.videos.forEach(video => { video.removeAttribute('src'); video.load(); });
    this.videos = []; this.buffer = null; this.jobId = ''; this.loadError = ''; this.playbackError = '';
    if (this.context) this.context.close().catch(() => {}); this.context = null;
  }
}
