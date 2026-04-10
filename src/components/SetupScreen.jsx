import React, { useState } from 'react'
import { calcHRMax, calcHRR, calcModerateZone } from '../utils/hrCalc'
import { EXERCISES } from '../utils/poseDetection'

export function SetupScreen({ onStart }) {
  const [age, setAge] = useState(30)
  const [name, setName] = useState('')

  const hrMax = calcHRMax(age)
  const hrr = calcHRR(age)
  const zone = calcModerateZone(age)

  return (
    <div style={{
      width: '100%', height: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-deep)', position: 'relative', overflow: 'hidden'
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(rgba(0,229,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        animation: 'slide-in-up 1s ease'
      }} />

      {/* Glowing orbs */}
      <div style={{
        position: 'absolute', top: '10%', left: '5%', width: 300, height: 300,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%', width: 400, height: 400,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(170,255,0,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 700,
        padding: '0 24px', animation: 'slide-in-up 0.6s ease'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontSize: 14, letterSpacing: 6, color: 'var(--accent-cyan)',
            fontFamily: 'var(--font-mono)', marginBottom: 8, textTransform: 'uppercase'
          }}>
            ◈ MOTION HEALTH SYSTEM ◈
          </div>
          <h1 style={{
            fontSize: 72, fontWeight: 900, lineHeight: 1,
            background: 'linear-gradient(135deg, #00e5ff 0%, #aaff00 50%, #ff6b35 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: -2
          }}>
            FITQUEST
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 8 }}>
            AI-Powered Exercise Coach • Pose Detection • Heart Rate Zones
          </p>
        </div>

        {/* Setup Card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
          borderRadius: 20, padding: 32, marginBottom: 24
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Name Input */}
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
                Player Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                style={{
                  width: '100%', background: 'rgba(0,229,255,0.05)',
                  border: '1px solid var(--border-bright)', borderRadius: 10,
                  color: 'var(--text-primary)', padding: '12px 16px',
                  fontSize: 16, outline: 'none', fontFamily: 'var(--font-main)'
                }}
              />
            </div>

            {/* Age Input */}
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
                Age: <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{age}</span>
              </label>
              <input
                type="range" min={10} max={90} value={age}
                onChange={e => setAge(Number(e.target.value))}
                style={{ width: '100%', marginTop: 8, accentColor: 'var(--accent-cyan)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                <span>10</span><span>90</span>
              </div>
            </div>
          </div>

          {/* HR Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 24 }}>
            {[
              { label: 'HR Max', value: hrMax, unit: 'bpm', color: '#ff5252' },
              { label: 'HRR', value: hrr, unit: 'bpm', color: '#ff9800' },
              { label: 'Moderate Zone', value: `${zone.low}–${zone.high}`, unit: 'bpm', color: '#ffea00' }
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 12,
                padding: '16px', textAlign: 'center',
                border: `1px solid ${s.color}22`
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{s.unit}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12, textAlign: 'center' }}>
            Formula: HR Max = 206.9 − (0.67 × age) • Moderate Intensity = 40–59% HRR
          </p>
        </div>

        {/* Exercise Preview */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {EXERCISES.map(ex => (
            <div key={ex.id} style={{
              background: 'var(--bg-card)', border: `1px solid ${ex.color}33`,
              borderRadius: 10, padding: '8px 14px', display: 'flex',
              alignItems: 'center', gap: 6
            }}>
              <span style={{ fontSize: 18 }}>{ex.icon}</span>
              <span style={{ fontSize: 12, color: ex.color, fontWeight: 600 }}>{ex.name}</span>
            </div>
          ))}
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStart({ age, name: name || 'Player' })}
          style={{
            width: '100%', padding: '18px',
            background: 'linear-gradient(135deg, rgba(0,229,255,0.2) 0%, rgba(170,255,0,0.2) 100%)',
            border: '2px solid var(--accent-cyan)',
            borderRadius: 14, color: 'var(--accent-cyan)',
            fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-main)',
            letterSpacing: 3, textTransform: 'uppercase',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={e => {
            e.target.style.background = 'linear-gradient(135deg, rgba(0,229,255,0.35) 0%, rgba(170,255,0,0.35) 100%)'
            e.target.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            e.target.style.background = 'linear-gradient(135deg, rgba(0,229,255,0.2) 0%, rgba(170,255,0,0.2) 100%)'
            e.target.style.transform = 'translateY(0)'
          }}
        >
          ▶ START MISSION
        </button>

        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, marginTop: 16 }}>
          Camera access required • Stand 2–3m from camera • Ensure full body is visible
        </p>
      </div>
    </div>
  )
}
