// Web Audio API Synthesizer with High-Volume Alarms & Persistent Profiles

export type NotificationType = 'new_booking' | '30min_reminder' | 'checkin_arrived' | 'shift_start' | 'test';
export type AlarmSoundProfile = 'loud_siren' | 'loud_bell' | 'urgent_alarm' | 'melodic_chime';

export interface SoundConfig {
  volume: number; // 0.1 to 1.0 (default 0.85)
  alarmProfile: AlarmSoundProfile;
  continuousAlarm: boolean; // Keep sounding until dismissed
}

const SOUND_CONFIG_KEY = 'syncbarber_sound_settings';

const DEFAULT_SOUND_CONFIG: SoundConfig = {
  volume: 0.85,
  alarmProfile: 'loud_siren',
  continuousAlarm: false
};

export function getNotificationSoundConfig(): SoundConfig {
  if (typeof window === 'undefined') return DEFAULT_SOUND_CONFIG;
  try {
    const raw = localStorage.getItem(SOUND_CONFIG_KEY);
    if (!raw) return DEFAULT_SOUND_CONFIG;
    return { ...DEFAULT_SOUND_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SOUND_CONFIG;
  }
}

export function saveNotificationSoundConfig(newConfig: Partial<SoundConfig>): SoundConfig {
  const current = getNotificationSoundConfig();
  const updated = { ...current, ...newConfig };
  try {
    localStorage.setItem(SOUND_CONFIG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('syncbarber_sound_config_changed', { detail: updated }));
  } catch (e) {
    console.warn(e);
  }
  return updated;
}

// Active continuous loop tracker
let activeAlarmInterval: any = null;
let activeAudioContext: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];
let isContinuousRinging = false;

export function isAlarmActive(): boolean {
  return isContinuousRinging;
}

export function stopContinuousAlarm(): void {
  isContinuousRinging = false;
  if (activeAlarmInterval) {
    clearInterval(activeAlarmInterval);
    activeAlarmInterval = null;
  }
  activeOscillators.forEach(osc => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {}
  });
  activeOscillators = [];
  window.dispatchEvent(new Event('syncbarber_alarm_stopped'));
}

/**
 * Play a custom synthesized audio chime in the browser.
 * Supports loud volume, customizable sound profiles, and continuous alarm loops.
 */
