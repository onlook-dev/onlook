async function getFullDocumentation(docsUrl: string): Promise<string> {
    const baseContent = `# Onlook - Complete Documentation

> Open-source visual editor for React apps. Design directly in your live React app and generate clean code.

## Project Overview

Onlook is a "Cursor for Designers" that enables designers to make live edits to React and TailwindCSS projects directly within the browser DOM. It provides a seamless integration between design and development.

### Key Features

- **Visual Editing**: Edit React components directly in the browser
- **Code Generation**: Automatically generates clean, production-ready code
- **TailwindCSS Integration**: Full support for Tailwind styling
- **AI Assistance**: Built-in AI chat for design and development help
- **Real-time Preview**: See changes instantly as you design
- **Component Library**: Reusable components and design systems

### Architecture

Onlook is structured as a monorepo with several interconnected apps and packages:

- **Web App**: Next.js application with visual editor interface
- **Documentation**: Comprehensive guides and API references
- **Packages**: Shared utilities, UI components, and core functionality
- **Backend**: Supabase integration for user management and data storage

### Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Supabase, tRPC, Drizzle ORM
- **AI Integration**: Anthropic Claude, OpenRouter
- **Development**: TypeScript, Bun, Docker
- **Deployment**: Vercel, CodeSandbox containers

## Getting Started

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/onlook-dev/onlook.git
   cd onlook
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   bun install
   \`\`\`

3. Set up environment variables:
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

4. Start the development server:
   \`\`\`bash
   bun dev
   \`\`\`

### First Project

1. **Create a New Project**: Use the project creation wizard
2. **Import Existing Project**: Connect your React + TailwindCSS project
3. **Start Designing**: Use the visual editor to modify components
4. **Generate Code**: Export clean code changes to your project

### Core Concepts

- **Visual Editor**: The main interface for designing components
- **Style Editor**: Modify TailwindCSS classes through a visual interface
- **Component Tree**: Navigate and select elements in your React app
- **AI Chat**: Get help with design decisions and code generation
- **Code Export**: Generate and apply code changes to your project

## API Reference

### Core APIs

- **Project Management**: Create, update, and manage projects
- **Component Editing**: Modify React components and their properties
- **Style Management**: Apply and manage TailwindCSS classes
- **AI Integration**: Chat with AI for design assistance
- **Code Generation**: Generate and export code changes

### Authentication

Onlook uses Supabase for authentication and user management:

- **Sign Up/Sign In**: Email-based authentication
- **User Profiles**: Manage user settings and preferences
- **Project Access**: Control access to projects and collaboration

### Data Models

- **Projects**: Container for your React applications
- **Components**: Individual React components within projects
- **Styles**: TailwindCSS classes and custom styles
- **Conversations**: AI chat history and context

## Contributing

### Development Setup

1. **Prerequisites**: Node.js 18+, Bun, Docker (optional)
2. **Environment**: Set up Supabase, AI providers, and other services
3. **Local Development**: Run the development server and containers
4. **Testing**: Run tests and ensure code quality

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks for quality assurance

### Pull Request Process

1. Fork the repository and create a feature branch
2. Make your changes with appropriate tests
3. Ensure all tests pass and code is properly formatted
4. Submit a pull request with detailed description
5. Address review feedback and get approval

## Deployment

### Production Deployment

- **Web App**: Deployed on Vercel with automatic CI/CD
- **Documentation**: Static site generation and deployment
- **Backend**: Supabase managed services
- **Containers**: CodeSandbox for development environments

### Environment Configuration

- **Production**: Optimized builds with caching
- **Staging**: Testing environment for new features
- **Development**: Local development with hot reloading

## Community and Support

### Getting Help

- **Documentation**: Comprehensive guides and tutorials
- **Discord**: Active community for questions and discussions
- **GitHub Issues**: Bug reports and feature requests
- **Email**: Direct contact for business inquiries

### Contributing

- **Code Contributions**: Bug fixes, features, and improvements
- **Documentation**: Help improve guides and examples
- **Community**: Answer questions and help other users
- **Testing**: Report bugs and test new features

---

For the most up-to-date information, visit our documentation at ${docsUrl} or join our Discord community at https://discord.gg/hERDfFZCsH.
`;

    return baseContent;
}

export async function GET() {
    try {
        const docsUrl = process.env.DOCS_URL ?? 'https://docs.onlook.com';
        const content = await getFullDocumentation(docsUrl);

        return new Response(content, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Robots-Tag': 'llms-txt',
            },
        });
    } catch (error) {
        console.error('Error generating llms-full.txt:', error);
        return new Response('Error generating documentation', { status: 500 });
    }
}
