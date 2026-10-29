# BabbleLab DSP Workstation v2.2.0

A high-performance single-page application for procedural acoustic noise and speech babble synthesis, hosted on Cloudflare Pages.

## Verified Enhancements in v2.2.0
- **Acoustic Extrema Parity:** Pre-master filter passband broadened ($20\text{ Hz}$ to $20,000\text{ Hz}$), preserving low vocal fry and high dental sibilants.
- **Bipolar Dual-Ear ITD Delay:** Symmetrical delay lines provide true spatialization for both left and right azimuth positions with head-shadow ILD attenuation.
- **Crest-Factor Headroom:** Formant resonators normalized ($0.22 / \sqrt{N}$) to prevent accumulator overflow and digital clipping.
- **Physical Extrema UI Sliders:** Sliders expose full physical ranges ($N=1\text{–}32$, tilt $0\text{–}24\text{ dB/oct}$, $f_m=0\text{–}50\text{ Hz}$, ITD $\pm 600\text{ }\mu\text{s}$).
- **Universal Dynamic WAV Exporter:** Exports mono/stereo 16-bit PCM WAV matching the active signal parameters.
- **Verified Themes:** Incorporates Pico.css v2 Cyan palette and Tabulator Midnight theme.

## Deployment to Cloudflare Pages
```bash
npm install -g wrangler
wrangler login
wrangler pages deploy . --project-name=babblelab-dsp-workstation
```
