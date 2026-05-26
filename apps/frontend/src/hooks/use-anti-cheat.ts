import React from 'react'
import { toast } from 'sonner'

export interface AntiCheatState {
  isSecureWindow: boolean
  isScreenShared: boolean
  isCamMicAllowed: boolean
  violations: number
  micLevel: number
  screenStream: MediaStream | null
  userStream: MediaStream | null
}

export function useAntiCheat() {
  const [state, setState] = React.useState<AntiCheatState>({
    isSecureWindow: window.name === 'lex-test-window',
    isScreenShared: false,
    isCamMicAllowed: false,
    violations: 0,
    micLevel: 0,
    screenStream: null,
    userStream: null,
  })

  // Keep refs for immediate access in cleanup/logic, but use state for UI updates
  const screenStreamRef = React.useRef<MediaStream | null>(null)
  const userStreamRef = React.useRef<MediaStream | null>(null)
  const analyserRef = React.useRef<AnalyserNode | null>(null)
  const animationFrameRef = React.useRef<number | null>(null)

  // 1. Request Screen Share
  const requestScreenShare = async () => {
    try {
      console.log('Requesting Screen Share...')
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as any,
        audio: false,
      })

      const track = stream.getVideoTracks()[0]
      if (!track) throw new Error('No video track found')

      const settings = track.getSettings() as any
      if (settings.displaySurface && settings.displaySurface !== 'monitor') {
        stream.getTracks().forEach(t => t.stop())
        toast.error('Please share your ENTIRE screen to continue.')
        return false
      }

      track.onended = () => {
        console.log('Screen share ended by user')
        screenStreamRef.current = null
        setState(prev => ({ ...prev, isScreenShared: false, screenStream: null }))
        toast.error('Screen sharing stopped. Please share your screen again.')
      }

      screenStreamRef.current = stream
      setState(prev => ({ ...prev, isScreenShared: true, screenStream: stream }))
      return true
    } catch (err) {
      console.error('Screen share error:', err)
      toast.error('Failed to share screen. Entire screen sharing is required.')
      return false
    }
  }

  // 2. Request Cam & Mic
  const requestCamMic = async () => {
    try {
      console.log('Requesting Cam/Mic...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: true,
      })

      userStreamRef.current = stream
      setState(prev => ({ ...prev, isCamMicAllowed: true, userStream: stream }))
      setupAudioLevel(stream)
      return true
    } catch (err) {
      console.error('Cam/Mic error:', err)
      toast.error('Camera and Microphone access are required.')
      return false
    }
  }

  // Audio level monitoring
  const setupAudioLevel = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      
      const updateLevel = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setState(prev => ({ ...prev, micLevel: average }))
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }

      updateLevel()
    } catch (err) {
      console.error('Audio analysis error:', err)
    }
  }

  // Monitor violations
  React.useEffect(() => {
    if (!state.isScreenShared || !state.isCamMicAllowed) return

    const handleBlur = () => {
      if (document.visibilityState === 'visible') {
        setState(prev => ({ ...prev, violations: prev.violations + 1 }))
        toast.warning('Warning: Window focus lost.')
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setState(prev => ({ ...prev, violations: prev.violations + 1 }))
        toast.error('Violation: Tab switched!')
      }
    }

    const preventDefault = (e: Event) => e.preventDefault()

    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('copy', preventDefault)
    document.addEventListener('paste', preventDefault)
    document.addEventListener('cut', preventDefault)
    document.addEventListener('contextmenu', preventDefault)

    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('copy', preventDefault)
      document.removeEventListener('paste', preventDefault)
      document.removeEventListener('cut', preventDefault)
      document.removeEventListener('contextmenu', preventDefault)
    }
  }, [state.isScreenShared, state.isCamMicAllowed])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop())
      }
      if (userStreamRef.current) {
        userStreamRef.current.getTracks().forEach(t => t.stop())
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    ...state,
    requestScreenShare,
    requestCamMic,
  }
}
