import type { PageContent } from './types';

export const featuresPrototypeContent: PageContent = {
  hero: {
    subtitle: "AI Prototype Generator",
    title: "From Idea to Interactive Prototype in Minutes",
    description: "Skip static mockups and wireframes. Generate fully functional React prototypes with real interactions, data flow, and responsive design. Perfect for user testing and stakeholder demos.",
    buttonText: "CREATE PROTOTYPE",
    buttonRoute: "/"
  },
  benefits: [
    {
      subtitle: "AI-Powered Prototyping",
      title: "Functional Prototypes, Not Static Mockups",
      description: "Generate interactive React prototypes with real component behavior, state management, and user interactions. Test user flows with actual functionality rather than clickable images.",
      mockupComponent: "AiChatInteractive"
    },
    {
      subtitle: "Design-to-Code Conversion",
      title: "Transform Designs into Working Prototypes",
      description: "Upload Figma designs or describe your vision, and watch AI generate fully functional React prototypes. Complete with routing, state management, and interactive elements that actually work.",
      mockupComponent: "DirectEditingInteractive"
    },
    {
      subtitle: "Rapid Prototype Testing",
      title: "Test and Iterate at Lightning Speed",
      description: "Deploy prototypes instantly for user testing and stakeholder feedback. Make changes in real-time and see results immediately. Perfect for validating ideas before full development.",
      mockupComponent: "TailwindColorEditorMockup"
    }
  ],
  intro: {
    subtitle: "Rapid Prototyping",
    title: "From concept to interactive prototype"
  },
  features: [
    {
      subtitle: "AI Generation",
      title: "Intelligent prototype creation",
      description: "Describe your app idea and watch AI generate a complete prototype with proper component structure, routing, and interactions. No manual wireframing or static mockups needed."
    },
    {
      subtitle: "Interactive Components",
      title: "Real functionality from day one",
      description: "Generated prototypes include working forms, navigation, modals, and user interactions. Test actual user flows rather than simulated click-through experiences."
    },
    {
      subtitle: "Figma Conversion",
      title: "From design files to working prototypes",
      description: "Import Figma designs and automatically convert them into functional React prototypes. Maintain design fidelity while adding real interactivity and data flow."
    },
    {
      subtitle: "One-Click Deployment",
      title: "Share prototypes instantly",
      description: "Deploy prototypes to the web with a single click. Share links with stakeholders, conduct user testing, and gather feedback on real, functional interfaces."
    },
    {
      subtitle: "Version Control",
      title: "Track prototype iterations",
      description: "Maintain version history of your prototypes. Compare different iterations, roll back changes, and track the evolution of your ideas throughout the design process."
    },
    {
      subtitle: "User Testing Integration",
      title: "Built-in analytics and feedback",
      description: "Collect user interaction data, heatmaps, and feedback directly from your prototypes. Understand how users interact with your designs before building the final product."
    }
  ],
  cta: {
    text: "Start prototyping\nwith AI today",
    buttonText: "Create Your First Prototype"
  },
  faqs: [
    {
      question: "How is this different from traditional prototyping tools?",
      answer: "Unlike tools like Figma or InVision that create clickable mockups, Onlook generates actual functional React prototypes with real component behavior, state management, and interactions. You're testing the actual user experience, not a simulation."
    },
    {
      question: "How quickly can I create a prototype?",
      answer: "With AI assistance, you can generate a functional prototype in minutes rather than hours or days. Simply describe your idea or upload a design, and AI handles the component creation, layout, and basic interactions automatically."
    },
    {
      question: "Can I convert Figma designs into prototypes?",
      answer: "Yes! Upload your Figma designs and our AI will automatically convert them into functional React prototypes, maintaining visual fidelity while adding real interactivity and proper component structure."
    },
    {
      question: "Are the prototypes suitable for user testing?",
      answer: "Absolutely! Since prototypes are built with real React components and interactions, they provide an authentic user experience perfect for usability testing, stakeholder demos, and user feedback collection."
    },
    {
      question: "Can I turn prototypes into production code?",
      answer: "Yes! Prototypes are built with clean, production-ready React code. You can use them as a starting point for development or extract specific components and patterns for your final application."
    },
    {
      question: "What kind of interactions can prototypes include?",
      answer: "Prototypes can include forms, navigation, modals, data filtering, user authentication flows, and any other React-based interactions. They're not limited to simple click-through experiences."
    }
  ]
};
