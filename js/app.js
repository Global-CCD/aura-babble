/**
 * BabbleLab DSP Workstation v2.1.0 - Application Controller & Universal WAV Exporter
 */

import { AcousticEngine } from './audio-dsp.js';
import { AudioVisualizer } from './visualizer.js';
import { matrixData } from './matrix-data.js';

const engine = new AcousticEngine();
let visualizer = null;
let speakerDebounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Tabulator v6 Grid
  const table = new Tabulator('#matrix-grid', {
    data: matrixData,
    layout: 'fitColumns',
    responsiveLayout: 'collapse',
    columns: [
      {
        title: 'Signal Designation',
        field: 'name',
        widthGrow: 2,
        formatter: c => `<strong>${c.getValue()}</strong>`
      },
      { title: 'Spectral Profile', field: 'spectrum', widthGrow: 2 },
      {
        title: 'Masking Characteristic',
        field: 'masking',
        formatter: c => `<span class="badge badge-active">${c.getValue()}</span>`
      },
      { title: 'Naturalness / Load', field: 'naturalness' },
      { title: 'Typical Use Case', field: 'use', widthGrow: 2 },
      {
        title: 'Action',
        headerSort: false,
        width: 110,
        formatter: () => `<button class="outline btn-audition">▶ Audition</button>`,
        cellClick: (e, cell) => {
          const row = cell.getRow().getData();
          dispatchSignal(row.id);
        }
      }
    ]
  });

  // 2. Audio Dispatcher
  function dispatchSignal(id) {
    engine.init();
    if (!visualizer) {
      visualizer = new AudioVisualizer(engine.analyser, 'scope-canvas', 'fft-canvas');
      visualizer.start();
    }

    const badge = document.getElementById('active-status-badge');
    badge.className = 'badge badge-active';
    badge.innerText = `Active: ${id.toUpperCase()}`;

    document.getElementById('btn-stop-engine').disabled = false;
    document.getElementById('btn-power').innerText = '⏸ Switch Source';

    switch (id) {
      case 'ssn': engine.playSSN(); break;
      case 'babble4': engine.playFormantBabble(4); break;
      case 'babble8': engine.playFormantBabble(10); break;
      case 'babble20': engine.playFormantBabble(20); break;
      case 'am_ssn': engine.playAMSSN(0.85); break;
      case 'formant': engine.playNeuralPseudospeech(); break;
      case 'env_babble': engine.playEnvelopeModulatedBabble(); break;
      case 'flicker': engine.playSpectralFlickering(); break;
      case 'spatial': engine.playBinauralBabble(); break;
      case 'vocoded': engine.playVocodedBabble(); break;
      case 'telephony': engine.playBandFilteredTelephony(); break;
      case 'reversed': engine.playTimeReversedBabble(); break;
      case 'scrambled': engine.playNeuralPseudospeech(); break;
      default: engine.playSSN(); break;
    }
  }

  // 3. Transport Listeners
  document.getElementById('btn-power').addEventListener('click', () => {
    engine.init();
    dispatchSignal('babble4');
  });

  document.getElementById('btn-stop-engine').addEventListener('click', () => {
    engine.stop();
    const badge = document.getElementById('active-status-badge');
    badge.className = 'badge badge-secondary';
    badge.innerText = 'Engine: Offline';
    document.getElementById('btn-stop-engine').disabled = true;
    document.getElementById('btn-power').innerText = '▶ Start Master Engine';
  });

  // 4. Parameter Rack Listeners with Graph-Safe Debouncing
  const speakersSlider = document.getElementById('ctrl-speakers');
  speakersSlider.addEventListener('input', e => {
    const val = parseInt(e.target.value);
    document.getElementById('val-speakers').innerText = `${val} Talkers`;
    engine.params.speakers = val;

    clearTimeout(speakerDebounceTimer);
    speakerDebounceTimer = setTimeout(() => {
      if (engine.currentType && engine.currentType.includes('babble')) {
        engine.playFormantBabble(val);
      }
    }, 60);
  });

  const tiltSlider = document.getElementById('ctrl-tilt');
  tiltSlider.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    document.getElementById('val-tilt').innerText = `-${val.toFixed(1)} dB/oct`;
    engine.setSpectralTilt(val);
  });

  const modSlider = document.getElementById('ctrl-mod');
  modSlider.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    document.getElementById('val-mod').innerText = `${val.toFixed(1)} Hz`;
    engine.setModFreq(val);
  });

  const itdSlider = document.getElementById('ctrl-itd');
  itdSlider.addEventListener('input', e => {
    const val = parseInt(e.target.value);
    document.getElementById('val-itd').innerText = `±${val} μs`;
    engine.setITD(val);
  });

  // 5. Universal Dynamic OfflineAudioContext 16-Bit WAV Exporter
  const exportBtn = document.getElementById('btn-export-wav');
  exportBtn.addEventListener('click', async () => {
    if (!engine.currentType) {
      alert('Please start or audition an acoustic signal before exporting.');
      return;
    }

    exportBtn.setAttribute('aria-busy', 'true');
    exportBtn.innerText = 'Rendering Calibrated WAV...';

    const duration = 3.0;
    const sampleRate = 44100;
    const isStereo = engine.currentType === 'spatial';
    const channels = isStereo ? 2 : 1;
    const offlineCtx = new OfflineAudioContext(channels, sampleRate * duration, sampleRate);

    // Build Offline Signal Chain
    const hp = offlineCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = engine.params.fHp;

    const lp = offlineCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1000;
    lp.Q.value = 0.7071;

    hp.connect(lp);
    lp.connect(offlineCtx.destination);

    if (isStereo) {
      const merger = offlineCtx.createChannelMerger(2);
      for (let i = 0; i < 4; i++) {
        const osc = offlineCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 105 + i * 32;

        const bp = offlineCtx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1200 + i * 250;

        const delay = offlineCtx.createDelay();
        const panOffset = (i / 3) * 2 - 1;
        delay.delayTime.value = Math.max(0, panOffset * (engine.params.itd * 1e-6));

        osc.connect(bp);
        if (panOffset < 0) {
          bp.connect(merger, 0, 0);
        } else {
          bp.connect(delay);
          delay.connect(merger, 0, 1);
        }

        osc.start();
        osc.stop(duration);
      }
      merger.connect(hp);
    } else {
      const noiseSamples = sampleRate * duration;
      const noiseBuffer = offlineCtx.createBuffer(1, noiseSamples, sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseSamples; i++) data[i] = Math.random() * 2 - 1;

      const noiseSrc = offlineCtx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;

      if (engine.currentType === 'am_ssn') {
        const amGain = offlineCtx.createGain();
        const lfo = offlineCtx.createOscillator();
        lfo.frequency.value = engine.params.modFreq;

        const scale = offlineCtx.createGain();
        scale.gain.value = 0.425;
        amGain.gain.value = 0.575;

        lfo.connect(scale);
        scale.connect(amGain.gain);
        noiseSrc.connect(amGain);
        amGain.connect(hp);
        lfo.start();
        lfo.stop(duration);
      } else {
        noiseSrc.connect(hp);
      }

      noiseSrc.start();
      noiseSrc.stop(duration);
    }

    const rendered = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWavBlob(rendered, channels);
    const url = URL.createObjectURL(wavBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `babblelab-${engine.currentType}-${Date.now()}.wav`;
    downloadLink.click();
    URL.revokeObjectURL(url);

    exportBtn.removeAttribute('aria-busy');
    exportBtn.innerText = '⬇ Export Calibrated WAV';
  });
});

// Helper: Multi-Channel 16-Bit PCM WAV Serializer
function audioBufferToWavBlob(buffer, numChannels) {
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const ab = new ArrayBuffer(bufferLength);
  const view = new DataView(ab);

  function writeStr(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLength, true);

  const channelsData = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelsData.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channelsData[ch][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}
