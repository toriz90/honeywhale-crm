// "Ding" corto generado con Web Audio API (sin assets binarios).
// Dos tonos descendentes tipo notificación.

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function reproducirDing(): void {
  const ctx = getCtx();
  if (!ctx) return;

  const ahora = ctx.currentTime;
  const tonos = [
    { freq: 880, start: 0, dur: 0.15 },
    { freq: 1320, start: 0.12, dur: 0.2 },
  ];

  for (const t of tonos) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = t.freq;
    gain.gain.setValueAtTime(0, ahora + t.start);
    gain.gain.linearRampToValueAtTime(0.15, ahora + t.start + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ahora + t.start + t.dur,
    );
    osc.connect(gain).connect(ctx.destination);
    osc.start(ahora + t.start);
    osc.stop(ahora + t.start + t.dur + 0.02);
  }
}
