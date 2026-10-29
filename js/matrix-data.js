/**
 * BabbleLab DSP Workstation v2.1.0 - Acoustic Catalog & Comparative Matrix
 */

export const matrixData = [
  {
    id: 'ssn',
    name: 'Speech-Shaped Noise (SSN)',
    spectrum: 'LTASS calibrated (-12 dB/oct > 1 kHz)',
    masking: 'High Energetic',
    naturalness: 'Low (Stationary)',
    use: 'Audiometric SRT testing & threshold masking'
  },
  {
    id: 'babble4',
    name: 'Classic 4-Speaker Babble',
    spectrum: 'Sparse Formants + Sharp Amplitude Dips',
    masking: 'High Informational + Energetic',
    naturalness: 'High Naturalness / High Load',
    use: 'Speech privacy audits, cognitive workload tests'
  },
  {
    id: 'babble8',
    name: '8–12 Speaker Babble',
    spectrum: 'Intermediate Formant Collision Density',
    masking: 'Balanced Energetic / Informational',
    naturalness: 'Moderate Naturalness / Medium Load',
    use: 'Hearing aid directional microphone tests'
  },
  {
    id: 'babble20',
    name: '20+ Speaker Babble',
    spectrum: 'Quasi-stationary Gaussian Speech Floor',
    masking: 'Predominantly Energetic',
    naturalness: 'Low Semantic Content (Cafeteria)',
    use: 'Standard cocktail-party effect simulation'
  },
  {
    id: 'am_ssn',
    name: 'AM-SSN (4–8 Hz Syllabic)',
    spectrum: 'LTASS with 5 Hz Sinusoidal Modulation',
    masking: 'Fluctuating (Allows Temporal Glimpsing)',
    naturalness: 'Low (Throbbing Mechanical)',
    use: 'Auditory temporal resolution measurement'
  },
  {
    id: 'formant',
    name: 'Formant Pseudospeech (F1–F4)',
    spectrum: 'Dynamic Vocal Tract Resonators (Klatt)',
    masking: 'High (Collides with Competing Formants)',
    naturalness: 'High Phonetic / Zero Semantics',
    use: 'Cross-linguistic speech masking trials'
  },
  {
    id: 'env_babble',
    name: 'Envelope-Modulated Babble',
    spectrum: 'Multi-band Noise Driven by Speech Envelopes',
    masking: 'High Dynamic Masking (No Lexical Leak)',
    naturalness: 'Medium (Whisper/Fricative)',
    use: 'Auditory envelope sensitivity testing'
  },
  {
    id: 'flicker',
    name: 'Spectral Flickering Noise',
    spectrum: 'Stochastic Filter-Bank Frequency Shifts',
    masking: 'Variable Spectro-temporal Gaps',
    naturalness: 'Unnatural (Hopping Resonances)',
    use: 'Auditory profile gap-listening tests'
  },
  {
    id: 'spatial',
    name: 'Binaural Spatial Babble',
    spectrum: 'Multi-Talker ITD (±600μs) + ILD (±4.5dB)',
    masking: 'Spatial Release from Masking (SRM)',
    naturalness: 'Very High (True 3D Externalized)',
    use: 'Binaural hearing aid algorithm verification'
  },
  {
    id: 'vocoded',
    name: 'Vocoded Babble (Noise-Band)',
    spectrum: '8 Sub-Band Noise Carriers + Envelope Follower',
    masking: 'High In-Band; Zero Harmonic Fine Structure',
    naturalness: 'Low (Robotic / Whispered)',
    use: 'Cochlear implant psychoacoustic simulation'
  },
  {
    id: 'telephony',
    name: 'Band-Filtered Babble (Telephony)',
    spectrum: 'Inline 4th-Order Bandpass (300–3400 Hz)',
    masking: 'Confined to Passband; Out-of-band Gaps',
    naturalness: 'Medium (Bandlimited Transducer)',
    use: 'Telecommunications codec intelligibility'
  },
  {
    id: 'reversed',
    name: 'Time-Reversed Babble',
    spectrum: 'Time-Inverted Asymmetric Transients',
    masking: 'High Energetic; Zero Informational',
    naturalness: 'Unnatural (Reversed Dynamics)',
    use: 'Eliminating lexical priming in masker studies'
  },
  {
    id: 'scrambled',
    name: 'Phoneme-Scrambled Streams',
    spectrum: 'Stochastic Diphone/Vowel Markov Transitions',
    masking: 'High Informational (Draws Phonetic Attention)',
    naturalness: 'High Phonetic Realism (Gibberish)',
    use: 'Distraction threshold analysis without language'
  }
];
