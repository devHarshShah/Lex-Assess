import React from 'react'
import { toast } from 'sonner'
import type { SectionRules } from '@/lib/question-papers'

export interface ProctoringEvent {
  type: 'AWAY' | 'RETURN'
  timestamp: string
  durationSeconds?: number
}

export interface ViolationNotice {
  id: number
  kind: 'tab-switch' | 'focus-lost'
  count: number
  max: number
  cancelled: boolean
}

export interface AntiCheatState {
  isSecureWindow: boolean
  isScreenShared: boolean
  isCamMicAllowed: boolean
  violations: number
  micLevel: number
  screenStream: MediaStream | null
  userStream: MediaStream | null
  events: ProctoringEvent[]
  lastViolation: ViolationNotice | null
}

export function useAntiCheat(sectionRules?: SectionRules | null) {
  const [state, setState] = React.useState<AntiCheatState>({
    isSecureWindow: window.name === 'lex-test-window',
    isScreenShared: false,
    isCamMicAllowed: false,
    violations: 0,
    micLevel: 0,
    screenStream: null,
    userStream: null,
    events: [],
    lastViolation: null,
  })

  const awayStartTimeRef = React.useRef<number | null>(null)
  const eventsRef = React.useRef<ProctoringEvent[]>([])

  const screenStreamRef = React.useRef<MediaStream | null>(null)
  const userStreamRef = React.useRef<MediaStream | null>(null)
  const analyserRef = React.useRef<AnalyserNode | null>(null)
  const animationFrameRef = React.useRef<number | null>(null)

  // Expose the current violation count via a ref for use in callbacks
  const violationsRef = React.useRef(0)

  // 1. Request Screen Share
  const requestScreenShare = async () => {
    try {
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

  const resetViolations = React.useCallback(() => {
    violationsRef.current = 0
    setState(prev => ({ ...prev, violations: 0 }))
  }, [])

  const dismissViolation = React.useCallback(() => {
    setState(prev => ({ ...prev, lastViolation: null }))
  }, [])

  // Monitor violations — respects section rules
  React.useEffect(() => {
    if (!state.isScreenShared || !state.isCamMicAllowed) return

    const allowTabSwitching = sectionRules?.allowTabSwitching ?? false
    const maxViolations = sectionRules?.maxViolations ?? 5

    const handleBlur = () => {
      if (!allowTabSwitching) {
        if (document.visibilityState === 'visible') {
          violationsRef.current += 1
          const count = violationsRef.current
          setState(prev => ({
            ...prev,
            violations: count,
            lastViolation: { id: Date.now(), kind: 'focus-lost', count, max: maxViolations, cancelled: count >= maxViolations },
          }))
        }
      }
      
      // Log Away Event
      if (!awayStartTimeRef.current) {
        awayStartTimeRef.current = Date.now()
        const event: ProctoringEvent = { type: 'AWAY', timestamp: new Date().toISOString() }
        eventsRef.current.push(event)
        setState(prev => ({ ...prev, events: [...eventsRef.current] }))
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Log Return Event
        if (awayStartTimeRef.current) {
          const duration = Math.floor((Date.now() - awayStartTimeRef.current) / 1000)
          const event: ProctoringEvent = { 
            type: 'RETURN', 
            timestamp: new Date().toISOString(),
            durationSeconds: duration 
          }
          eventsRef.current.push(event)
          awayStartTimeRef.current = null
          setState(prev => ({ ...prev, events: [...eventsRef.current] }))
        }

        if (allowTabSwitching) {
          if ((sectionRules?.allowedResources?.length ?? 0) > 0 || (sectionRules?.blockedResources?.length ?? 0) > 0) {
            toast.info('Policy Reminder', {
              description: `Allowed: ${sectionRules?.allowedResources?.join(', ') || 'Any'}\nBlocked: ${sectionRules?.blockedResources?.join(', ') || 'None'}`,
              duration: 5000,
            })
          }
        }
        return
      }

      if (document.visibilityState === 'hidden') {
        // Already logged as AWAY via handleBlur usually, but backup here
        if (!awayStartTimeRef.current) {
          awayStartTimeRef.current = Date.now()
          const event: ProctoringEvent = { type: 'AWAY', timestamp: new Date().toISOString() }
          eventsRef.current.push(event)
          setState(prev => ({ ...prev, events: [...eventsRef.current] }))
        }

        if (!allowTabSwitching) {
          violationsRef.current += 1
          const count = violationsRef.current
          setState(prev => ({
            ...prev,
            violations: count,
            lastViolation: { id: Date.now(), kind: 'tab-switch', count, max: maxViolations, cancelled: count >= maxViolations },
          }))
        }
      }
    }

    const preventDefault = (e: Event) => e.preventDefault()
    // Sections with allowExternalResources (e.g. the research/subjective
    // section, where lookups and pasting cited material are expected) permit
    // copy/paste/cut; closed-book sections keep blocking them. Right-click is
    // still blocked everywhere - Ctrl+V/Ctrl+C still work for pasting/copying,
    // this only removes the context-menu route.
    const allowClipboard = Boolean(sectionRules?.allowExternalResources)

    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    if (!allowClipboard) {
      document.addEventListener('copy', preventDefault)
      document.addEventListener('paste', preventDefault)
      document.addEventListener('cut', preventDefault)
    }
    document.addEventListener('contextmenu', preventDefault)

    return () => {
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (!allowClipboard) {
        document.removeEventListener('copy', preventDefault)
        document.removeEventListener('paste', preventDefault)
        document.removeEventListener('cut', preventDefault)
      }
      document.removeEventListener('contextmenu', preventDefault)
    }
  }, [state.isScreenShared, state.isCamMicAllowed, sectionRules?.allowTabSwitching, sectionRules?.maxViolations, sectionRules?.allowExternalResources])

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
    resetViolations,
    dismissViolation,
  }
}
