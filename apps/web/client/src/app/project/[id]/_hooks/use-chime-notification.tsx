'use client'

import { useState, useEffect, useRef, createContext, useContext } from 'react'
import type { ChimeSound } from '../_components/right-panel/chat-tab/chime-notification'

interface ChimeNotificationState {
  isEnabled: boolean
  selectedSound: ChimeSound
  volume: number
  setIsEnabled: (enabled: boolean) => void
  setSelectedSound: (sound: ChimeSound) => void
  setVolume: (volume: number) => void
  playChime: () => Promise<void>
}

const ChimeNotificationContext = createContext<ChimeNotificationState | null>(null)

export function ChimeNotificationProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [selectedSound, setSelectedSound] = useState<ChimeSound>('glisten')
  const [volume, setVolume] = useState(0.5)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const audioFiles = {
    glisten: '/assets/chime-notification/double-chirp.wav',
    pulse: '/assets/chime-notification/triple-chirp.wav'
  }

  const playChime = async () => {
    if (!isEnabled || !selectedSound || !audioRef.current) return

    audioRef.current.src = audioFiles[selectedSound]
    audioRef.current.volume = volume
    
    try {
      await audioRef.current.play()
    } catch (error) {
      console.error('Failed to play chime:', error)
    }
  }

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  const value: ChimeNotificationState = {
    isEnabled,
    selectedSound,
    volume,
    setIsEnabled,
    setSelectedSound,
    setVolume,
    playChime
  }

  return (
    <ChimeNotificationContext.Provider value={value}>
      {children}
    </ChimeNotificationContext.Provider>
  )
}

export function useChimeNotification() {
  const context = useContext(ChimeNotificationContext)
  if (!context) {
    throw new Error('useChimeNotification must be used within a ChimeNotificationProvider')
  }
  return context
} 