import React from 'react'

export function ExerciseCard({ exercise, isActive, isComplete, repCount, onClick }) {
  const progress = isComplete ? 100 : Math.min(100, (repCount / exercise.targetReps) * 100)

  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? `${exercise.color}15` : 'var(--bg-card)',
        border: `1px solid ${isActive ? exercise.color : isComplete ? exercise.color + '44' : 'var(--border)'}`,
        borderRadius: 14, padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.25s ease',
        transform: isActive ? 'scale(1.02)' : 'scale(1)',
        position: 'relative', overflow: 'hidden'
      }}
    >
      {/* Progress bar background */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        height: 3, width: `${progress}%`,
        background: isComplete
          ? `linear-gradient(90deg, ${exercise.color}, #00e676)`
          : `linear-gradient(90deg, ${exercise.color}88, ${exercise.color})`,
        transition: 'width 0.4s ease'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          fontSize: 24, width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isActive ? `${exercise.color}22` : 'rgba(255,255,255,0.04)',
          borderRadius: 8
        }}>
          {isComplete ? '✓' : exercise.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 13,
            color: isComplete ? '#00e676' : isActive ? exercise.color : 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {exercise.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {repCount}/{exercise.targetReps} reps
          </div>
        </div>

        {isActive && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: exercise.color,
            animation: 'pulse-ring 1s ease-in-out infinite'
          }} />
        )}
      </div>
    </div>
  )
}
