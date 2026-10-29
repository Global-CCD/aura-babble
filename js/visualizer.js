/**
 * BabbleLab DSP Workstation v2.0.0 - Canvas Scope & FFT Visualizer
 */

export class AudioVisualizer {
  constructor(analyser, scopeCanvasId, spectrumCanvasId) {
    this.analyser = analyser;
    this.scopeCanvas = document.getElementById(scopeCanvasId);
    this.spectrumCanvas = document.getElementById(spectrumCanvasId);
    this.scopeCtx = this.scopeCanvas ? this.scopeCanvas.getContext('2d') : null;
    this.spectrumCtx = this.spectrumCanvas ? this.spectrumCanvas.getContext('2d') : null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._render();
  }

  _render() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this._render());

    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);

    this.analyser.getByteTimeDomainData(timeData);
    this.analyser.getByteFrequencyData(freqData);

    // 1. Draw Oscilloscope (Time-Domain)
    if (this.scopeCtx) {
      const w = this.scopeCanvas.width;
      const h = this.scopeCanvas.height;
      this.scopeCtx.fillStyle = '#020617';
      this.scopeCtx.fillRect(0, 0, w, h);

      this.scopeCtx.lineWidth = 1.5;
      this.scopeCtx.strokeStyle = '#38bdf8';
      this.scopeCtx.beginPath();

      const sliceWidth = w / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) this.scopeCtx.moveTo(x, y);
        else this.scopeCtx.lineTo(x, y);
        x += sliceWidth;
      }
      this.scopeCtx.lineTo(w, h / 2);
      this.scopeCtx.stroke();
    }

    // 2. Draw Spectrum Analyzer (Frequency-Domain FFT)
    if (this.spectrumCtx) {
      const w = this.spectrumCanvas.width;
      const h = this.spectrumCanvas.height;
      this.spectrumCtx.fillStyle = '#020617';
      this.spectrumCtx.fillRect(0, 0, w, h);

      const barWidth = (w / bufferLength) * 2.5;
      let barX = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (freqData[i] / 255.0) * h;
        this.spectrumCtx.fillStyle = '#34d399';
        this.spectrumCtx.fillRect(barX, h - barHeight, barWidth, barHeight);
        barX += barWidth + 1;
        if (barX > w) break;
      }
    }
  }
}
