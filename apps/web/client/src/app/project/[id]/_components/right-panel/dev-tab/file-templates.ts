import path from 'path';

export const FILE_CATEGORIES = {
    REACT: ['.tsx', '.jsx'],
    TYPESCRIPT: ['.ts'],
    JAVASCRIPT: ['.js'],
    STYLES: ['.css', '.scss', '.sass', '.less'],
    DATA: ['.json', '.yaml', '.yml'],
    MARKUP: ['.html', '.xml'],
    DOCUMENTATION: ['.md', '.mdx', '.txt'],
    CONFIG: ['.env', '.gitignore', '.eslintrc', '.prettierrc'],
} as const;

export const FILE_EXTENSIONS = {
    '.tsx': 'typescript-react',
    '.ts': 'typescript',
    '.jsx': 'javascript-react', 
    '.js': 'javascript',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.json': 'json',
    '.html': 'html',
    '.xml': 'xml',
    '.md': 'markdown',
    '.mdx': 'markdown',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.txt': 'text',
} as const;

// File templates with proper formatting and best practices
export const FILE_TEMPLATES = {
    // React TypeScript Component
    '.tsx': (fileName: string) => {
        const componentName = path.basename(fileName, '.tsx')
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        
        return `import React from 'react';

interface ${componentName}Props {
    className?: string;
    children?: React.ReactNode;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ 
    className,
    children,
    ...props 
}) => {
    return (
        <div className={className} {...props}>
            {children || <h1>Hello from ${componentName}</h1>}
        </div>
    );
};

export default ${componentName};
`;
    },
    // TypeScript Module
    '.ts': (fileName: string) => {
        const moduleName = path.basename(fileName, '.ts')
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        
        return `/**
 * ${moduleName} module
 * Created: ${new Date().toLocaleDateString()}
 */

export interface ${moduleName}Config {
    // Add your interface properties here
}

export class ${moduleName} {
    constructor(private config: ${moduleName}Config) {}

    // Add your methods here
    public initialize(): void {
        console.log('${moduleName} initialized');
    }
}

export default ${moduleName};
`;
    },

    // JavaScript Module
    '.js': (fileName: string) => {
        const moduleName = path.basename(fileName, '.js')
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        
        return `/**
 * ${moduleName} module
 * Created: ${new Date().toLocaleDateString()}
 */

export class ${moduleName} {
    constructor(config = {}) {
        this.config = config;
    }

    // Add your methods here
    initialize() {
        console.log('${moduleName} initialized');
    }
}

export default ${moduleName};
`;
    },

    // CSS Stylesheet
    '.css': (fileName: string) => {
        const className = path.basename(fileName, '.css').toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        return `/* ${fileName} */
/* Created: ${new Date().toLocaleDateString()} */

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
        
        return `// ${fileName}
// Created: ${new Date().toLocaleDateString()}

.${className} {
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
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
        
    }
}
`,

    // Markdown Documentation
    '.md': (fileName: string) => {
        const title = path.basename(fileName, '.md')
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        return `# ${title}

> Created: ${new Date().toLocaleDateString()}

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
# Created: ${new Date().toLocaleDateString()}

# Database
DATABASE_URL=

# API Keys
API_KEY=

# Application
NODE_ENV=development
PORT=3000

# Add your environment variables here
`,

    // TypeScript Configuration
    'tsconfig.json': () => `{
    "compilerOptions": {
        "target": "ES2020",
        "lib": ["DOM", "DOM.Iterable", "ES6"],
        "allowJs": true,
        "skipLibCheck": true,
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "strict": true,
        "forceConsistentCasingInFileNames": true,
        "moduleResolution": "node",
        "resolveJsonModule": true,
        "isolatedModules": true,
        "noEmit": true,
        "jsx": "react-jsx"
    },
    "include": [
        "src/**/*"
    ],
    "exclude": [
        "node_modules"
    ]
}
`,

    // Package.json template
    'package.json': () => `{
    "name": "new-project",
    "version": "1.0.0",
    "description": "",
    "main": "index.js",
    "scripts": {
        "start": "node index.js",
        "dev": "nodemon index.js",
        "test": "jest",
        "build": "webpack --mode production"
    },
    "keywords": [],
    "author": "",
    "license": "MIT",
    "dependencies": {},
    "devDependencies": {}
}
`,
} as const;

// Default fallback for unknown extensions
export const DEFAULT_TEMPLATE = (fileName: string) => `// ${fileName}
// Created by Onlook: ${new Date().toLocaleDateString()}

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

/**
 * Get file language based on extension
 */
export function getFileLanguage(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    return FILE_EXTENSIONS[ext as keyof typeof FILE_EXTENSIONS] || 'text';
}

/**
 * Check if file extension is supported
 */
export function isSupportedFileType(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return ext in FILE_EXTENSIONS || path.basename(fileName).toLowerCase() in FILE_TEMPLATES;
}

/**
 * Get file category based on extension
 */
export function getFileCategory(fileName: string): string | null {
    const ext = path.extname(fileName).toLowerCase();
    
    for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
        if ((extensions as readonly string[]).includes(ext)) {
            return category;
        }
    }
    
    return null;
} 