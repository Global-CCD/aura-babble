# BabbleLab DSP Workstation v2.0.0

A high-performance, single-page application for procedural acoustic noise and speech babble synthesis, hosted on Cloudflare Pages.

## Verified Features in v2.0.0
- **Corrected LTASS Filters:** Single 2nd-order Butterworth lowpass delivering an exact $-12\text{ dB/octave}$ rolloff above $1\text{ kHz}$.
- **True Noise-Band Vocoder:** 8-band carrier bank shaped by speech envelope modulators.
- **Leak-Free DSP Lifecycle:** Safe timer array (`activeTimers`) prevents background memory leaks.
- **Wired UI Controls:** Real-time parameter rack for spectral tilt, talker density, modulation frequency, and ITD delay.
- **WAV Exporter:** Renders calibrated 16-bit PCM 44.1 kHz WAV files using `OfflineAudioContext`.
- **Dual Visualizer:** Real-time 60 FPS oscilloscope and FFT spectrum analyzer.

## Deployment to Cloudflare Pages

### Option 1: Direct CLI Deployment
```bash
npm install -g wrangler
wrangler login
wrangler pages deploy . --project-name=babblelab-dsp-workstation
```

### Option 2: Git Edge Deployment
Push this directory to a GitHub/GitLab repository and link it to Cloudflare Pages:
- **Build command:** *(Leave empty)*
- **Build output directory:** `.`
