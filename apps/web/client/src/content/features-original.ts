import type { PageContent } from './types';

export const featuresOriginalContent: PageContent = {
  hero: {
    subtitle: "Visual Editor for React & TailwindCSS Apps",
    title: "The React Editor You've Been Waiting For",
    description: "Code as you design. Build React applications visually while Onlook writes reliable code you can trust, exactly where it needs to go.",
    buttonText: "START BUILDING",
    buttonRoute: "/"
  },
  benefits: [
    {
      subtitle: "AI-Powered Visual Builder",
      title: "AI for UI design",
      description: "Prompt Onlook's AI to build, design, and experiment with your ideas. Go beyond pretty pixels and make your frontend interactive. The AI understands your React components and Tailwind patterns, generating code that fits your project's architecture.",
      mockupComponent: "AiChatInteractive"
    },
    {
      subtitle: "React Visual Editor",
      title: "Build Your App Visually",
      description: "Edit React components directly in the browser. Drag, drop, and style elements visually while Onlook updates your actual code files in real-time. Your existing build process stays intact. Onlook works with your setup, not against it.",
      mockupComponent: "DirectEditingInteractive"
    },
    {
      subtitle: "Tailwind CSS Visual Editor",
      title: "Style Without Writing CSS",
      description: "Adjust layouts, change colors, modify text, and more. Onlook generates clean Tailwind classes that match your design decisions.",
      mockupComponent: "TailwindColorEditorMockup"
    }
  ],
  intro: {
    subtitle: "Visual Design Control",
    title: "Design and code in perfect harmony"
  },
  features: [
    {
      subtitle: "Component Library",
      title: "Unified components for design and code",
      description: "Create reusable components that work across your project. Build once, use everywhere. Components maintain their style and behavior while giving you control of content."
    },
    {
      subtitle: "Theming & Branding",
      title: "Centralized Design & Style Management",
      description: "Manage color palettes, typography scales, and design tokens through a centralized system. Define your design language once, apply it consistently across your project."
    },
    {
      subtitle: "Layer Management",
      title: "Precise control over every element",
      description: "Navigate your React component tree through a visual layer panel. Select, organize, and control components with precision. No more hunting through JSX to find the element you want to edit."
    },
    {
      subtitle: "Version History",
      title: "Auto save, history and version control",
      description: "Roll-back anytime! Onlook automatically saves project snapshots so you can experiment with confidence."
    },
    {
      subtitle: "React Templates",
      title: "Bring your own projects into Onlook or start fresh",
      description: "Onlook works with any React next.js website styled with Tailwind. Import your existing codebase and start editing visually, or begin with a new project."
    },
    {
      subtitle: "Open Source",
      title: "Built with the Community",
      description: "Browse our GitHub repo to understand how Onlook works, contribute improvements, or customize it for your team's needs."
    }
  ],
  cta: {
    text: "Start building\nwith Onlook today",
    buttonText: "Get Started for Free"
  },
  faqs: [
    {
      question: "What is Onlook?",
      answer: "Onlook is an open-source, visual editor for websites. It allows anyone to create and style their own websites without any coding knowledge."
    },
    {
      question: "What can I use Onlook to do?",
      answer: "Onlook is great for creating websites, prototypes, user interfaces, and designs. Whether you need a quick mockup or a full-fledged website, ask Onlook to craft it for you."
    },
    {
      question: "How do I get started?",
      answer: "Getting started with Onlook is easy. Simply sign up for an account, create a new project, and follow our step-by-step guide to deploy your first application."
    },
    {
      question: "Is Onlook free to use?",
      answer: "Onlook is free for your first prompt, but you are limited by the number of messages you can send. Please see our Pricing page for more details."
    },
    {
      question: "What is the difference between Onlook and other design tools?",
      answer: "Onlook is a visual editor for code. It allows you to create and style your own creations with code as the source of truth. While it is best suited for creating websites, it can be used for anything visual – presentations, mockups, and more. Because Onlook uses code as the source of truth, the types of designs you can create are unconstrained by Onlook interface."
    },
    {
      question: "Why is Onlook open-source?",
      answer: "Developers have historically been second-rate citizens in the design process. Onlook was founded to bridge the divide between design and development, and we wanted to make developers first-class citizens alongside designers. We chose to be open-source to give developers transparency into how we are building Onlook and how the work created through Onlook will complement the work of developers."
    }
  ]
};
