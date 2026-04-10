import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useCamera } from '../hooks/useCamera'
import { usePoseDetector } from '../hooks/usePoseDetector'
import { HRMonitor } from './HRMonitor'
import { ExerciseCard } from './ExerciseCard'
import { EXERCISES } from '../utils/poseDetection'
import { simulateHR, HR_REST } from '../utils/hrCalc'

const COUNTDOWN_SECONDS = 3
const REST_SECONDS = 5

export function GameScreen({ playerConfig, onComplete }) {
  const { age, name } = playerConfig
  const canvasRef = useRef(null)
  const { videoRef, cameraReady, cameraError } = useCamera()

  const [gamePhase, setGamePhase] = useState('countdown') // countdown | active | rest | done
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [poseState, setPoseState] = useState({})
  const [repCounts, setRepCounts] = useState({})
  const [restTimer, setRestTimer] = useState(REST_SECONDS)
  const [hr, setHr] = useState(HR_REST)
  const [feedback, setFeedback] = useState('')
  const [poseStatus, setPoseStatus] = useState('no-pose') // no-pose | detecting | good
  const [feedbackFlash, setFeedbackFlash] = useState(false)
  const [results, setResults] = useState({})

  const poseStateRef = useRef({})
  const gamePhaseRef = useRef('countdown')
  const currentExIdxRef = useRef(0)

  gamePhaseRef.current = gamePhase
  currentExIdxRef.current = currentExIdx

  const currentEx = EXERCISES[currentExIdx]
  const currentReps = repCounts[currentEx?.id] || 0

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
        setResults(prev => ({ ...prev }))
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
    if (!ex || !landmarks) {
      setPoseStatus('no-pose')
      return
    }

    setPoseStatus('detecting')
    const prevState = poseStateRef.current[ex.id] || {}
    const result = ex.detect(landmarks, prevState)

    poseStateRef.current[ex.id] = result

    if (result.feedback) {
      setFeedback(result.feedback)
    }

    const newCount = result.count || 0
    setRepCounts(prev => {
      const prevCount = prev[ex.id] || 0
      if (newCount > prevCount) {
        setFeedbackFlash(true)
        setTimeout(() => setFeedbackFlash(false), 300)
        const updated = { ...prev, [ex.id]: newCount }
        // Check completion
        if (newCount >= ex.targetReps) {
          setResults(r => ({ ...r, [ex.id]: { count: newCount } }))
          if (exIdx + 1 >= EXERCISES.length) {
            setResults(r => ({ ...r, [ex.id]: { count: newCount } }))
            setTimeout(() => setGamePhase('done'), 800)
          } else {
            setTimeout(() => {
              setGamePhase('rest')
              setRestTimer(REST_SECONDS)
            }, 600)
          }
        }
        return updated
      }
      return prev
    })
  }, [])

  const { status: detectorStatus, error: detectorError } = usePoseDetector(videoRef, canvasRef, handlePose)

  // Skip exercise
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

  // Complete -> pass results up
  useEffect(() => {
    if (gamePhase === 'done') {
      const finalResults = { ...results }
      EXERCISES.forEach(ex => {
        if (!finalResults[ex.id]) finalResults[ex.id] = { count: repCounts[ex.id] || 0 }
      })
      setTimeout(() => onComplete(finalResults), 1200)
    }
  }, [gamePhase])

  // Size canvas to match video
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

  const repProgress = Math.min(100, (currentReps / (currentEx?.targetReps || 1)) * 100)

  return (
    <div style={{
      width: '100vw', height: '100vh', background: 'var(--bg-deep)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
    }}>
      {/* Main layout: camera left, controls right */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>

        {/* ── Camera View ──────────────────────────── */}
        <div style={{
          flex: 1, position: 'relative', background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {/* Mirrored video */}
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: 'scaleX(-1)',
              opacity: cameraReady ? 1 : 0, transition: 'opacity 0.5s'
            }}
          />

          {/* Pose skeleton canvas - mirrored */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              transform: 'scaleX(-1)',
              pointerEvents: 'none'
            }}
          />

          {/* Camera loading state */}
          {!cameraReady && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.8)', color: 'var(--text-muted)'
            }}>
              {cameraError ? (
                <>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                  <div style={{ fontSize: 14, color: '#ff5252', textAlign: 'center', maxWidth: 280 }}>
                    Camera Error: {cameraError}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                    Please allow camera access and reload
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    width: 40, height: 40, border: '3px solid var(--accent-cyan)',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', marginBottom: 12
                  }} />
                  <div style={{ fontSize: 14 }}>Starting camera...</div>
                </>
              )}
            </div>
          )}

          {/* Detector loading */}
          {detectorStatus === 'loading' && cameraReady && (
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)', borderRadius: 20, padding: '6px 16px',
              fontSize: 12, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <div style={{
                width: 12, height: 12, border: '2px solid var(--accent-cyan)',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              Loading AI pose detection...
            </div>
          )}

          {/* Countdown overlay */}
          {gamePhase === 'countdown' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(5,10,20,0.7)'
            }}>
              <div style={{ fontSize: 12, letterSpacing: 4, color: 'var(--accent-cyan)', marginBottom: 16, textTransform: 'uppercase' }}>
                Get Ready
              </div>
              <div style={{
                fontSize: 140, fontWeight: 900, fontFamily: 'var(--font-mono)',
                color: countdown <= 1 ? '#aaff00' : 'var(--accent-cyan)',
                animation: 'count-in 0.6s ease',
                key: countdown
              }}>
                {countdown > 0 ? countdown : 'GO!'}
              </div>
              <div style={{ fontSize: 16, color: 'var(--text-muted)', marginTop: 16 }}>
                {currentEx?.name}
              </div>
            </div>
          )}

          {/* Rest overlay */}
          {gamePhase === 'rest' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(5,10,20,0.85)'
            }}>
              <div style={{ fontSize: 60 }}>💧</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#00e676', marginTop: 8 }}>
                Rest Time
              </div>
              <div style={{
                fontSize: 64, fontWeight: 900, fontFamily: 'var(--font-mono)',
                color: 'var(--accent-cyan)', marginTop: 8
              }}>
                {restTimer}s
              </div>
              {currentExIdx + 1 < EXERCISES.length && (
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>
                  Next: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {EXERCISES[currentExIdx + 1]?.name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Done overlay */}
          {gamePhase === 'done' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(5,10,20,0.9)'
            }}>
              <div style={{ fontSize: 80, animation: 'float 1s ease-in-out infinite' }}>🏆</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent-lime)', marginTop: 12 }}>
                COMPLETE!
              </div>
            </div>
          )}

          {/* Rep flash */}
          {feedbackFlash && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `${currentEx?.color || '#00e5ff'}22`,
              border: `3px solid ${currentEx?.color || '#00e5ff'}`,
              borderRadius: 0, transition: 'opacity 0.2s'
            }} />
          )}

          {/* Corner frame decorations */}
          {['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map(corner => (
            <div key={corner} style={{
              position: 'absolute',
              top: corner.includes('top') ? 12 : 'auto',
              bottom: corner.includes('bottom') ? 12 : 'auto',
              left: corner.includes('Left') ? 12 : 'auto',
              right: corner.includes('Right') ? 12 : 'auto',
              width: 30, height: 30,
              borderTop: corner.includes('top') ? `2px solid ${currentEx?.color || 'var(--accent-cyan)'}` : 'none',
              borderBottom: corner.includes('bottom') ? `2px solid ${currentEx?.color || 'var(--accent-cyan)'}` : 'none',
              borderLeft: corner.includes('Left') ? `2px solid ${currentEx?.color || 'var(--accent-cyan)'}` : 'none',
              borderRight: corner.includes('Right') ? `2px solid ${currentEx?.color || 'var(--accent-cyan)'}` : 'none',
              opacity: 0.6, pointerEvents: 'none'
            }} />
          ))}

          {/* Feedback bubble */}
          {feedback && gamePhase === 'active' && (
            <div style={{
              position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.75)', border: `1px solid ${currentEx?.color || 'var(--accent-cyan)'}55`,
              borderRadius: 20, padding: '8px 20px',
              fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap',
              fontWeight: 600
            }}>
              {feedback}
            </div>
          )}

          {/* Pose status indicator */}
          <div style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: '4px 12px',
            fontSize: 11
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: detectorStatus === 'ready' ? '#00e676' : detectorStatus === 'loading' ? '#ffea00' : '#ff5252',
              animation: detectorStatus === 'ready' ? 'pulse-ring 1.5s ease-in-out infinite' : 'none'
            }} />
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {detectorStatus === 'ready' ? 'AI TRACKING' : detectorStatus === 'loading' ? 'LOADING' : 'ERROR'}
            </span>
          </div>
        </div>

        {/* ── Right Panel ──────────────────────────── */}
        <div style={{
          width: 300, background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          padding: 0
        }}>
          {/* Player header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(0,229,255,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2 }}>PLAYER</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-cyan)' }}>{name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2 }}>AGE</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{age}</div>
              </div>
            </div>
          </div>

          {/* HR Monitor */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <HRMonitor hr={hr} age={age} />
          </div>

          {/* Current exercise */}
          {currentEx && gamePhase === 'active' && (
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              background: `${currentEx.color}08`
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>Now Active</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 30 }}>{currentEx.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: currentEx.color, fontSize: 16 }}>{currentEx.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentEx.description}</div>
                </div>
              </div>

              {/* Rep counter */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{
                  fontSize: 48, fontWeight: 900, fontFamily: 'var(--font-mono)',
                  color: currentEx.color, lineHeight: 1
                }}>{currentReps}</span>
                <span style={{ fontSize: 16, color: 'var(--text-dim)' }}>/ {currentEx.targetReps}</span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: `linear-gradient(90deg, ${currentEx.color}88, ${currentEx.color})`,
                  width: `${repProgress}%`, transition: 'width 0.4s ease'
                }} />
              </div>

              {/* Cues */}
              <div style={{ marginTop: 10 }}>
                {currentEx.cues.map((cue, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 0', display: 'flex', gap: 6 }}>
                    <span style={{ color: currentEx.color }}>›</span> {cue}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exercise list */}
          <div style={{ flex: 1, padding: '12px 16px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' }}>Exercises</div>
            {EXERCISES.map((ex, i) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                isActive={i === currentExIdx && gamePhase === 'active'}
                isComplete={(repCounts[ex.id] || 0) >= ex.targetReps}
                repCount={repCounts[ex.id] || 0}
              />
            ))}
          </div>

          {/* Skip button */}
          {(gamePhase === 'active' || gamePhase === 'rest') && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={skipExercise}
                style={{
                  width: '100%', padding: '10px',
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-dim)',
                  fontSize: 12, letterSpacing: 1, textTransform: 'uppercase',
                  fontFamily: 'var(--font-main)', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--text-muted)'; e.target.style.color = 'var(--text-muted)' }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-dim)' }}
              >
                Skip Exercise →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
