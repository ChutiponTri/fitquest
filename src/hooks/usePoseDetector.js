import { useEffect, useRef, useState, useCallback } from 'react'

export function usePoseDetector(videoRef, canvasRef, onPose) {
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState(null)
  const detectorRef = useRef(null)
  const animFrameRef = useRef(null)
  const onPoseRef = useRef(onPose)
  onPoseRef.current = onPose

  const drawSkeleton = useCallback((canvas, landmarks) => {
    if (!canvas || !landmarks) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 23], [12, 24], [23, 24],
      [23, 25], [25, 27], [24, 26], [26, 28]
    ]

    // Draw connections
    ctx.lineWidth = 3
    connections.forEach(([a, b]) => {
      const pa = landmarks[a]
      const pb = landmarks[b]
      if (!pa || !pb || pa.visibility < 0.3 || pb.visibility < 0.3) return
      const gradient = ctx.createLinearGradient(pa.x * w, pa.y * h, pb.x * w, pb.y * h)
      gradient.addColorStop(0, 'rgba(0,229,255,0.8)')
      gradient.addColorStop(1, 'rgba(170,255,0,0.8)')
      ctx.strokeStyle = gradient
      ctx.beginPath()
      ctx.moveTo(pa.x * w, pa.y * h)
      ctx.lineTo(pb.x * w, pb.y * h)
      ctx.stroke()
    })

    // Draw joints
    landmarks.forEach((lm, i) => {
      if (!lm || lm.visibility < 0.3) return
      const isKey = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(i)
      ctx.beginPath()
      ctx.arc(lm.x * w, lm.y * h, isKey ? 7 : 4, 0, Math.PI * 2)
      ctx.fillStyle = isKey ? '#00e5ff' : 'rgba(0,229,255,0.4)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }, [])

  useEffect(() => {
    let stopped = false

    async function init() {
      setStatus('loading')
      try {
        const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm')
        const { PoseLandmarker, FilesetResolver } = vision

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        )

        const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        })

        if (stopped) { poseLandmarker.close(); return }
        detectorRef.current = poseLandmarker
        setStatus('ready')

        let lastTime = -1
        function detect() {
          if (stopped) return
          const video = videoRef.current
          if (video && video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime
            const result = poseLandmarker.detectForVideo(video, performance.now())
            if (result.landmarks && result.landmarks.length > 0) {
              const lms = result.landmarks[0]
              drawSkeleton(canvasRef.current, lms)
              onPoseRef.current(lms)
            } else {
              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d')
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
              }
              onPoseRef.current(null)
            }
          }
          animFrameRef.current = requestAnimationFrame(detect)
        }
        animFrameRef.current = requestAnimationFrame(detect)
      } catch (e) {
        if (!stopped) {
          console.error('Pose detector error:', e)
          setError(e.message)
          setStatus('error')
        }
      }
    }

    init()
    return () => {
      stopped = true
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (detectorRef.current) { detectorRef.current.close(); detectorRef.current = null }
    }
  }, [videoRef, canvasRef, drawSkeleton])

  return { status, error }
}
