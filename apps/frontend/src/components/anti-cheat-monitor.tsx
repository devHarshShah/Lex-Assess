import React from 'react'
import { Card } from '@/components/ui/card'
import { Camera, Mic, Monitor, AlertCircle } from 'lucide-react'

interface AntiCheatMonitorProps {
  userStream: MediaStream | null
  micLevel: number
  isScreenShared: boolean
  violations: number
  allowedResources?: string[]
  blockedResources?: string[]
}

export function AntiCheatMonitor({ userStream, micLevel, isScreenShared, violations, allowedResources, blockedResources }: AntiCheatMonitorProps) {
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
        <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce self-end">
          <AlertCircle size={28} />
          <span className="font-extrabold text-xl">Violations: {violations}</span>
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
          
          {((allowedResources?.length ?? 0) > 0 || (blockedResources?.length ?? 0) > 0) && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1.5">
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Active Policy</span>
              {allowedResources && allowedResources.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {allowedResources.slice(0, 3).map((r, i) => (
                    <span key={i} className="text-[8px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded border border-green-100 truncate max-w-[60px] font-medium">
                      ✓ {r}
                    </span>
                  ))}
                  {allowedResources.length > 3 && <span className="text-[8px] text-gray-400">+{allowedResources.length - 3}</span>}
                </div>
              )}
              {blockedResources && blockedResources.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {blockedResources.slice(0, 3).map((r, i) => (
                    <span key={i} className="text-[8px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded border border-red-100 truncate max-w-[60px] font-medium">
                      ✗ {r}
                    </span>
                  ))}
                  {blockedResources.length > 3 && <span className="text-[8px] text-gray-400">+{blockedResources.length - 3}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
