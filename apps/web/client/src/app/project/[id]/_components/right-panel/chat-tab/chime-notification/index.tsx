'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@onlook/ui/utils'
import { Icons } from '@onlook/ui/icons'

export type ChimeSound = 'glisten' | 'pulse'

interface ChimeNotificationProps {
  selectedAudio: ChimeSound | null
  onAudioSelect: (audio: ChimeSound) => void
  onPlayPreview?: (audio: ChimeSound) => void
  onChooseAudio: () => void
  onNoThanks: () => void
  volume?: number
  onVolumeChange?: (volume: number) => void
  className?: string
  isEnabled?: boolean
}

export function ChimeNotification({
  selectedAudio,
  onAudioSelect,
  onPlayPreview,
  onChooseAudio,
  onNoThanks,
  volume = 0.5,
  onVolumeChange,
  className = '',
  isEnabled = false
}: ChimeNotificationProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSound, setCurrentSound] = useState<ChimeSound | null>(null)
  const [playbackProgress, setPlaybackProgress] = useState(0)
  const audioCache = useRef<Record<ChimeSound, HTMLAudioElement> | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Audio file paths
  const audioFiles = {
    glisten: '/assets/chime-notification/double-chirp.wav',
    pulse: '/assets/chime-notification/triple-chirp.wav'
  }

  // Animation functions
  const startPlaybackAnimation = (audio: HTMLAudioElement) => {
    const updateProgress = () => {
      if (audio.paused || audio.ended) {
        stopPlaybackAnimation()
        return
      }
      
      const progress = (audio.currentTime / audio.duration) * 100
      setPlaybackProgress(progress)
      animationFrameRef.current = requestAnimationFrame(updateProgress)
    }
    
    animationFrameRef.current = requestAnimationFrame(updateProgress)
  }

  const stopPlaybackAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setPlaybackProgress(0)
  }

  // Waveform data for visual representation
  const glistenWaveform = [
    9, 4, 9, 9, 7, 5, 5, 3, 2, 3, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2
  ]

  const pulseWaveform = [
    9, 6, 9, 3, 8, 4, 5, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2
  ]

  const playAudioPreview = async (sound: ChimeSound) => {
    if (!audioCache.current) return

    try {
      // Stop any currently playing audio
      if (isPlaying && currentSound) {
        const currentAudio = audioCache.current[currentSound]
        currentAudio.pause()
        currentAudio.currentTime = 0
        stopPlaybackAnimation()
      }

      const audio = audioCache.current[sound]
      
      // Reset and play the new sound
      audio.currentTime = 0
      audio.volume = volume
      await audio.play()
      
      setIsPlaying(true)
      setCurrentSound(sound)
      setPlaybackProgress(0)
      startPlaybackAnimation(audio)
    } catch (error) {
      console.error('Failed to play audio preview:', error)
      setIsPlaying(false)
      setCurrentSound(null)
      setPlaybackProgress(0)
    }
  }

  useEffect(() => {
    // Create and preload audio elements
    const audioElements: Record<ChimeSound, HTMLAudioElement> = {
      glisten: new Audio(audioFiles.glisten),
      pulse: new Audio(audioFiles.pulse)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentSound(null)
      stopPlaybackAnimation()
    }

    // Set up event listeners and preload
    Object.values(audioElements).forEach(audio => {
      audio.addEventListener('ended', handleEnded)
      audio.preload = 'auto'
      audio.load()
    })

    audioCache.current = audioElements

    return () => {
      // Clean up
      stopPlaybackAnimation()
      Object.values(audioElements).forEach(audio => {
        audio.removeEventListener('ended', handleEnded)
        audio.pause()
        audio.src = ''
      })
    }
  }, [])



  return (
    <div
      className={cn(
        'w-full',
        className
      )}
    >
      {/* Header with Bell Icon */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 bg-background-secondary rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h2 className="text-title3 text-foreground mb-2">
          Multitask easier
        </h2>
        <p className="text-sm text-muted-foreground text-center text-balance">
          While AI processes your request, a soft chime can notify you when it's
          ready. Perfect for staying productive without missing the moment your
          work is complete.
        </p>
      </div>

      {/* Audio Options - Side by Side */}
      <div className="flex gap-4 mb-6">
        {/* Chime Option - Glisten */}
        <div
          className={cn(
            'border rounded-lg p-4 cursor-pointer transition-colors flex-1',
            selectedAudio === 'glisten'
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-border/80'
          )}
          onClick={() => onAudioSelect('glisten')}
        >
          <div className="items-center gap-3 flex-row flex">
                          {/* Play Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  playAudioPreview('glisten')
                }}
                className="p-2 hover:bg-accent bg-muted rounded-full transition-colors flex-shrink-0"
              >
                {isPlaying && currentSound === 'glisten' ? (
                  <Icons.LoadingSpinner className="w-4 h-4 text-foreground animate-spin" />
                ) : (
                  <Icons.Play className="w-4 h-4 text-foreground" />
                )}
              </button>

            {/* Waveform and Label */}
            <div className="flex-col flex justify-start items-start">
              <div className="flex items-center gap-1 justify-center mb-[4px]">
                {glistenWaveform.slice(0, 18).map((height, i) => {
                  const isPlayingThis = isPlaying && currentSound === 'glisten'
                  const isPlayed = isPlayingThis && (i / 18) * 100 <= playbackProgress
                  
                  return (
                    <div
                      key={i}
                      className={cn(
                        'rounded-full transition-colors duration-75',
                        isPlayed ? 'bg-primary' : 
                        selectedAudio === 'glisten' ? 'bg-primary/60' : 'bg-muted-foreground'
                      )}
                      style={{
                        width: '2px',
                        height: `${height * 3}px`,
                        opacity: isPlayed ? 1 : selectedAudio === 'glisten' ? 0.8 : 0.6
                      }}
                    />
                  )
                })}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Glisten
              </div>
            </div>
          </div>
        </div>

        {/* Bell Option - Pulse */}
        <div
          className={cn(
            'border rounded-lg p-4 cursor-pointer transition-colors flex-1',
            selectedAudio === 'pulse'
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-border/80'
          )}
          onClick={() => onAudioSelect('pulse')}
        >
          <div className="items-center gap-3 flex-row flex">
            {/* Play Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                playAudioPreview('pulse')
              }}
              className="p-2 hover:bg-accent bg-muted rounded-full transition-colors flex-shrink-0"
            >
              {isPlaying && currentSound === 'pulse' ? (
                <Icons.LoadingSpinner className="w-4 h-4 text-foreground animate-spin" />
              ) : (
                <Icons.Play className="w-4 h-4 text-foreground" />
              )}
            </button>

            {/* Waveform and Label */}
            <div className="flex-col flex items-start">
              <div className="flex items-center gap-1 justify-center mb-[4px]">
                {pulseWaveform.slice(0, 18).map((height, i) => {
                  const isPlayingThis = isPlaying && currentSound === 'pulse'
                  const isPlayed = isPlayingThis && (i / 18) * 100 <= playbackProgress
                  
                  return (
                    <div
                      key={i}
                      className={cn(
                        'rounded-full transition-colors duration-75',
                        isPlayed ? 'bg-primary' : 
                        selectedAudio === 'pulse' ? 'bg-primary/60' : 'bg-muted-foreground'
                      )}
                      style={{
                        width: '2px',
                        height: `${height * 3}px`,
                        opacity: isPlayed ? 1 : selectedAudio === 'pulse' ? 0.8 : 0.6
                      }}
                    />
                  )
                })}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Pulse
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Volume Control */}
      {onVolumeChange && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-muted-foreground">Volume</label>
            <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%, hsl(var(--muted)) 100%)`
            }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onChooseAudio}
          disabled={!selectedAudio}
          className={cn(
            'w-full py-2 px-4 rounded-md font-medium transition-colors',
            selectedAudio
              ? isEnabled
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isEnabled ? 'Disable Chime' : 'Enable Chime'}
        </button>
        <button
          onClick={onNoThanks}
          className="w-full py-2 px-4 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          I'll check back manually
        </button>
      </div>
    </div>
  )
}

 