// Speech-recognition service — captures the learner saying a Romanian phrase.
//
// Behind a small interface so a hosted recognizer can replace it later.
// Browser support is uneven, so this module exposes BOTH:
//   1. Live recognition (Chrome/Edge/Android) → transcript for scoring.
//   2. A record-and-listen fallback (iOS Safari/Firefox) → an audio clip the
//      learner can replay next to the model pronunciation and self-mark.
// All audio is processed in the browser and never uploaded or stored.

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionCtor = new () => ISpeechRecognition

interface ISpeechRecognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}

function getRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

export interface Capabilities {
  /** Live speech-to-text is available. */
  stt: boolean
  /** MediaRecorder record-and-listen fallback is available. */
  recorder: boolean
}

export function getCapabilities(): Capabilities {
  const stt = !!getRecognitionCtor()
  const recorder =
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  return { stt, recorder }
}

export type RecognitionError = 'not-allowed' | 'no-speech' | 'unsupported' | 'error'

export interface RecognitionHandle {
  stop: () => void
}

export interface RecognizeCallbacks {
  lang?: string
  onResult: (transcript: string) => void
  onError: (error: RecognitionError) => void
  onEnd?: () => void
}

/**
 * Run one live recognition pass. Returns a handle to stop early, or null when
 * live recognition is unsupported (caller should use the recorder fallback).
 */
export function recognizeOnce(cb: RecognizeCallbacks): RecognitionHandle | null {
  const Ctor = getRecognitionCtor()
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.lang = cb.lang ?? 'ro-RO'
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.continuous = false

  recognition.onresult = (event: any) => {
    const transcript = event?.results?.[0]?.[0]?.transcript ?? ''
    cb.onResult(String(transcript))
  }
  recognition.onerror = (event: any) => {
    const code = event?.error
    if (code === 'not-allowed' || code === 'service-not-allowed') cb.onError('not-allowed')
    else if (code === 'no-speech') cb.onError('no-speech')
    else cb.onError('error')
  }
  recognition.onend = () => cb.onEnd?.()

  try {
    recognition.start()
  } catch {
    cb.onError('error')
    return null
  }
  return { stop: () => recognition.abort() }
}

export interface RecorderHandle {
  /** Stop and resolve an object URL for the recorded audio. */
  stop: () => Promise<string>
  /** Stop and discard. */
  cancel: () => void
}

/**
 * Start recording from the microphone (record-and-listen fallback).
 * Throws `'not-allowed'` if the user denies permission.
 */
export async function startRecording(): Promise<RecorderHandle> {
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    throw new Error('not-allowed')
  }

  const chunks: BlobPart[] = []
  const recorder = new MediaRecorder(stream)
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  recorder.start()

  const stopTracks = () => stream.getTracks().forEach((t) => t.stop())

  return {
    stop: () =>
      new Promise<string>((resolve) => {
        recorder.onstop = () => {
          stopTracks()
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          resolve(URL.createObjectURL(blob))
        }
        recorder.stop()
      }),
    cancel: () => {
      try {
        recorder.stop()
      } catch {
        // already stopped
      }
      stopTracks()
    },
  }
}
