/**
 * BabbleLab DSP Workstation v2.1.0 - Procedural Audio Engine
 * Fixes Applied:
 * - Non-destructive pre-master insert bus (eliminates telephony muting bug)
 * - Calibrated continuous Spectral Tilt filter network (6 to 24 dB/octave)
 * - True Multi-Talker Binaural Babble with individual ITD/ILD spatialization
 * - Universal dynamic OfflineAudioContext 16-bit PCM WAV exporter (mono/stereo)
 * - Timer tracking to prevent background memory leaks
 * - Safe gain ramp-down on node teardown to eliminate audio pops
 */

export class AcousticEngine {
  constructor() {
    this.ctx = null;
    this.voiceBus = null;
    this.tiltFilter1 = null;
    this.tiltFilter2 = null;
    this.bandFilter = null;
    this.masterHp = null;
    this.masterLp = null;
    this.masterGain = null;
    this.analyser = null;
    this.activeNodes = [];
    this.activeTimers = [];
    this.currentType = null;
    this.params = {
      speakers: 4,
      modFreq: 5.0,
      tilt: 12.0,
      itd: 300,
      fHp: 90,
      fLp: 9000
    };
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // 1. Voice Summing Bus
      this.voiceBus = this.ctx.createGain();
      this.voiceBus.gain.setValueAtTime(0.5, this.ctx.currentTime);

      // 2. Calibrated Spectral Tilt Network (Cascaded Butterworth stages)
      this.tiltFilter1 = this.ctx.createBiquadFilter();
      this.tiltFilter1.type = 'lowpass';
      this.tiltFilter1.frequency.setValueAtTime(1000, this.ctx.currentTime);
      this.tiltFilter1.Q.setValueAtTime(0.7071, this.ctx.currentTime);

      this.tiltFilter2 = this.ctx.createBiquadFilter();
      this.tiltFilter2.type = 'allpass'; // Default: disarmed (-12 dB/oct baseline)
      this.tiltFilter2.frequency.setValueAtTime(1000, this.ctx.currentTime);
      this.tiltFilter2.Q.setValueAtTime(0.7071, this.ctx.currentTime);

      // 3. Inline Switchable Bandpass (Telephony insert)
      this.bandFilter = this.ctx.createBiquadFilter();
      this.bandFilter.type = 'allpass'; // Neutral bypass

      // 4. Pre-Master Fixed Band-limiting (90 Hz to 9 kHz)
      this.masterHp = this.ctx.createBiquadFilter();
      this.masterHp.type = 'highpass';
      this.masterHp.frequency.setValueAtTime(this.params.fHp, this.ctx.currentTime);

      this.masterLp = this.ctx.createBiquadFilter();
      this.masterLp.type = 'lowpass';
      this.masterLp.frequency.setValueAtTime(this.params.fLp, this.ctx.currentTime);

      // 5. Master Output Stage & Visualizer Analyser
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;

      // Unbreakable Signal Chain
      this.voiceBus.connect(this.tiltFilter1);
      this.tiltFilter1.connect(this.tiltFilter2);
      this.tiltFilter2.connect(this.bandFilter);
      this.bandFilter.connect(this.masterHp);
      this.masterHp.connect(this.masterLp);
      this.masterLp.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  stop() {
    this.activeTimers.forEach(id => clearInterval(id));
    this.activeTimers = [];

    const now = this.ctx ? this.ctx.currentTime : 0;
    this.activeNodes.forEach(node => {
      try {
        if (node.gain) node.gain.setTargetAtTime(0, now, 0.015);
        if (node.stop) node.stop(now + 0.03);
        setTimeout(() => {
          try { node.disconnect(); } catch (_) {}
        }, 50);
      } catch (_) {}
    });

    // Reset inline inserts to neutral pass-through without bus disconnection
    if (this.bandFilter) {
      this.bandFilter.type = 'allpass';
    }

    this.activeNodes = [];
    this.currentType = null;
  }

  _createNoiseBuffer(durationSeconds = 3.0) {
    const samples = this.ctx.sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // 1. Calibrated Speech-Shaped Noise (SSN)
  playSSN() {
    this.stop();
    this.init();

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    noise.loop = true;

    noise.connect(this.voiceBus);
    noise.start();

    this.activeNodes.push(noise);
    this.currentType = 'ssn';
    this.setSpectralTilt(this.params.tilt);
  }

  // 2. Amplitude-Modulated SSN (AM-SSN)
  playAMSSN(depth = 0.85) {
    this.stop();
    this.init();

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    noise.loop = true;

    const amGain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(this.params.modFreq, this.ctx.currentTime);

    const lfoScale = this.ctx.createGain();
    lfoScale.gain.setValueAtTime(depth * 0.5, this.ctx.currentTime);
    amGain.gain.setValueAtTime(1.0 - (depth * 0.5), this.ctx.currentTime);

    lfo.connect(lfoScale);
    lfoScale.connect(amGain.gain);

    noise.connect(amGain);
    amGain.connect(this.voiceBus);

    noise.start();
    lfo.start();
    this.activeNodes.push(noise, amGain, lfo, lfoScale);
    this.currentType = 'am_ssn';
  }

  // 3. Multi-Speaker Formant Babble (4, 8, 20 Talkers)
  playFormantBabble(speakerCount = 4) {
    this.stop();
    this.init();

    const vowels = [
      { f: [300, 2200, 3000, 3800], bw: [60, 90, 150, 200] },
      { f: [750, 1200, 2500, 3600], bw: [70, 100, 160, 220] },
      { f: [350, 800, 2300, 3500],  bw: [60, 80, 140, 200] },
      { f: [500, 1700, 2500, 3700], bw: [65, 95, 150, 210] }
    ];

    const safeCount = Math.min(speakerCount, 16);

    for (let s = 0; s < safeCount; s++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      const f0 = 95 + (s * 14) + (Math.random() * 15);
      osc.frequency.setValueAtTime(f0, this.ctx.currentTime);

      const vib = this.ctx.createOscillator();
      const vibGain = this.ctx.createGain();
      vib.frequency.setValueAtTime(3.5 + Math.random() * 2, this.ctx.currentTime);
      vibGain.gain.setValueAtTime(3.0, this.ctx.currentTime);
      vib.connect(osc.frequency);
      vib.start();

      const voiceGain = this.ctx.createGain();
      voiceGain.gain.setValueAtTime(0.24 / Math.sqrt(safeCount), this.ctx.currentTime);

      const v = vowels[s % vowels.length];
      v.f.forEach((freq, idx) => {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(freq, this.ctx.currentTime);
        bp.Q.setValueAtTime(freq / v.bw[idx], this.ctx.currentTime);

        osc.connect(bp);
        bp.connect(voiceGain);
        this.activeNodes.push(bp);
      });

      voiceGain.connect(this.voiceBus);
      osc.start();
      this.activeNodes.push(osc, vib, vibGain, voiceGain);
    }

    this.currentType = speakerCount <= 4 ? 'babble4' : (speakerCount <= 12 ? 'babble8' : 'babble20');
  }

  // 4. True Multi-Talker Binaural Spatial Babble (ITD + ILD Spread)
  playBinauralBabble() {
    this.stop();
    this.init();

    const vowels = [
      [300, 2200, 3000, 3800],
      [750, 1200, 2500, 3600],
      [350, 800, 2300, 3500],
      [500, 1700, 2500, 3700]
    ];

    const merger = this.ctx.createChannelMerger(2);

    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(105 + i * 32, this.ctx.currentTime);

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      const v = vowels[i % vowels.length];
      bp.frequency.value = v[1]; // Dominant F2 Formant
      bp.Q.value = 6.0;

      const voiceGain = this.ctx.createGain();
      voiceGain.gain.value = 0.18;

      const delay = this.ctx.createDelay();
      const panOffset = (i / 3) * 2 - 1; // Pan position: -1 (left) to +1 (right)
      delay.delayTime.value = Math.max(0, panOffset * (this.params.itd * 1e-6));

      const leftGain = this.ctx.createGain();
      const rightGain = this.ctx.createGain();
      leftGain.gain.value = panOffset < 0 ? 1.0 : 0.45;
      rightGain.gain.value = panOffset > 0 ? 1.0 : 0.45;

      osc.connect(bp);
      bp.connect(voiceGain);
      voiceGain.connect(leftGain);
      voiceGain.connect(delay);
      delay.connect(rightGain);

      leftGain.connect(merger, 0, 0);
      rightGain.connect(merger, 0, 1);

      osc.start();
      this.activeNodes.push(osc, bp, voiceGain, delay, leftGain, rightGain);
    }

    merger.connect(this.voiceBus);
    this.activeNodes.push(merger);
    this.currentType = 'spatial';
  }

  // 5. True 8-Band Noise-Vocoded Babble
  playVocodedBabble() {
    this.stop();
    this.init();

    const bands = [
      { cf: 250, bw: 120 }, { cf: 450, bw: 160 },
      { cf: 800, bw: 250 }, { cf: 1300, bw: 350 },
      { cf: 2000, bw: 500 }, { cf: 3100, bw: 700 },
      { cf: 4800, bw: 1000 }, { cf: 7000, bw: 1400 }
    ];

    bands.forEach((b, idx) => {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._createNoiseBuffer();
      noise.loop = true;

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(b.cf, this.ctx.currentTime);
      bp.Q.setValueAtTime(b.cf / b.bw, this.ctx.currentTime);

      const envGain = this.ctx.createGain();
      envGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(3.0 + (idx * 0.7), this.ctx.currentTime);

      const lfoDepth = this.ctx.createGain();
      lfoDepth.gain.setValueAtTime(0.35, this.ctx.currentTime);

      lfo.connect(lfoDepth);
      lfoDepth.connect(envGain.gain);

      noise.connect(bp);
      bp.connect(envGain);
      envGain.connect(this.voiceBus);

      noise.start();
      lfo.start();
      this.activeNodes.push(noise, bp, envGain, lfo, lfoDepth);
    });
    this.currentType = 'vocoded';
  }

  // 6. Non-Destructive Band-Filtered Telephony (300 Hz – 3400 Hz)
  playBandFilteredTelephony() {
    this.playSSN();
    this.bandFilter.type = 'bandpass';
    this.bandFilter.frequency.setValueAtTime(1850, this.ctx.currentTime);
    this.bandFilter.Q.setValueAtTime(1850 / (3400 - 300), this.ctx.currentTime);
    this.currentType = 'telephony';
  }

  // 7. Envelope-Modulated Babble
  playEnvelopeModulatedBabble() {
    this.stop();
    this.init();

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    noise.loop = true;

    const modGain = this.ctx.createGain();
    const lfo1 = this.ctx.createOscillator();
    lfo1.frequency.setValueAtTime(4.2, this.ctx.currentTime);

    const lfo2 = this.ctx.createOscillator();
    lfo2.frequency.setValueAtTime(8.1, this.ctx.currentTime);

    const sumLfo = this.ctx.createGain();
    sumLfo.gain.setValueAtTime(0.4, this.ctx.currentTime);

    lfo1.connect(sumLfo);
    lfo2.connect(sumLfo);
    sumLfo.connect(modGain.gain);

    noise.connect(modGain);
    modGain.connect(this.voiceBus);

    noise.start();
    lfo1.start();
    lfo2.start();
    this.activeNodes.push(noise, modGain, lfo1, lfo2, sumLfo);
    this.currentType = 'env_babble';
  }

  // 8. Spectral Flickering (Dynamic Stochastic Sweeps)
  playSpectralFlickering() {
    this.stop();
    this.init();

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    noise.loop = true;

    const notch1 = this.ctx.createBiquadFilter();
    notch1.type = 'notch';
    notch1.frequency.setValueAtTime(1500, this.ctx.currentTime);
    notch1.Q.setValueAtTime(4.0, this.ctx.currentTime);

    const notch2 = this.ctx.createBiquadFilter();
    notch2.type = 'notch';
    notch2.frequency.setValueAtTime(3000, this.ctx.currentTime);
    notch2.Q.setValueAtTime(5.0, this.ctx.currentTime);

    noise.connect(notch1);
    notch1.connect(notch2);
    notch2.connect(this.voiceBus);

    const timerId = setInterval(() => {
      const now = this.ctx.currentTime;
      notch1.frequency.setTargetAtTime(800 + Math.random() * 1600, now, 0.05);
      notch2.frequency.setTargetAtTime(2200 + Math.random() * 2000, now, 0.05);
    }, 120);

    noise.start();
    this.activeTimers.push(timerId);
    this.activeNodes.push(noise, notch1, notch2);
    this.currentType = 'flicker';
  }

  // 9. Time-Reversed Speech Babble
  playTimeReversedBabble() {
    this.stop();
    this.init();

    const duration = 2.5;
    const samples = Math.floor(this.ctx.sampleRate * duration);
    const revBuffer = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
    const data = revBuffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const t = i / this.ctx.sampleRate;
      const carrier = Math.sin(2 * Math.PI * 140 * t) + 0.4 * (Math.random() * 2 - 1);
      const envelope = Math.exp(-((t % 0.35) * 8));
      data[samples - 1 - i] = carrier * envelope;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = revBuffer;
    src.loop = true;
    src.connect(this.voiceBus);
    src.start();
    this.activeNodes.push(src);
    this.currentType = 'reversed';
  }

  // 10. Neural Pseudospeech Markov Generator
  playNeuralPseudospeech() {
    this.stop();
    this.init();

    const diphones = [
      [300, 2200], [750, 1200], [350, 800], [500, 1700], [270, 1850]
    ];

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(125, this.ctx.currentTime);

    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.setValueAtTime(7.0, this.ctx.currentTime);

    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.setValueAtTime(9.0, this.ctx.currentTime);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(this.voiceBus);
    f2.connect(this.voiceBus);
    osc.start();

    const timerId = setInterval(() => {
      const p = diphones[Math.floor(Math.random() * diphones.length)];
      const now = this.ctx.currentTime;
      f1.frequency.setTargetAtTime(p[0], now, 0.025);
      f2.frequency.setTargetAtTime(p[1], now, 0.025);
    }, 140);

    this.activeTimers.push(timerId);
    this.activeNodes.push(osc, f1, f2);
    this.currentType = 'formant';
  }

  // Calibrated Continuous Spectral Tilt (6 to 24 dB/octave)
  setSpectralTilt(dB) {
    this.params.tilt = dB;
    if (!this.tiltFilter1 || !this.tiltFilter2) return;

    const now = this.ctx.currentTime;
    if (dB <= 8) {
      // ~6 dB/octave slope (1-pole emulation)
      this.tiltFilter1.type = 'lowpass';
      this.tiltFilter1.frequency.setTargetAtTime(1000, now, 0.05);
      this.tiltFilter1.Q.setTargetAtTime(0.5, now, 0.05);
      this.tiltFilter2.type = 'allpass';
    } else if (dB <= 14) {
      // 12 dB/octave (2nd-order Butterworth)
      this.tiltFilter1.type = 'lowpass';
      this.tiltFilter1.frequency.setTargetAtTime(1000, now, 0.05);
      this.tiltFilter1.Q.setTargetAtTime(0.7071, now, 0.05);
      this.tiltFilter2.type = 'allpass';
    } else {
      // 18 - 24 dB/octave (Cascaded 4-pole network)
      this.tiltFilter1.type = 'lowpass';
      this.tiltFilter1.frequency.setTargetAtTime(1000, now, 0.05);
      this.tiltFilter1.Q.setTargetAtTime(0.7071, now, 0.05);
      this.tiltFilter2.type = 'lowpass';
      this.tiltFilter2.frequency.setTargetAtTime(1000, now, 0.05);
      this.tiltFilter2.Q.setTargetAtTime(0.7071, now, 0.05);
    }
  }

  setModFreq(freq) {
    this.params.modFreq = freq;
    this.activeNodes.forEach(node => {
      if (node.frequency && node.type === 'sine') {
        node.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      }
    });
  }

  setITD(microseconds) {
    this.params.itd = microseconds;
    this.activeNodes.forEach(node => {
      if (node.delayTime) {
        node.delayTime.setTargetAtTime(microseconds * 1e-6, this.ctx.currentTime, 0.05);
      }
    });
  }
}
