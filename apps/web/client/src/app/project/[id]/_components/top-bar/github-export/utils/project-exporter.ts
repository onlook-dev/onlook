interface ProjectFile {
    path: string;
    content: string;
    sha?: string;
}

interface ExportOptions {
    projectName: string;
    description?: string;
    includeAssets?: boolean;
    includeMetadata?: boolean;
}

export class ProjectExporter {
    /**
     * Export project files for GitHub repository
     */
    static async exportProjectFiles(
        projectId: string,
        options: ExportOptions
    ): Promise<ProjectFile[]> {
        const files: ProjectFile[] = [];

        // Add README.md
        files.push({
            path: 'README.md',
            content: this.generateReadme(options.projectName, options.description),
        });

        // Add package.json
        files.push({
            path: 'package.json',
            content: this.generatePackageJson(options.projectName, options.description),
        });

        // Add .gitignore
        files.push({
            path: '.gitignore',
            content: this.generateGitignore(),
        });

        // Add Next.js configuration files
        files.push({
            path: 'next.config.js',
            content: this.generateNextConfig(),
        });

        files.push({
            path: 'tailwind.config.js',
            content: this.generateTailwindConfig(),
        });

        files.push({
            path: 'postcss.config.js',
            content: this.generatePostCSSConfig(),
        });

        // Add TypeScript configuration
        files.push({
            path: 'tsconfig.json',
            content: this.generateTSConfig(),
        });

        // Add basic app structure
        files.push({
            path: 'app/layout.tsx',
            content: this.generateRootLayout(options.projectName),
        });

        files.push({
            path: 'app/page.tsx',
            content: this.generateHomePage(options.projectName),
        });

        files.push({
            path: 'app/globals.css',
            content: this.generateGlobalCSS(),
        });

        // Add Onlook metadata if requested
        if (options.includeMetadata) {
            files.push({
                path: 'onlook.config.json',
                content: this.generateOnlookConfig(projectId, options),
            });
        }

        return files;
    }

    private static generateReadme(projectName: string, description?: string): string {
        return `# ${projectName}

${description || 'Project exported from Onlook'}

## Getting Started

This project was created with [Onlook](https://onlook.dev) - a visual editor for React applications.

### Development

\`\`\`bash
# Install dependencies
npm install

# Start the development server
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Editing with Onlook

To continue editing this project with Onlook:

1. Open Onlook
2. Import this repository
3. Start designing visually

## Learn More

- [Onlook Documentation](https://docs.onlook.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy

You can deploy this project on Vercel, Netlify, or any other platform that supports Next.js.

---

Made with ❤️ using [Onlook](https://onlook.dev)
`;
    }

    private static generatePackageJson(projectName: string, description?: string): string {
        const packageJson = {
            name: projectName.toLowerCase().replace(/\s+/g, '-'),
            version: '0.1.0',
            description: description || 'Project exported from Onlook',
            private: true,
            scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start',
                lint: 'next lint',
            },
            dependencies: {
                next: '^14.0.0',
                react: '^18.0.0',
                'react-dom': '^18.0.0',
                '@types/node': '^20.0.0',
                '@types/react': '^18.0.0',
                '@types/react-dom': '^18.0.0',
                autoprefixer: '^10.0.0',
                postcss: '^8.0.0',
                tailwindcss: '^3.3.0',
                typescript: '^5.0.0',
            },
            devDependencies: {
                eslint: '^8.0.0',
                'eslint-config-next': '^14.0.0',
            },
            keywords: ['onlook', 'nextjs', 'react', 'tailwindcss'],
            author: 'Onlook',
            homepage: 'https://onlook.dev',
        };

        return JSON.stringify(packageJson, null, 2);
    }

    private static generateGitignore(): string {
        return `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.tsbuildinfo

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local

# Vercel
.vercel

# Onlook
.onlook/
`;
    }

    private static generateNextConfig(): string {
        return `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [],
  },
}

module.exports = nextConfig
`;
    }

    private static generateTailwindConfig(): string {
        return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;
    }

    private static generatePostCSSConfig(): string {
        return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
    }

    private static generateTSConfig(): string {
        const tsconfig = {
            compilerOptions: {
                target: 'es5',
                lib: ['dom', 'dom.iterable', 'es6'],
                allowJs: true,
                skipLibCheck: true,
                strict: true,
                forceConsistentCasingInFileNames: true,
                noEmit: true,
                esModuleInterop: true,
                module: 'esnext',
                moduleResolution: 'bundler',
                resolveJsonModule: true,
                isolatedModules: true,
                jsx: 'preserve',
                incremental: true,
                plugins: [
                    {
                        name: 'next',
                    },
                ],
                paths: {
                    '@/*': ['./*'],
                },
            },
            include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
            exclude: ['node_modules'],
        };

        return JSON.stringify(tsconfig, null, 2);
    }

    private static generateRootLayout(projectName: string): string {
        return `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${projectName}',
  description: 'Created with Onlook',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
`;
    }

    private static generateHomePage(projectName: string): string {
        return `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to ${projectName}
        </h1>
        
        <p className="text-center text-gray-600 mb-8">
          This project was created with Onlook - a visual editor for React applications.
        </p>
        
        <div className="flex items-center justify-center space-x-4">
          <a
            href="https://onlook.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Learn about Onlook
          </a>
          
          <a
            href="https://docs.onlook.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Documentation
          </a>
        </div>
      </div>
    </main>
  )
}
`;
    }

    private static generateGlobalCSS(): string {
        return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}
`;
    }

    private static generateOnlookConfig(projectId: string, options: ExportOptions): string {
        const config = {
            version: '1.0.0',
            projectId,
            projectName: options.projectName,
            description: options.description,
            framework: 'nextjs',
            exportedAt: new Date().toISOString(),
            onlookVersion: '1.0.0', // This should come from package.json or environment
        };

        return JSON.stringify(config, null, 2);
    }
}