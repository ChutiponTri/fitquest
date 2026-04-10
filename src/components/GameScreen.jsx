import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useCamera } from '../hooks/useCamera'
import { usePoseDetector } from '../hooks/usePoseDetector'
import { HRMonitor } from './HRMonitor'
import { ExerciseCard } from './ExerciseCard'
import { EXERCISES } from '../utils/poseDetection'
import { simulateHR, HR_REST } from '../utils/hrCalc'

const COUNTDOWN_SECONDS = 3
const REST_SECONDS = 5

function useLayout() {
  const get = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    return { mobile: w < 700, portrait: h > w, w, h }
  }
  const [layout, setLayout] = useState(get)
  useEffect(() => {
    const handler = () => setLayout(get())
    window.addEventListener('resize', handler)
    window.addEventListener('orientationchange', handler)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('orientationchange', handler)
    }
  }, [])
  return layout
}

export function GameScreen({ playerConfig, onComplete }) {
  const { age, name } = playerConfig
  const canvasRef = useRef(null)
  const { videoRef, cameraReady, cameraError } = useCamera()
  const { mobile: isMobile, portrait } = useLayout()

  const [gamePhase, setGamePhase] = useState('countdown')
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [repCounts, setRepCounts] = useState({})
  const [restTimer, setRestTimer] = useState(REST_SECONDS)
  const [hr, setHr] = useState(HR_REST)
  const [feedback, setFeedback] = useState('')
  const [feedbackFlash, setFeedbackFlash] = useState(false)
  const [results, setResults] = useState({})
  const [showExList, setShowExList] = useState(false)

  const poseStateRef = useRef({})
  const gamePhaseRef = useRef('countdown')
  const currentExIdxRef = useRef(0)

  gamePhaseRef.current = gamePhase
  currentExIdxRef.current = currentExIdx

  const currentEx = EXERCISES[currentExIdx]
  const currentReps = repCounts[currentEx?.id] || 0
  const repProgress = Math.min(100, (currentReps / (currentEx?.targetReps || 1)) * 100)

  // HR simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setHr(prev => {
        const isActive = gamePhaseRef.current === 'active'
        const ex = EXERCISES[currentExIdxRef.current]
        return simulateHR(prev, isActive, ex?.intensity || 0.5, 0.1)
      })
    }, 300)
    return () => clearInterval(interval)
  }, [])

  // Countdown
  useEffect(() => {
    if (gamePhase !== 'countdown') return
    if (countdown <= 0) { setGamePhase('active'); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [gamePhase, countdown])

  // Rest timer
  useEffect(() => {
    if (gamePhase !== 'rest') return
    if (restTimer <= 0) {
      const nextIdx = currentExIdx + 1
      if (nextIdx >= EXERCISES.length) {
        setGamePhase('done')
      } else {
        setCurrentExIdx(nextIdx)
        poseStateRef.current = {}
        setGamePhase('active')
        setRestTimer(REST_SECONDS)
      }
      return
    }
    const t = setTimeout(() => setRestTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [gamePhase, restTimer, currentExIdx])

  // Pose callback
  const handlePose = useCallback((landmarks) => {
    if (gamePhaseRef.current !== 'active') return
    const exIdx = currentExIdxRef.current
    const ex = EXERCISES[exIdx]
    if (!ex || !landmarks) return

    const prevState = poseStateRef.current[ex.id] || {}
    const result = ex.detect(landmarks, prevState)
    poseStateRef.current[ex.id] = result

    if (result.feedback) setFeedback(result.feedback)

    const newCount = result.count || 0
    setRepCounts(prev => {
      const prevCount = prev[ex.id] || 0
      if (newCount > prevCount) {
        setFeedbackFlash(true)
        setTimeout(() => setFeedbackFlash(false), 300)
        const updated = { ...prev, [ex.id]: newCount }
        if (newCount >= ex.targetReps) {
          setResults(r => ({ ...r, [ex.id]: { count: newCount } }))
          if (exIdx + 1 >= EXERCISES.length) {
            setTimeout(() => setGamePhase('done'), 800)
          } else {
            setTimeout(() => { setGamePhase('rest'); setRestTimer(REST_SECONDS) }, 600)
          }
        }
        return updated
      }
      return prev
    })
  }, [])

  const { status: detectorStatus } = usePoseDetector(videoRef, canvasRef, handlePose)

  const skipExercise = () => {
    setResults(prev => ({ ...prev, [currentEx.id]: { count: currentReps } }))
    if (currentExIdx + 1 >= EXERCISES.length) {
      setGamePhase('done')
    } else {
      setCurrentExIdx(c => c + 1)
      poseStateRef.current = {}
      setGamePhase('rest')
      setRestTimer(REST_SECONDS)
    }
  }

  useEffect(() => {
    if (gamePhase === 'done') {
      const finalResults = { ...results }
      EXERCISES.forEach(ex => {
        if (!finalResults[ex.id]) finalResults[ex.id] = { count: repCounts[ex.id] || 0 }
      })
      setTimeout(() => onComplete(finalResults), 1200)
    }
  }, [gamePhase])

  useEffect(() => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) return
    const resize = () => {
      if (!videoRef.current || !canvasRef.current) return
      canvasRef.current.width = videoRef.current.videoWidth || 640
      canvasRef.current.height = videoRef.current.videoHeight || 480
    }
    videoRef.current.addEventListener('loadedmetadata', resize)
    resize()
  }, [cameraReady])

  // ── Camera pane ────────────────────────────────────────────────────────────
  const cameraPane = (
    <div style={{
      position: 'relative', background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      // Desktop: flex fills remaining space; Mobile landscape: ~56vw; Mobile portrait: ~62vh
      ...(isMobile
        ? portrait
          ? { width: '100%', height: '62vh', flexShrink: 0 }
          : { width: '100%', height: '56vw', minHeight: 180, flexShrink: 0 }
        : { flex: 1 })
    }}>
      <video
        ref={videoRef} autoPlay playsInline muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', opacity: cameraReady ? 1 : 0, transition: 'opacity 0.5s' }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', pointerEvents: 'none' }}
      />

      {/* Camera loading */}
      {!cameraReady && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', color: 'var(--text-muted)' }}>
          {cameraError ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📷</div>
              <div style={{ fontSize: 12, color: '#ff5252', textAlign: 'center', maxWidth: 240, padding: '0 16px' }}>{cameraError}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>Allow camera access and reload</div>
            </>
          ) : (
            <>
              <div style={{ width: 32, height: 32, border: '3px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 10 }} />
              <div style={{ fontSize: 13 }}>Starting camera…</div>
            </>
          )}
        </div>
      )}

      {/* AI loading banner */}
      {detectorStatus === 'loading' && cameraReady && (
        <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.72)', borderRadius: 20, padding: '4px 14px', fontSize: 11, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
          <div style={{ width: 10, height: 10, border: '2px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Loading AI pose detection…
        </div>
      )}

      {/* Countdown */}
      {gamePhase === 'countdown' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,10,20,0.72)' }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--accent-cyan)', marginBottom: 8, textTransform: 'uppercase' }}>Get Ready</div>
          <div style={{ fontSize: isMobile ? (portrait ? 100 : 80) : 130, fontWeight: 900, fontFamily: 'var(--font-mono)', color: countdown <= 1 ? '#aaff00' : 'var(--accent-cyan)', lineHeight: 1 }}>
            {countdown > 0 ? countdown : 'GO!'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>{currentEx?.name}</div>
        </div>
      )}

      {/* Rest */}
      {gamePhase === 'rest' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,10,20,0.85)' }}>
          <div style={{ fontSize: 44 }}>💧</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#00e676', marginTop: 4 }}>Rest</div>
          <div style={{ fontSize: 52, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{restTimer}s</div>
          {currentExIdx + 1 < EXERCISES.length && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              Next: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{EXERCISES[currentExIdx + 1]?.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Done */}
      {gamePhase === 'done' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,10,20,0.9)' }}>
          <div style={{ fontSize: 64, animation: 'float 1s ease-in-out infinite' }}>🏆</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-lime)', marginTop: 8 }}>COMPLETE!</div>
        </div>
      )}

      {/* Rep flash border */}
      {feedbackFlash && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `${currentEx?.color || '#00e5ff'}22`, border: `3px solid ${currentEx?.color || '#00e5ff'}` }} />
      )}

      {/* Corner decorations */}
      {['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map(c => (
        <div key={c} style={{
          position: 'absolute',
          top: c.includes('top') ? 10 : 'auto', bottom: c.includes('bottom') ? 10 : 'auto',
          left: c.includes('Left') ? 10 : 'auto', right: c.includes('Right') ? 10 : 'auto',
          width: 20, height: 20,
          borderTop: c.includes('top') ? `2px solid ${currentEx?.color || 'var(--accent-cyan)'}` : 'none',
          borderBottom: c.includes('bottom') ? `2px solid ${currentEx?.color || 'var(--accent-cyan)'}` : 'none',
          borderLeft: c.includes('Left') ? `2px solid ${currentEx?.color || 'var(--accent-cyan)'}` : 'none',
          borderRight: c.includes('Right') ? `2px solid ${currentEx?.color || 'var(--accent-cyan)'}` : 'none',
          opacity: 0.5, pointerEvents: 'none'
        }} />
      ))}

      {/* Feedback bubble */}
      {feedback && gamePhase === 'active' && (
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', border: `1px solid ${currentEx?.color || 'var(--accent-cyan)'}55`, borderRadius: 20, padding: '5px 16px', fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', fontWeight: 600 }}>
          {feedback}
        </div>
      )}

      {/* AI tracking dot */}
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: '3px 10px', fontSize: 10, whiteSpace: 'nowrap' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: detectorStatus === 'ready' ? '#00e676' : detectorStatus === 'loading' ? '#ffea00' : '#ff5252', animation: detectorStatus === 'ready' ? 'pulse-ring 1.5s ease-in-out infinite' : 'none' }} />
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {detectorStatus === 'ready' ? 'AI TRACKING' : detectorStatus === 'loading' ? 'LOADING' : 'ERROR'}
        </span>
      </div>
    </div>
  )

  // ── Mobile HUD strip ───────────────────────────────────────────────────────
  // portrait = stacked with bigger rep counter + exercise list always visible
  // landscape = compact single bar with collapsible list
  const mobileHUD = portrait ? (
    // ── Portrait HUD ──────────────────────────────────────────────────────────
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-card)', minHeight: 0 }}>
      {/* HR + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,82,82,0.12)', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 8, padding: '6px 12px' }}>
          <span style={{ fontSize: 14, color: '#ff5252', animation: 'pulse-ring 1s ease-in-out infinite' }}>♥</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: '#ff5252' }}>{Math.round(hr)}</span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>bpm</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-cyan)' }}>{name}</span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Age {age}</span>
      </div>

      {/* Big rep counter + exercise name */}
      {currentEx && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: `${currentEx.color}08`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>{currentEx.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: currentEx.color }}>{currentEx.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentEx.description}</div>
            </div>
            {/* Big rep counter */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 900, color: currentEx.color, lineHeight: 1 }}>{currentReps}</span>
              <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>/{currentEx.targetReps}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${repProgress}%`, background: `linear-gradient(90deg, ${currentEx.color}88, ${currentEx.color})`, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          {/* Cues */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {currentEx.cues.map((cue, i) => (
              <span key={i} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 3, alignItems: 'center' }}>
                <span style={{ color: currentEx.color }}>›</span>{cue}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Exercise list — always visible in portrait, scrollable */}
      <div style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {EXERCISES.map((ex, i) => (
          <ExerciseCard key={ex.id} exercise={ex}
            isActive={i === currentExIdx && gamePhase === 'active'}
            isComplete={(repCounts[ex.id] || 0) >= ex.targetReps}
            repCount={repCounts[ex.id] || 0}
          />
        ))}
      </div>

      {/* Skip */}
      {(gamePhase === 'active' || gamePhase === 'rest') && (
        <div style={{ padding: '8px 12px', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
          <button onClick={skipExercise} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-dim)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--font-main)', cursor: 'pointer' }}>
            Skip exercise →
          </button>
        </div>
      )}
    </div>
  ) : (
    // ── Landscape HUD (compact single bar) ────────────────────────────────────
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-card)', minHeight: 0 }}>
      {/* Top bar: HR + current exercise + menu toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {/* HR pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,82,82,0.12)', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 8, padding: '5px 10px', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: '#ff5252' }}>♥</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#ff5252' }}>{Math.round(hr)}</span>
        </div>

        {/* Exercise + reps */}
        {currentEx && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{currentEx.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: currentEx.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentEx.name}</div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, marginTop: 2 }}>
                <div style={{ height: '100%', width: `${repProgress}%`, background: currentEx.color, borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 900, color: currentEx.color, flexShrink: 0 }}>
              {currentReps}<span style={{ fontSize: 10, color: 'var(--text-dim)' }}>/{currentEx.targetReps}</span>
            </div>
          </div>
        )}

        {/* List toggle */}
        <button
          onClick={() => setShowExList(v => !v)}
          style={{ flexShrink: 0, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-muted)', padding: '5px 9px', fontSize: 13, cursor: 'pointer' }}
        >
          {showExList ? '✕' : '☰'}
        </button>
      </div>

      {/* Collapsible exercise list */}
      {showExList && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flexShrink: 0 }}>
          {EXERCISES.map((ex, i) => (
            <ExerciseCard key={ex.id} exercise={ex}
              isActive={i === currentExIdx && gamePhase === 'active'}
              isComplete={(repCounts[ex.id] || 0) >= ex.targetReps}
              repCount={repCounts[ex.id] || 0}
            />
          ))}
        </div>
      )}

      {/* Cues row */}
      {currentEx && gamePhase === 'active' && !showExList && (
        <div style={{ padding: '6px 12px', display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
          {currentEx.cues.map((cue, i) => (
            <span key={i} style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 3, alignItems: 'center' }}>
              <span style={{ color: currentEx.color }}>›</span>{cue}
            </span>
          ))}
        </div>
      )}

      {/* Skip */}
      {(gamePhase === 'active' || gamePhase === 'rest') && (
        <div style={{ padding: '6px 10px', marginTop: 'auto', flexShrink: 0 }}>
          <button onClick={skipExercise} style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-dim)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--font-main)', cursor: 'pointer' }}>
            Skip exercise →
          </button>
        </div>
      )}
    </div>
  )

  // ── Desktop right panel ────────────────────────────────────────────────────
  const desktopPanel = (
    <div style={{ width: 300, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(0,229,255,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2 }}>PLAYER</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-cyan)' }}>{name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2 }}>AGE</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{age}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <HRMonitor hr={hr} age={age} />
      </div>

      {currentEx && gamePhase === 'active' && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: `${currentEx.color}08` }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>Now Active</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 28 }}>{currentEx.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: currentEx.color, fontSize: 16 }}>{currentEx.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentEx.description}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: 48, fontWeight: 900, fontFamily: 'var(--font-mono)', color: currentEx.color, lineHeight: 1 }}>{currentReps}</span>
            <span style={{ fontSize: 16, color: 'var(--text-dim)' }}>/ {currentEx.targetReps}</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${currentEx.color}88, ${currentEx.color})`, width: `${repProgress}%`, transition: 'width 0.4s' }} />
          </div>
          <div style={{ marginTop: 10 }}>
            {currentEx.cues.map((cue, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 0', display: 'flex', gap: 6 }}>
                <span style={{ color: currentEx.color }}>›</span>{cue}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, padding: '12px 16px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' }}>Exercises</div>
        {EXERCISES.map((ex, i) => (
          <ExerciseCard key={ex.id} exercise={ex}
            isActive={i === currentExIdx && gamePhase === 'active'}
            isComplete={(repCounts[ex.id] || 0) >= ex.targetReps}
            repCount={repCounts[ex.id] || 0}
          />
        ))}
      </div>

      {(gamePhase === 'active' || gamePhase === 'rest') && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <button onClick={skipExercise}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-dim)', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--font-main)', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--text-muted)'; e.target.style.color = 'var(--text-muted)' }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-dim)' }}
          >
            Skip Exercise →
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
      {cameraPane}
      {isMobile ? mobileHUD : desktopPanel}
    </div>
  )
}
