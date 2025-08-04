# Chime Notification Component

This component provides audio notifications when AI processes are complete, allowing users to multitask while waiting for Onlook to finish rendering code.

## Features

- **Two chime sounds**: "Glisten" and "Pulse" with different audio characteristics
- **Sound preview**: Users can test both sounds before enabling
- **Visual feedback**: Animated waveform visualization during playback
- **Easy integration**: Simple hook-based API for managing chime state
- **Two UI variants**: "default" (side-by-side) and "simple" (stacked) layouts

## Usage

### Basic Component Usage

```tsx
import { ChimeNotification, useChimeNotification } from './chime-notification'

function MyComponent() {
  const [selectedAudio, setSelectedAudio] = useState<ChimeSound | null>(null)
  
  const handleAudioSelect = (audio: ChimeSound) => {
    setSelectedAudio(audio)
  }
  
  // Audio preview is handled internally by the component
  
  const handleChooseAudio = () => {
    // Enable chime with selected audio
  }
  
  const handleNoThanks = () => {
    // Disable chime
  }

  return (
    <ChimeNotification
      selectedAudio={selectedAudio}
      onAudioSelect={handleAudioSelect}
      onChooseAudio={handleChooseAudio}
      onNoThanks={handleNoThanks}
      variant="default" // or "simple"
    />
  )
}
```

### Playing Chimes Programmatically

```tsx
// When AI processing is complete
const handleAIComplete = () => {
  playChime() // This will play the selected sound if enabled
}
```

## Audio Files

The component uses the following audio files:
- `/public/assets/chime-notification/double-chirp.wav` (Glisten sound)
- `/public/assets/chime-notification/triple-chirp.wav` (Pulse sound)

### Audio Characteristics

- **Format**: WAV
- **Duration**: Short notification sounds
- **Volume**: Moderate (component sets volume to 50%)
- **Glisten (Double Chirp)**: Two quick, bright notification tones
- **Pulse (Triple Chirp)**: Three rhythmic, attention-grabbing tones

## Integration with AI Processing

To integrate with your AI processing workflow:

1. Use the `useChimeNotification` hook to manage chime state
2. Call `playChime()` when AI processing completes
3. Store user preferences (enabled/disabled, selected sound) in your app state

## Styling

The component uses Tailwind CSS classes and can be customized via the `className` prop. It follows the existing design system with:

- Dark theme support
- Responsive design
- Smooth animations
- Accessible color contrast

## Browser Compatibility

- Requires user interaction before playing audio (browser autoplay policies)
- Works in all modern browsers that support the Web Audio API
- Gracefully handles audio playback failures 