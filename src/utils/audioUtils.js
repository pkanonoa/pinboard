/**
 * Web Audio API Notification Sound Synthesizer
 * Generates a clean, crystal "cling" chime sound without requiring external audio files.
 */

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Plays a pleasant, crystal bell "cling" chime
 */
export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Helper to play a harmonic decaying bell tone
    const playBellTone = (freq, startTime, duration, maxGain) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      // Attack & Exponential Decay
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Primary Bell Chime (E6: ~1318.5 Hz, B6: ~1975.5 Hz)
    playBellTone(1318.51, now, 0.45, 0.18);
    playBellTone(1975.53, now, 0.35, 0.10);

    // Second Sparkling Chime ~90ms later (G#6: ~1661.2 Hz, E7: ~2637 Hz)
    playBellTone(1661.22, now + 0.09, 0.6, 0.22);
    playBellTone(2637.02, now + 0.09, 0.45, 0.12);
  } catch (err) {
    console.warn("Could not play notification chime:", err);
  }
};
