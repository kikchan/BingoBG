import { useEffect, useMemo, useRef, useState } from 'react'

// Constants
const MAX_NUMBER = 90
const DRAW_INTERVAL_MS = 5000

// Helpers
function range(n: number) { return Array.from({ length: n }, (_, i) => i + 1) }
function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

function useBulgarianVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const load = () => {
      const all = window.speechSynthesis.getVoices()
      const bg = all.filter(v => v.lang?.toLowerCase().startsWith('bg'))
      setVoices(bg.length ? bg : all.filter(v => v.lang?.toLowerCase().startsWith('en')))
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])
  return voices
}

const BG_NUM_WORDS: Record<number, string> = {
  0: 'нула', 1: 'едно', 2: 'две', 3: 'три', 4: 'четири', 5: 'пет', 6: 'шест', 7: 'седем', 8: 'осем', 9: 'девет',
  10: 'десет', 11: 'единадесет', 12: 'дванадесет', 13: 'тринадесет', 14: 'четиринадесет', 15: 'петнадесет', 16: 'шестнадесет', 17: 'седемнадесет', 18: 'осемнадесет', 19: 'деветнадесет',
  20: 'двадесет', 30: 'тридесет', 40: 'четиридесет', 50: 'петдесет', 60: 'шестдесет', 70: 'седемдесет', 80: 'осемдесет', 90: 'деветдесет',
}
function numberToBulgarian(n: number): string { if (n <= 20) return BG_NUM_WORDS[n]; if (n % 10 === 0) return BG_NUM_WORDS[n]; const tens = Math.floor(n / 10) * 10; const ones = n % 10; return `${BG_NUM_WORDS[tens]} и ${BG_NUM_WORDS[ones]}` }
function speakBulgarian(text: string, voice?: SpeechSynthesisVoice) { if (!('speechSynthesis' in window)) return; const u = new SpeechSynthesisUtterance(text); u.lang = voice?.lang || 'bg-BG'; if (voice) u.voice = voice; u.rate = 0.95; u.pitch = 1; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u) }

