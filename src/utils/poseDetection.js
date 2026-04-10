// MediaPipe Pose landmark indices
export const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28
}

export function getAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((radians * 180) / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

export function getMidpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// ─── Exercise detection functions ───────────────────────────────────────────

export function detectMarching(landmarks, prevState) {
  const lKnee = landmarks[LANDMARKS.LEFT_KNEE]
  const rKnee = landmarks[LANDMARKS.RIGHT_KNEE]
  const lHip = landmarks[LANDMARKS.LEFT_HIP]
  const rHip = landmarks[LANDMARKS.RIGHT_HIP]
  const lAnkle = landmarks[LANDMARKS.LEFT_ANKLE]
  const rAnkle = landmarks[LANDMARKS.RIGHT_ANKLE]

  if (!lKnee || !rKnee || !lHip || !rHip) return { detected: false, ...prevState }

  const lKneeAngle = getAngle(lHip, lKnee, lAnkle)
  const rKneeAngle = getAngle(rHip, rKnee, rAnkle)

  const lLifted = lKneeAngle < 140
  const rLifted = rKneeAngle < 140

  let count = prevState.count || 0
  let phase = prevState.phase || 'idle'
  let detected = false

  if (phase === 'idle' || phase === 'down') {
    if (lLifted || rLifted) {
      phase = 'up'
      detected = true
    }
  } else if (phase === 'up') {
    if (!lLifted && !rLifted) {
      phase = 'down'
      count += 1
      detected = true
    }
  }

  return { count, phase, detected, lKneeAngle, rKneeAngle, feedback: lLifted || rLifted ? 'Great lift!' : 'Lift your knee!' }
}

export function detectMiniSquat(landmarks, prevState) {
  return detectSquatGeneric(landmarks, prevState, { minAngle: 120, maxAngle: 170, label: 'mini squat' })
}

export function detectSquat(landmarks, prevState) {
  return detectSquatGeneric(landmarks, prevState, { minAngle: 80, maxAngle: 170, label: 'squat' })
}

function detectSquatGeneric(landmarks, prevState, { minAngle, maxAngle, label }) {
  const lHip = landmarks[LANDMARKS.LEFT_HIP]
  const rHip = landmarks[LANDMARKS.RIGHT_HIP]
  const lKnee = landmarks[LANDMARKS.LEFT_KNEE]
  const rKnee = landmarks[LANDMARKS.RIGHT_KNEE]
  const lAnkle = landmarks[LANDMARKS.LEFT_ANKLE]
  const rAnkle = landmarks[LANDMARKS.RIGHT_ANKLE]

  if (!lHip || !lKnee || !lAnkle) return { detected: false, ...prevState }

  const lAngle = getAngle(lHip, lKnee, lAnkle)
  const rAngle = getAngle(rHip, rKnee, rAnkle)
  const kneeAngle = (lAngle + rAngle) / 2

  let count = prevState.count || 0
  let phase = prevState.phase || 'standing'
  let detected = false

  const isDown = kneeAngle < minAngle + 15
  const isUp = kneeAngle > maxAngle - 10

  if (phase === 'standing' && isDown) {
    phase = 'squatting'
    detected = true
  } else if (phase === 'squatting' && isUp) {
    phase = 'standing'
    count += 1
    detected = true
  }

  const progress = Math.min(100, Math.max(0, ((maxAngle - kneeAngle) / (maxAngle - minAngle)) * 100))
  const feedback = isDown ? '⬆ Stand up!' : kneeAngle < maxAngle - 20 ? '⬇ Deeper!' : 'Good stance'

  return { count, phase, detected, kneeAngle, progress, feedback }
}

export function detectSquatPunch(landmarks, prevState) {
  const squatResult = detectSquatGeneric(landmarks, prevState, { minAngle: 80, maxAngle: 170, label: 'squat' })

  const lWrist = landmarks[LANDMARKS.LEFT_WRIST]
  const rWrist = landmarks[LANDMARKS.RIGHT_WRIST]
  const lShoulder = landmarks[LANDMARKS.LEFT_SHOULDER]
  const rShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER]

  if (!lWrist || !rWrist || !lShoulder) return squatResult

  const lPunch = lWrist.y < lShoulder.y - 0.05
  const rPunch = rWrist.y < rShoulder.y - 0.05

  return {
    ...squatResult,
    punchDetected: lPunch || rPunch,
    feedback: squatResult.phase === 'squatting' ? (lPunch || rPunch ? '👊 Punch!' : 'Punch it!') : squatResult.feedback
  }
}

