import { useEffect, useRef, useState } from 'react'

export function useCamera() {
  const videoRef = useRef(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(null)

  useEffect(() => {
    let stream = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
            frameRate: { ideal: 30 }
          }
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play()
            setCameraReady(true)
          }
        }
      } catch (e) {
        setCameraError(e.message || 'Camera access denied')
      }
    }

    startCamera()

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop())
      setCameraReady(false)
    }
  }, [])

  return { videoRef, cameraReady, cameraError }
}
