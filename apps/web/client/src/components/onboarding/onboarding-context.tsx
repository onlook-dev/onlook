'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector or identifier for the element to highlight
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'chat-input',
    title: 'Welcome to Onlook!',
    description: 'Start by typing your first message here to begin designing your project.',
    target: 'chat-input'
  },
  {
    id: 'toolbar',
    title: 'Restart & Reset',
    description: 'Use the toolbar to restart your sandbox if you run into any issues.',
    target: 'editor-toolbar'
  },
  {
    id: 'left-panel',
    title: 'Assets & Resources',
    description: 'Access your assets, components, and project files in the left panel.',
    target: 'left-panel'
  },
  {
    id: 'design-mode',
    title: 'Preview Mode',
    description: 'Switch to design mode to see how your project looks and feels.',
    target: 'design-mode-toggle'
  },
  {
    id: 'publish',
    title: 'Share Your Work',
    description: 'Publish and share your amazing creations with the world!',
    target: 'publish-button'
  }
];

interface OnboardingContextType {
  currentStep: number;
  isActive: boolean;
  isFadingOut: boolean;
  nextStep: () => void;
  previousStep: () => void;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  skipStep: () => void;
  setFadingOut: (value: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider = ({ children }: OnboardingProviderProps) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    const startOnboarding = () => {
        setIsActive(true);
        setCurrentStep(0);
        setIsFadingOut(false);
    };

    const nextStep = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            completeOnboarding();
        }
    };

    const previousStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const skipStep = () => {
        nextStep();
    };

    // Listen for skip events from overlay
    useEffect(() => {
        const handleSkip = () => {
            skipStep();
        };

        window.addEventListener('onboarding-skip', handleSkip);
        return () => window.removeEventListener('onboarding-skip', handleSkip);
    }, [skipStep]);

  const completeOnboarding = () => {
    setIsActive(false);
    setCurrentStep(0);
    // Store in localStorage that onboarding has been completed
    localStorage.setItem('onlook-onboarding-completed', 'true');
  };

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        isActive,
        nextStep,
        previousStep,
        startOnboarding,
        completeOnboarding,
        skipStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};
