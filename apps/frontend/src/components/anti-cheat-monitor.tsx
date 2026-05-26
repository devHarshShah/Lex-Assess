import React from 'react'
import { Card } from '@/components/ui/card'
import { Camera, Mic, Monitor, AlertCircle } from 'lucide-react'

interface AntiCheatMonitorProps {
  userStream: MediaStream | null
  micLevel: number
  isScreenShared: boolean
  violations: number
}

export function AntiCheatMonitor({ userStream, micLevel, isScreenShared, violations }: AntiCheatMonitorProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  console.log('AntiCheatMonitor Debug:', { 
    hasUserStream: !!userStream, 
    userStreamId: userStream?.id,
    micLevel, 
    isScreenShared 
  })

  React.useEffect(() => {
    if (videoRef.current && userStream) {
      console.log('Attaching userStream to video element:', userStream.id)
      videoRef.current.srcObject = userStream
      videoRef.current.play().catch(err => console.error('Video play error:', err))
    }
  }, [userStream])

  return (
    <div className="fixed bottom-6 right-6 z-[50] flex flex-col gap-4 pointer-events-none">
      {/* Violations Counter */}
      {violations > 0 && (
        <div className="bg-red-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce self-end">
          <AlertCircle size={18} />
          <span className="font-bold text-sm">Violations: {violations}</span>
        </div>
      )}

      <Card className="p-2 bg-white/90 backdrop-blur border-2 border-gray-200 shadow-2xl overflow-hidden pointer-events-auto w-52">
        <div className="relative w-full h-36 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
          {userStream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Camera size={32} />
              <span className="text-[10px] font-bold">CAMERA OFF</span>
            </div>
          )}
          
          {/* Status Indicators overlay on video */}
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-black/20 backdrop-blur-sm p-1.5 rounded-full">
            <div 
              title={isScreenShared ? "Screen Sharing Active" : "Screen Sharing Inactive"}
              style={{ backgroundColor: isScreenShared ? '#22c55e' : '#ef4444' }}
              className="p-1 rounded-full text-white shadow-sm"
            >
              <Monitor size={12} />
            </div>
            
            <div className="flex-1 mx-2 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <div 
                className="h-full bg-green-400 transition-all duration-75"
                style={{ width: `${Math.min(100, micLevel * 2.5)}%` }}
              />
            </div>

            <div 
              title={userStream ? "Camera Active" : "Camera Inactive"}
              style={{ backgroundColor: userStream ? '#22c55e' : '#ef4444' }}
              className="p-1 rounded-full text-white shadow-sm"
            >
              <Mic size={12} />
            </div>
          </div>
        </div>
        
        <div className="mt-2 px-1 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-gray-500">
            <span>SECURE MONITOR</span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