export function detectSquatKick(landmarks, prevState) {
  const squatResult = detectSquatGeneric(landmarks, prevState, { minAngle: 80, maxAngle: 170, label: 'squat' })

  const lAnkle = landmarks[LANDMARKS.LEFT_ANKLE]
  const rAnkle = landmarks[LANDMARKS.RIGHT_ANKLE]
  const lKnee = landmarks[LANDMARKS.LEFT_KNEE]
  const rKnee = landmarks[LANDMARKS.RIGHT_KNEE]

  if (!lAnkle || !rAnkle || !lKnee) return squatResult

  const lKickAngle = getAngle(landmarks[LANDMARKS.LEFT_HIP], lKnee, lAnkle)
  const rKickAngle = getAngle(landmarks[LANDMARKS.RIGHT_HIP], rKnee, rAnkle)

  const lKick = lKickAngle > 155
  const rKick = rKickAngle > 155

  return {
    ...squatResult,
    kickDetected: lKick || rKick,
    feedback: squatResult.phase === 'squatting' ? (lKick || rKick ? '🦵 Kick!' : 'Kick it out!') : squatResult.feedback
  }
}

// ─── Exercise config ─────────────────────────────────────────────────────────

export const EXERCISES = [
  {
    id: 'marching',
    name: 'Marching',
    icon: '🚶',
    description: 'March in place lifting knees high',
    targetReps: 20,
    calories: 3,
    intensity: 0.4,
    detect: detectMarching,
    cues: ['Stand tall', 'Lift knees to hip height', 'Swing arms naturally'],
    color: '#00e5ff',
    mets: 3.5
  },
  {
    id: 'mini-squat',
    name: 'Mini Squat',
    icon: '🏋',
    description: 'Partial squat — bend knees slightly',
    targetReps: 15,
    calories: 4,
    intensity: 0.5,
    detect: detectMiniSquat,
    cues: ['Feet shoulder-width apart', 'Bend knees 30–45°', 'Keep back straight'],
    color: '#aaff00',
    mets: 4
  },
  {
    id: 'squat',
    name: 'Squat',
    icon: '💪',
    description: 'Full squat — thighs parallel to floor',
    targetReps: 12,
    calories: 6,
    intensity: 0.7,
    detect: detectSquat,
    cues: ['Feet hip-width apart', 'Lower until thighs parallel', 'Keep chest up'],
    color: '#ff9f1c',
    mets: 5
  },
  {
    id: 'squat-punch',
    name: 'Squat + Punch',
    icon: '🥊',
    description: 'Squat then punch at the bottom',
    targetReps: 10,
    calories: 7,
    intensity: 0.75,
    detect: detectSquatPunch,
    cues: ['Squat down', 'Punch forward at the bottom', 'Stand back up'],
    color: '#ff6b35',
    mets: 6
  },
  {
    id: 'squat-kick',
    name: 'Squat + Kick',
    icon: '🦵',
    description: 'Squat then kick forward at the bottom',
    targetReps: 10,
    calories: 8,
    intensity: 0.8,
    detect: detectSquatKick,
    cues: ['Squat down', 'Kick forward at the bottom', 'Return and stand'],
    color: '#a78bfa',
    mets: 7
  }
]
