import path from 'path';

function generatePascalCaseName(fileName: string, extension: string): string {
    const baseName = path.basename(fileName, extension)
        .split(/[-_]/)
        .filter(word => word.length > 0) // Filter out empty words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');

    return baseName || 'Component';
}

export const FILE_TEMPLATES = {
    // React TypeScript Component
    '.tsx': (fileName: string) => {
        const componentName = generatePascalCaseName(fileName, '.tsx');

        return `import { type ReactNode } from 'react'

type ${componentName}Props = {
    className?: string
    children?: ReactNode
}

export default function ${componentName}({ className, children }: ${componentName}Props) {
    return (
        <div className={className}>
            {children || <h1>Hello from ${componentName}</h1>}
        </div>
    )
}
`;
    },
    // TypeScript Module
    '.ts': (fileName: string) => {
        const functionName = generatePascalCaseName(fileName, '.ts');

        return `export interface ${functionName}Options {
    // Add your interface properties here
}

export defaultfunction ${functionName}(options?: ${functionName}Options): void {
    // Add your logic here
}
`;
    },
    // JavaScript Function
    '.js': (fileName: string) => {
        const functionName = generatePascalCaseName(fileName, '.js');

        return `export default function ${functionName}() {
    // Add your logic here
}
`;
    },

    // CSS Stylesheet
    '.css': (fileName: string) => {
        const className = path.basename(fileName, '.css').toLowerCase().replace(/[^a-z0-9]/g, '-');

        return `
.${className} {
    /* Add your styles here */
}

.${className}__element {
    /* BEM methodology example */
}

.${className}--modifier {
    /* Modifier styles */
}
`;
    },

    // SCSS Stylesheet
    '.scss': (fileName: string) => {
        const className = path.basename(fileName, '.scss').toLowerCase().replace(/[^a-z0-9]/g, '-');

        return `.${className} {
    // Add your styles here
    
    &__element {
        // Nested element styles
    }
    
    &--modifier {
        // Modifier styles
    }
    
    &:hover {
        // Hover styles
    }
}
`;
    },

    // JSON Data
    '.json': () => `{
    "properties": {}
}
`,

    // Markdown Documentation
    '.md': (fileName: string) => {
        const title = path.basename(fileName, '.md')
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        return `# ${title}

## Overview

Add your content here.

## Getting Started

1. First step
2. Second step
3. Third step

## Examples

\`\`\`javascript
// Add code examples here
console.log('Hello, ${title}!');
\`\`\`

## References

- [Link 1](#)
- [Link 2](#)
`;
    },

    // HTML Document
    '.html': (fileName: string) => {
        const title = path.basename(fileName, '.html')
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            margin: 0;
            padding: 2rem;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <header>
        <h1>${title}</h1>
    </header>
    
    <main>
        <p>Welcome to ${title}!</p>
    </main>
    
    <footer>
        <p>&copy; ${new Date().getFullYear()} - Created on ${new Date().toLocaleDateString()}</p>
    </footer>
</body>
</html>
`;
    },

    // Environment Configuration
    '.env': () => `# Environment Configuration

# Database
DATABASE_URL=

# API Keys
API_KEY=

# Application
NODE_ENV=development
PORT=3000

# Add your environment variables here
`,
} as const;

// Default fallback for unknown extensions
export const DEFAULT_TEMPLATE = (fileName: string) => `
// Add your content here
`;

/**
 * Get file template content based on filename
 */
export function getFileTemplate(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const baseName = path.basename(fileName).toLowerCase();

    // Check for specific filenames first
    if (baseName in FILE_TEMPLATES) {
        return FILE_TEMPLATES[baseName as keyof typeof FILE_TEMPLATES](fileName);
    }

    // Check by extension
    if (ext in FILE_TEMPLATES) {
        return FILE_TEMPLATES[ext as keyof typeof FILE_TEMPLATES](fileName);
    }

    // Return default template
    return DEFAULT_TEMPLATE(fileName);
}