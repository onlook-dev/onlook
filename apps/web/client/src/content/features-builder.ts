import type { PageContent } from './types';

export const featuresBuilderContent: PageContent = {
  hero: {
    subtitle: "React Visual Editor",
    title: "Build React Apps Visually with Real-Time Code Sync",
    description: "Edit React components directly in the browser while Onlook writes clean, maintainable code. See your changes instantly in both the visual editor and your actual code files.",
    buttonText: "START BUILDING VISUALLY",
    buttonRoute: "/"
  },
  benefits: [
    {
      subtitle: "Visual React Editing for Developers",
      title: "Edit React Apps Visually with Code Sync",
      description: "Manipulate your React codebase visually while seeing real-time code changes. No more switching between editor and browser. Build, style, and refactor your React app with pixel-perfect control and automatic code generation.",
      mockupComponent: "DirectEditingInteractive"
    },
    {
      subtitle: "Component-First Development",
      title: "Build with React Components in Mind",
      description: "Work directly with your React component tree. Drag, drop, and modify components while maintaining proper React patterns. Every visual change translates to clean, readable JSX that follows React best practices.",
      mockupComponent: "AiChatInteractive"
    },
    {
      subtitle: "Live Code Generation",
      title: "Watch Your Code Write Itself",
      description: "See your code update in real-time as you design. Every visual change generates clean Tailwind classes and proper React component structure. Your development workflow stays intact while gaining visual superpowers.",
      mockupComponent: "TailwindColorEditorMockup"
    }
  ],
  intro: {
    subtitle: "Visual React Development",
    title: "Code and design in perfect harmony"
  },
  features: [
    {
      subtitle: "Component Tree Navigation",
      title: "Visual component hierarchy control",
      description: "Navigate your React component tree through an intuitive visual interface. Select, organize, and modify components with precision. No more hunting through JSX files to find the element you want to edit."
    },
    {
      subtitle: "Real-Time Code Sync",
      title: "Instant bidirectional updates",
      description: "Changes in the visual editor immediately reflect in your code files, and code changes instantly appear in the visual interface. True two-way synchronization keeps everything in perfect sync."
    },
    {
      subtitle: "Tailwind Integration",
      title: "Visual Tailwind class management",
      description: "Modify Tailwind classes visually with intelligent autocomplete and real-time preview. Generate clean, semantic class names that follow Tailwind best practices and your project conventions."
    },
    {
      subtitle: "State Management",
      title: "Visual state and props editing",
      description: "Modify component props and state visually while maintaining proper React patterns. See how data flows through your components with visual state management tools."
    },
    {
      subtitle: "Responsive Design",
      title: "Multi-breakpoint visual editing",
      description: "Design responsive layouts visually across all breakpoints. See how your components adapt to different screen sizes while generating proper responsive Tailwind classes."
    },
    {
      subtitle: "Hot Reload Integration",
      title: "Instant development feedback",
      description: "Built-in hot reload ensures your changes appear instantly without losing component state. Maintain your development flow while gaining visual editing capabilities."
    }
  ],
  cta: {
    text: "Transform your React\ndevelopment workflow",
    buttonText: "Start Visual Development"
  },
  faqs: [
    {
      question: "How does visual editing work with existing React projects?",
      answer: "Onlook integrates seamlessly with any React project using Tailwind CSS. Simply import your existing codebase and start editing visually. All changes are made directly to your actual code files, preserving your project structure and build process."
    },
    {
      question: "Will visual editing break my existing code?",
      answer: "No! Onlook only modifies the specific properties you change visually, leaving the rest of your code untouched. It follows React and Tailwind best practices to ensure generated code is clean and maintainable."
    },
    {
      question: "Can I use this with TypeScript projects?",
      answer: "Absolutely! Onlook fully supports TypeScript React projects. It understands your type definitions and ensures all generated code maintains proper TypeScript compatibility."
    },
    {
      question: "How does this compare to traditional design tools?",
      answer: "Unlike traditional design tools that create static mockups, Onlook works directly with your actual React components and generates real, functional code. You're not designing a representation of your app – you're building the actual app."
    },
    {
      question: "What happens to my existing development workflow?",
      answer: "Your existing workflow remains unchanged. Onlook enhances your development process by adding visual capabilities while preserving your build tools, testing setup, and deployment pipeline."
    },
    {
      question: "Can multiple developers work on the same project?",
      answer: "Yes! Since Onlook works directly with your code files, it integrates perfectly with version control systems like Git. Multiple developers can collaborate using their preferred tools while some use visual editing."
    }
  ]
};
