import React from 'react';

interface TestimonialCardProps {
  text: string;
  name: string;
  label: string;
  // Optionally, you could add a profileImage prop for real images
  // profileImage?: string;
  profileColor?: string; // For placeholder avatar color
}

export function TestimonialCard({ text, name, label, profileColor = '#222' }: TestimonialCardProps) {
  return (
    <div className="bg-background-onlook border border-white/10 rounded-xl p-6 flex flex-col justify-between min-h-[160px] shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="text-foreground-primary text-regular mb-6">{text}</div>
      <div className="flex items-center gap-3 mt-auto">
        {/* Placeholder for profile picture */}
        <div
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          style={{ background: profileColor }}
        >
          {/* Optionally, initials or icon */}
        </div>
        <div className="flex flex-col">
          <span className="text-foreground-secondary text-small">{name}</span>
          <span className="text-foreground-secondary text-small">{label}</span>
        </div>
      </div>
    </div>
  );
} 