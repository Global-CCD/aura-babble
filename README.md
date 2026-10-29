# BabbleLab DSP Workstation v2.1.0

A high-performance, single-page web application for procedural acoustic noise and speech babble synthesis, hosted on Cloudflare Pages.

## Verified Enhancements in v2.1.0
- **Non-Destructive Insert Bus:** Fixed pre-master signal chain prevents permanent muting after auditioning the telephony profile.
- **Calibrated Multi-Pole Spectral Tilt:** Cascaded Butterworth stages deliver variable high-frequency rolloff from $-6\text{ dB/oct}$ to $-24\text{ dB/oct}$.
- **Multi-Source Binaural Babble:** 4 independent synthetic formant voices distributed across an ITD/ILD spatial array.
- **Universal Offline WAV Exporter:** Renders whatever profile is active (in calibrated mono or 2-channel stereo) via `OfflineAudioContext`.
- **Graph-Safe Debouncing:** Debounces density slider inputs to prevent main-thread audio pops and buffer underruns.
- **HiDPI/Retina Scope:** Canvas rendering dynamically scales with `devicePixelRatio`.
- **Edge Header Sanitization:** Removed restrictive COEP constraints to allow external CDN scripts to load reliably.

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
