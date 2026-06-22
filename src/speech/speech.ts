// Text-to-speech service — speaks Romanian via the browser Web Speech API.
//
// Everything sits behind the small `speak()` interface so a higher-quality
// hosted TTS can be swapped in later without touching components.

export interface SpeakOptions {
  /** BCP-47 language tag. Defaults to Romanian. */
  lang?: string
  /** Playback rate (1 = normal, 0.7 = slow). */
  rate?: number
  onStart?: () => void
  onEnd?: () => void
}

export const RATE_NORMAL = 1
export const RATE_SLOW = 0.7

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Voices populate asynchronously in some browsers; warm the list and re-read on
// the `voiceschanged` event.
let voicesWarmed = false
function warmVoices(): void {
  if (voicesWarmed || !isSpeechSupported()) return
  voicesWarmed = true
  window.speechSynthesis.getVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    window.speechSynthesis.getVoices()
  })
}

/** Pick an installed Romanian voice, or null to fall back to the default. */
function pickRomanianVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang?.toLowerCase().startsWith('ro')) ?? null
}

/**
 * Speak `text`. Cancels any in-progress utterance first so taps feel snappy.
 * Always sets `lang` to ro-RO even when no Romanian voice is installed, which
 * nudges multilingual engines toward Romanian phonology.
 */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isSpeechSupported() || !text.trim()) return
  warmVoices()

  const synth = window.speechSynthesis
  synth.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = opts.lang ?? 'ro-RO'
  utterance.rate = opts.rate ?? RATE_NORMAL
  const voice = pickRomanianVoice()
  if (voice) utterance.voice = voice
  if (opts.onStart) utterance.onstart = opts.onStart
  if (opts.onEnd) {
    utterance.onend = opts.onEnd
    utterance.onerror = opts.onEnd
  }

  synth.speak(utterance)
}

export function cancelSpeech(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