export function playNotificationSound(
  type: NotificationType = 'new_booking',
  overrideVolume?: number,
  overrideProfile?: AlarmSoundProfile
) {
  if (typeof window === 'undefined') return;

  const config = getNotificationSoundConfig();
  const volumeMultiplier = overrideVolume !== undefined ? overrideVolume : config.volume;
  const profile = overrideProfile || config.alarmProfile;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    // Resume or create AudioContext
    if (!activeAudioContext || activeAudioContext.state === 'closed') {
      activeAudioContext = new AudioContextClass();
    }
    const audioCtx = activeAudioContext;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const playAudioSequence = () => {
      const now = audioCtx.currentTime;

      // 1. LOUD SIREN: High-penetration dual oscillating frequencies for noisy barbershop environments
      if (profile === 'loud_siren' || (type === '30min_reminder' && profile !== 'melodic_chime')) {
        // High impact dual-sweep siren
        const duration = 1.4;
        const cycles = 3;
        
        for (let i = 0; i < cycles; i++) {
          const startTime = now + (i * 0.45);
          
          // Oscillator 1 (Sawtooth for raw cutting presence)
          const osc1 = audioCtx.createOscillator();
          const gain1 = audioCtx.createGain();
          osc1.type = 'sawtooth';
          
          // Frequency sweep 750Hz -> 1350Hz -> 850Hz
          osc1.frequency.setValueAtTime(750, startTime);
          osc1.frequency.exponentialRampToValueAtTime(1350, startTime + 0.2);
          osc1.frequency.exponentialRampToValueAtTime(800, startTime + 0.4);
          
          const maxGain1 = Math.min(1.0, 0.45 * volumeMultiplier);
          gain1.gain.setValueAtTime(maxGain1, startTime);
          gain1.gain.linearRampToValueAtTime(maxGain1, startTime + 0.35);
          gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.42);

          osc1.connect(gain1);
          gain1.connect(audioCtx.destination);
          osc1.start(startTime);
          osc1.stop(startTime + 0.43);
          activeOscillators.push(osc1);

          // Oscillator 2 (Square harmonic for maximum audibility)
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1500, startTime);
          osc2.frequency.exponentialRampToValueAtTime(2200, startTime + 0.2);
          osc2.frequency.exponentialRampToValueAtTime(1400, startTime + 0.4);

          const maxGain2 = Math.min(1.0, 0.25 * volumeMultiplier);
          gain2.gain.setValueAtTime(maxGain2, startTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.42);

          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.start(startTime);
          osc2.stop(startTime + 0.43);
          activeOscillators.push(osc2);
        }
      } 
      // 2. LOUD BELL: Heavy resonant brass church bell chime
      else if (profile === 'loud_bell') {
        const bellFreqs = [523.25, 659.25, 1046.50, 1318.51]; // C5, E5, C6, E6
        bellFreqs.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = idx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now);

          const baseGain = (idx === 0 ? 0.6 : 0.35) * volumeMultiplier;
          gain.gain.setValueAtTime(baseGain, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 1.8);
          activeOscillators.push(osc);
        });
      } 
      // 3. URGENT ALARM: Rapid triple beep sequence
      else if (profile === 'urgent_alarm') {
        [0, 0.25, 0.5, 0.75].forEach((timeOffset) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(980, now + timeOffset);

          const bepGain = Math.min(1.0, 0.4 * volumeMultiplier);
          gain.gain.setValueAtTime(bepGain, now + timeOffset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.18);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + timeOffset);
          osc.stop(now + timeOffset + 0.19);
          activeOscillators.push(osc);
        });
      } 
      // 4. MELODIC CHIME / SHIFT START / CHECKIN
      else {
        if (type === 'shift_start') {
          // Energetic chord sequence
          const notes = [
            { freq: 261.63, time: 0, dur: 0.6, gain: 0.35 },    // C4
            { freq: 329.63, time: 0.1, dur: 0.6, gain: 0.35 },  // E4
            { freq: 392.00, time: 0.2, dur: 0.7, gain: 0.40 },  // G4
            { freq: 523.25, time: 0.35, dur: 0.9, gain: 0.45 }, // C5
            { freq: 783.99, time: 0.5, dur: 1.2, gain: 0.50 }   // G5
          ];
          notes.forEach(({ freq, time, dur, gain: vol }) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + time);
            gain.gain.setValueAtTime(vol * volumeMultiplier, now + time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + time);
            osc.stop(now + time + dur);
            activeOscillators.push(osc);
          });
        } else {
          // Melodic booking chime (C5 -> G5 -> C6)
          const notes = [
            { freq: 523.25, time: 0, dur: 0.35, gain: 0.35 },
            { freq: 783.99, time: 0.12, dur: 0.40, gain: 0.45 },
            { freq: 1046.50, time: 0.25, dur: 0.75, gain: 0.55 }
          ];
          notes.forEach(({ freq, time, dur, gain: vol }) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + time);
            gain.gain.setValueAtTime(vol * volumeMultiplier, now + time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + time);
            osc.stop(now + time + dur);
            activeOscillators.push(osc);
          });
        }
      }
    };

    // Play initial sound
    playAudioSequence();

    // If continuous alarm is enabled and it's a 30-min reminder or new booking
    if (config.continuousAlarm && (type === '30min_reminder' || type === 'new_booking')) {
      stopContinuousAlarm(); // Clear any existing
      isContinuousRinging = true;
      window.dispatchEvent(new CustomEvent('syncbarber_alarm_started', { detail: { type } }));
      
      activeAlarmInterval = setInterval(() => {
        if (!isContinuousRinging) {
          clearInterval(activeAlarmInterval);
          return;
        }
        playAudioSequence();
      }, 2500);
    }
  } catch (e) {
    console.warn("Audio Context playback error:", e);
  }
}