export default function App() {
  // State
  const [order, setOrder] = useState<number[]>(() => shuffle(range(MAX_NUMBER)))
  const [index, setIndex] = useState<number>(-1)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<number | null>(null)
  const voices = useBulgarianVoices()
  const bgVoice = useMemo(() => voices.find(v => v.lang.toLowerCase().startsWith('bg')), [voices])
  const [useBeep] = useState(true)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const numberAudioCache = useRef<Map<number, HTMLAudioElement | null>>(new Map())
  // Tracks number currently loading (optional UI hook)
  // const [loadingNumber, setLoadingNumber] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(Date.now())
  const [progress, setProgress] = useState(0)
  const [selectedInterval, setSelectedInterval] = useState(DRAW_INTERVAL_MS)
  const indexRef = useRef(index)
  const playingRef = useRef(playing)
  const countdownRef = useRef<number | null>(countdown)
  useEffect(() => { indexRef.current = index }, [index])
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { countdownRef.current = countdown }, [countdown])

  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)() } catch { audioCtxRef.current = null }
    }
    return audioCtxRef.current
  }
  function playBeep(duration = 0.15) { const ctx = ensureAudioContext(); if (!ctx) return; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01); o.connect(g); g.connect(ctx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration); o.stop(ctx.currentTime + duration + 0.02) }
  function makeBeepWavBlob(duration = 0.15, freq = 880, sampleRate = 44100) { const length = Math.round(sampleRate * duration); const buffer = new ArrayBuffer(44 + length * 2); const view = new DataView(buffer); const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)) }; ws(0, 'RIFF'); view.setUint32(4, 36 + length * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); ws(36, 'data'); view.setUint32(40, length * 2, true); for (let i = 0; i < length; i++) { const t = i / sampleRate; const sample = Math.max(-1, Math.min(1, Math.sin(2 * Math.PI * freq * t))); const s = Math.floor(sample * 0x7fff); view.setInt16(44 + i * 2, s, true) } return new Blob([view], { type: 'audio/wav' }) }

  useEffect(() => { const blob = makeBeepWavBlob(0.16, 880); const url = URL.createObjectURL(blob); setFallbackUrl(url); return () => URL.revokeObjectURL(url) }, [])

  const drawn = useMemo(() => new Set(order.slice(0, Math.max(0, index + 1))), [order, index])
  const current = index >= 0 ? order[index] : 0

  // Countdown: initialize to 3 if needed and tick every second until first draw
  useEffect(() => {
    if (!playing) return
    if (index >= 0) return
    if (countdown === null) setCountdown(3)
    const id = window.setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          window.clearInterval(id)
          setCountdown(null)
          setIndex(0)
          lastTickRef.current = Date.now()
          setProgress(0)
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [playing, index])

  // Scheduler using chained timeouts; uses refs to avoid stale closures
  useEffect(() => {
    if (!playing) return
    if (countdown !== null) return
    if (index >= MAX_NUMBER - 1) return
    lastTickRef.current = Date.now()
    const schedule = () => {
      timerRef.current = window.setTimeout(() => {
        if (!playingRef.current || countdownRef.current !== null) return
        const cur = indexRef.current
        if (cur >= MAX_NUMBER - 1) return
        setIndex(cur + 1)
        lastTickRef.current = Date.now()
        setProgress(0)
        schedule()
      }, selectedInterval)
    }
    schedule()
    return () => { if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null } }
  }, [playing, countdown, selectedInterval, index])

  // Progress RAF
  useEffect(() => {
    if (!playing) return
    if (countdown !== null) return
    if (index >= MAX_NUMBER - 1) return
    const loop = () => { const elapsed = Date.now() - (lastTickRef.current || Date.now()); const p = Math.min(1, Math.max(0, elapsed / selectedInterval)); setProgress(p); rafRef.current = requestAnimationFrame(loop) }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [playing, countdown, selectedInterval, index])

  // Speak/play on index change
  useEffect(() => {
    if (index < 0) return
    const num = order[index]
    const phrase = numberToBulgarian(num)
    const run = async () => {
      try {
        const played = await playNumberFromBrowser(num)
        if (!played) {
          speakBulgarian(phrase, bgVoice ?? undefined)
          if (useBeep) {
            try { const ctx = ensureAudioContext(); if (ctx && ctx.state === 'suspended') await ctx.resume() } catch { /* ignore resume errors */ }
            try { playBeep(0.14) } catch { if (audioElRef.current) audioElRef.current.play().catch(() => setAudioBlocked(true)) }
          }
        }
      } catch { setAudioBlocked(true) }
    }
    void run()
  }, [index, order, bgVoice, useBeep])

  async function playNumberFromBrowser(n: number): Promise<boolean> {
    const cache = numberAudioCache.current
    if (cache.has(n)) { const el = cache.get(n); if (!el) return false; try { await el.play(); return true } catch { return false } }
    const candidates = [`/bg_numbers_audio/${n}.mp3`, `/bg_numbers_audio/${n}.wav`]
    for (const src of candidates) {
      try {
        const audio = new Audio(src)
        audio.preload = 'auto'
        await new Promise<void>((resolve, reject) => {
          const onErr = () => reject(new Error('load error'))
          audio.addEventListener('canplaythrough', () => resolve(), { once: true })
          audio.addEventListener('error', onErr, { once: true })
          setTimeout(() => reject(new Error('timeout')), 2500)
        })
        numberAudioCache.current.set(n, audio)
        try { await audio.play(); setAudioBlocked(false); return true } catch { return false }
      } catch { continue }
    }
    numberAudioCache.current.set(n, null)
    return false
  }

  function togglePlay() {
    if (index >= MAX_NUMBER - 1) return
    setPlaying(prev => {
      const next = !prev
      // If starting fresh, immediately begin countdown for clear feedback
      if (next && index < 0 && countdown === null) {
        setCountdown(3)
      }
      return next
    })
  }
  function nextOnce() { if (index >= MAX_NUMBER - 1) return; setIndex(i => i + 1) }
  function reset() { setPlaying(false); setOrder(shuffle(range(MAX_NUMBER))); setIndex(-1); window.speechSynthesis?.cancel() }

  return (
    <div className="app">
      <header className="header">
        <div className="title"><span>🎱 Bingo</span><span className="accent">BG</span></div>
        <div className="controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="button" onClick={togglePlay} disabled={index >= MAX_NUMBER - 1}>{playing ? 'Пауза' : 'Старт'}</button>
            <select value={selectedInterval} onChange={e => { const v = Number(e.target.value); setSelectedInterval(v); lastTickRef.current = Date.now(); setProgress(0); if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null } }}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--text)' }}>
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
              <option value={8000}>8s</option>
              <option value={10000}>10s</option>
            </select>
          </div>
          <button className="button secondary" onClick={nextOnce} disabled={playing || index >= MAX_NUMBER - 1}>Следващо</button>
          <button className="button secondary" onClick={reset}>Ново теглене</button>
        </div>
      </header>
      <main className="main">
        <section className="current card">
          {!(index < 0 && countdown === null) && <div className="label">Текущо число</div>}
          {playing && index < 0 && countdown !== null ? (
            <div className="big">{countdown}</div>
          ) : (
            <div className="big">{current || '–'}</div>
          )}
          <div className="progressWrap" aria-hidden><div className="progress" style={{ transform: `scaleX(${progress})` }} /></div>
        </section>
        <section className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ color: audioBlocked ? '#ffb4b4' : 'var(--muted)', fontWeight: 700 }}>{audioBlocked ? 'Аудио статус: ❌' : 'Аудио статус: ✅'}</div>
            {fallbackUrl && (<audio ref={el => (audioElRef.current = el)} src={fallbackUrl} preload="auto" style={{ display: 'none' }} />)}
          </div>
          <div className="grid">
            {range(MAX_NUMBER).map(n => (
              <div key={n} className={`cell ${drawn.has(n) ? 'hit' : ''}`} onClick={async () => { const played = await playNumberFromBrowser(n); if (!played) speakBulgarian(numberToBulgarian(n), bgVoice ?? undefined) }} role="button" title="Кликни, за да чуеш числото">{n}</div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
