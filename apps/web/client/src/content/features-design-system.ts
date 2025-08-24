import type { PageContent } from './types';

export const featuresDesignSystemContent: PageContent = {
  hero: {
    subtitle: "Design System Management",
    title: "Design System Tools for React Teams",
    description: "Build, maintain, and scale design systems with powerful tools for component libraries, design tokens, and team collaboration. Keep your React applications consistent and your team aligned.",
    buttonText: "BUILD DESIGN SYSTEM",
    buttonRoute: "/"
  },
  benefits: [
    {
      subtitle: "Tailwind & Shadcn Editor",
      title: "Visual Design Token Management",
      description: "Manage your Tailwind config and Shadcn components through a visual interface. Update colors, typography, spacing, and component variants while maintaining perfect synchronization with your codebase.",
      mockupComponent: "TailwindColorEditorMockup"
    },
    {
      subtitle: "Centralized Design Globals",
      title: "Single Source of Truth for Design",
      description: "Establish and maintain design consistency across all your React applications. Centralized management of colors, typography, spacing, and component behaviors ensures brand consistency at scale.",
      mockupComponent: "DirectEditingInteractive"
    },
    {
      subtitle: "Component Template Import",
      title: "Accelerate Development with Templates",
      description: "Import and customize pre-built component templates that follow your design system. Rapidly prototype new features while maintaining design consistency and code quality standards.",
      mockupComponent: "AiChatInteractive"
    }
  ],
  intro: {
    subtitle: "Design System Control",
    title: "Complete Design System Management"
  },
  features: [
    {
      subtitle: "Asset Management",
      title: "Centralized design asset library",
      description: "Organize icons, images, and design assets in a centralized library. Ensure consistent asset usage across projects while maintaining version control and team access permissions."
    },
    {
      subtitle: "1-Click Publish",
      title: "Instant design system deployment",
      description: "Publish design system updates across all connected projects with a single click. Automatic versioning and rollback capabilities ensure safe, coordinated updates across your entire ecosystem."
    },
    {
      subtitle: "Component Import",
      title: "Seamless component integration",
      description: "Import components from popular libraries like Shadcn, Chakra UI, or your custom library. Automatically adapt components to match your design system's tokens and styling conventions."
    },
    {
      subtitle: "Gradient Picker",
      title: "Advanced color system management",
      description: "Create and manage complex color systems including gradients, color ramps, and semantic color tokens. Generate accessible color combinations that work across light and dark themes."
    },
    {
      subtitle: "AI Animations",
      title: "Intelligent motion design",
      description: "Generate consistent animations and micro-interactions that align with your design system. AI suggests appropriate timing, easing, and motion patterns based on your brand guidelines."
    },
    {
      subtitle: "Layer Management",
      title: "Component hierarchy visualization",
      description: "Visualize and manage component relationships, dependencies, and inheritance patterns. Understand how changes propagate through your design system and identify potential breaking changes."
    }
  ],
  cta: {
    text: "Scale your design system\nwith confidence",
    buttonText: "Start Building Your System"
  },
  faqs: [
    {
      question: "How does this help with existing design systems?",
      answer: "Onlook integrates with your existing design system infrastructure, whether you're using Tailwind, Shadcn, or custom components. It provides visual management tools while preserving your current architecture and workflows."
    },
    {
      question: "Can multiple teams collaborate on the same design system?",
      answer: "Yes! Onlook provides role-based access control, version management, and collaboration tools specifically designed for design system teams. Multiple designers and developers can work together safely with proper governance."
    },
    {
      question: "How do updates propagate to connected projects?",
      answer: "Design system updates can be published instantly to all connected projects, or you can use staged rollouts for safer deployment. Each project can choose when to adopt updates, ensuring stability while enabling rapid iteration."
    },
    {
      question: "What happens to our existing Tailwind configuration?",
      answer: "Onlook works with your existing Tailwind config as the source of truth. Visual changes update your actual config files, maintaining compatibility with your build process and ensuring no vendor lock-in."
    },
    {
      question: "Can we import components from external libraries?",
      answer: "Absolutely! Import components from Shadcn, Radix, Chakra UI, or any other React component library. Onlook automatically adapts them to match your design system's tokens and styling conventions."
    },
    {
      question: "How do you ensure design consistency across projects?",
      answer: "Onlook enforces design token usage, validates component implementations against your design system rules, and provides real-time feedback when designs deviate from established patterns and guidelines."
    }
  ]
};
