import React from 'react'
import { EXERCISES } from '../utils/poseDetection'

export function ResultsScreen({ results, playerName, age, onRestart }) {
  const totalReps = Object.values(results).reduce((s, r) => s + (r.count || 0), 0)
  const totalCals = EXERCISES.reduce((s, ex) => {
    const done = results[ex.id]?.count || 0
    return s + Math.round((done / ex.targetReps) * ex.calories)
  }, 0)
  const completedExercises = EXERCISES.filter(ex => (results[ex.id]?.count || 0) >= ex.targetReps).length
  const score = Math.round((completedExercises / EXERCISES.length) * 1000 + totalReps * 5)

  return (
    <div style={{
      width: '100%', minHeight: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-deep)', padding: 24, overflowY: 'auto', position: 'relative'
    }}>
      {/* Stars background */}
      {[...Array(30)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          width: Math.random() > 0.8 ? 3 : 2,
          height: Math.random() > 0.8 ? 3 : 2,
          borderRadius: '50%',
          background: 'rgba(0,229,255,0.4)',
          pointerEvents: 'none'
        }} />
      ))}

      <div style={{ maxWidth: 600, width: '100%', animation: 'slide-in-up 0.6s ease' }}>
        {/* Trophy */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 80, animation: 'float 2s ease-in-out infinite' }}>
            {completedExercises === EXERCISES.length ? '🏆' : completedExercises >= 3 ? '🥈' : '🥉'}
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 900, color: 'var(--accent-cyan)', marginTop: 8 }}>
            MISSION {completedExercises === EXERCISES.length ? 'COMPLETE' : 'DONE'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
            {playerName} • Age {age}
          </p>
        </div>

        {/* Score */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(170,255,0,0.1))',
          border: '1px solid rgba(0,229,255,0.3)', borderRadius: 16,
          padding: '20px 24px', textAlign: 'center', marginBottom: 24
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>Final Score</div>
          <div style={{
            fontSize: 64, fontWeight: 900, fontFamily: 'var(--font-mono)',
            background: 'linear-gradient(135deg, #00e5ff, #aaff00)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            {score.toLocaleString()}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Reps', value: totalReps, icon: '🔄', color: '#00e5ff' },
            { label: 'Calories', value: `~${totalCals}`, icon: '🔥', color: '#ff6b35' },
            { label: 'Exercises', value: `${completedExercises}/${EXERCISES.length}`, icon: '✅', color: '#aaff00' }
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Per-exercise results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {EXERCISES.map(ex => {
            const done = results[ex.id]?.count || 0
            const pct = Math.min(100, (done / ex.targetReps) * 100)
            return (
              <div key={ex.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <span style={{ fontSize: 20 }}>{ex.icon}</span>
                <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>{ex.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#00e676' : ex.color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: pct >= 100 ? '#00e676' : 'var(--text-muted)', minWidth: 40 }}>
                    {done}/{ex.targetReps}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Restart button */}
        <button
          onClick={onRestart}
          style={{
            width: '100%', padding: 16,
            background: 'rgba(0,229,255,0.1)',
            border: '1px solid var(--accent-cyan)',
            borderRadius: 12, color: 'var(--accent-cyan)',
            fontSize: 16, fontWeight: 700, letterSpacing: 2,
            textTransform: 'uppercase', fontFamily: 'var(--font-main)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          ↺ PLAY AGAIN
        </button>
      </div>
    </div>
  )
}
