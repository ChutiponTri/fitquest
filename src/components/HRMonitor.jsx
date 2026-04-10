import React from 'react'
import { getIntensityZone } from '../utils/hrCalc'

export function HRMonitor({ hr, age }) {
  const zone = getIntensityZone(age, hr)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${zone.color}44`,
      borderRadius: 14, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12
    }}>
      {/* Beating heart */}
      <div style={{
        width: 36, height: 36, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 22,
        animation: 'pulse-ring 1s ease-in-out infinite',
        color: zone.color
      }}>
        ♥
      </div>

      <div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700,
          color: zone.color, lineHeight: 1
        }}>
          {Math.round(hr)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>BPM</div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: zone.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            {zone.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            {Math.round(zone.pct)}%
          </span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: `linear-gradient(90deg, ${zone.color}88, ${zone.color})`,
            width: `${Math.min(100, Math.max(0, zone.pct))}%`,
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>
    </div>
  )
}
