let audio: AudioContext | null = null;
let pendingChime = false;

export function playChime() {
  const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  if (!audio) audio = new Context();
  if (audio.state === 'suspended') {
    pendingChime = true;
    return;
  }
  const start = audio.currentTime;
  [784, 1046].forEach((freq, index) => {
    const tone = audio!.createOscillator();
    const level = audio!.createGain();
    tone.type = 'sine';
    tone.frequency.value = freq;
    const at = start + index * 0.09;
    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(0.07, at + 0.02);
    level.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
    tone.connect(level).connect(audio!.destination);
    tone.start(at);
    tone.stop(at + 0.4);
  });
}

export function flushChime() {
  if (!pendingChime || !audio) return;
  pendingChime = false;
  audio.resume().then(playChime).catch(() => undefined);
}