import type { FigmaAuth, FigmaImportResult, FigmaComponent, FigmaAsset, DesignToken } from './types';
import type { ImportResult } from '../types';
import { FigmaApiClient } from './api-client';
import { FigmaFileParser } from './parser';

export class FigmaIntegrationService {
    private apiClient?: FigmaApiClient;

    async authenticate(token: string): Promise<FigmaAuth> {
        const auth: FigmaAuth = {
            accessToken: token,
        };
        
        this.apiClient = new FigmaApiClient(auth);
        
        // Validate token by making a test request
        try {
            await this.apiClient.getUser();
            return auth;
        } catch (error) {
            throw new Error(`Authentication failed: ${error}`);
        }
    }

    async importFile(fileId: string): Promise<FigmaImportResult> {
        if (!this.apiClient) {
            throw new Error('Not authenticated. Call authenticate() first.');
        }

        try {
            // Get file data from Figma API
            const fileData = await this.apiClient.getFile(fileId);
            
            // Parse the document
            const parsed = FigmaFileParser.parseDocument(fileData.document);
            
            // Get asset URLs for images
            const assetIds = parsed.assets.map(asset => asset.id);
            let assetUrls: Record<string, string> = {};
            
            if (assetIds.length > 0) {
                const imageResponse = await this.apiClient.getFileImages(fileId, assetIds);
                assetUrls = imageResponse.images || {};
            }
            
            // Update assets with URLs
            const assetsWithUrls = parsed.assets.map(asset => ({
                ...asset,
                url: assetUrls[asset.id] || '',
            }));
            
            // Extract design tokens
            const designTokens = FigmaFileParser.extractDesignTokens(fileData);
            
            return {
                fileId,
                components: parsed.components,
                assets: assetsWithUrls,
                designTokens,
            };
        } catch (error) {
            throw new Error(`Failed to import Figma file: ${error}`);
        }
    }

    async extractAssets(fileId: string): Promise<FigmaAsset[]> {
        const importResult = await this.importFile(fileId);
        return importResult.assets;
    }

    async convertComponents(figmaComponents: FigmaComponent[]): Promise<ImportResult> {
        try {
            // Convert Figma components to code components
            const codeComponents = figmaComponents.map(component => ({
                id: component.id,
                name: component.name,
                code: this.generateComponentCode(component),
                framework: 'react' as const,
            }));

            return {
                success: true,
                message: `Successfully converted ${codeComponents.length} components`,
                data: codeComponents,
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to convert components: ${error}`,
                errors: [String(error)],
            };
        }
    }

    async extractDesignTokens(fileId: string): Promise<DesignToken[]> {
        if (!this.apiClient) {
            throw new Error('Not authenticated. Call authenticate() first.');
        }

        try {
            const fileData = await this.apiClient.getFile(fileId);
            return FigmaFileParser.extractDesignTokens(fileData);
        } catch (error) {
            throw new Error(`Failed to extract design tokens: ${error}`);
        }
    }

    /**
     * Generate React component code from Figma component
     */
    private generateComponentCode(component: FigmaComponent): string {
        const componentName = this.sanitizeComponentName(component.name);
        const props = this.generatePropsInterface(component);
        const styles = this.generateComponentStyles(component);
        const jsx = this.generateJSX(component);

        return `
import React from 'react';

${props}

export const ${componentName}: React.FC<${componentName}Props> = (props) => {
  return (
    ${jsx}
  );
};

${styles}
        `.trim();
    }

    /**
     * Sanitize component name for code generation
     */
    private sanitizeComponentName(name: string): string {
        return name
            .replace(/[^a-zA-Z0-9]/g, '')
            .replace(/^[0-9]/, 'Component$&')
            || 'Component';
    }

    /**
     * Generate TypeScript props interface
     */
    private generatePropsInterface(component: FigmaComponent): string {
        const props = component.properties
            .filter(prop => prop.type !== 'VARIANT_SET')
            .map(prop => `  ${prop.name}?: ${this.getTypeScriptType(prop.type)};`)
            .join('\n');

        return `interface ${this.sanitizeComponentName(component.name)}Props {
${props}
}`;
    }

    /**
     * Get TypeScript type from Figma property type
     */
    private getTypeScriptType(figmaType: string): string {
        switch (figmaType) {
            case 'BOOLEAN': return 'boolean';
            case 'TEXT': return 'string';
            case 'INSTANCE_SWAP': return 'React.ReactNode';
            default: return 'any';
        }
    }

    /**
     * Generate component styles
     */
    private generateComponentStyles(component: FigmaComponent): string {
        const className = this.sanitizeComponentName(component.name).toLowerCase();
        const styles = component.styles
            .map(style => `  ${style.cssProperty}: ${style.cssValue};`)
            .join('\n');

        return `
const styles = {
  ${className}: {
${styles}
  }
};`;
    }

    /**
     * Generate JSX for component
     */
    private generateJSX(component: FigmaComponent): string {
        const className = this.sanitizeComponentName(component.name).toLowerCase();
        
        if (component.children.length === 0) {
            return `<div style={styles.${className}} />`;
        }

        const childrenJSX = component.children
            .map(child => this.generateChildJSX(child))
            .join('\n      ');

        return `<div style={styles.${className}}>
      ${childrenJSX}
    </div>`;
    }

    /**
     * Generate JSX for child components
     */
    private generateChildJSX(child: FigmaComponent): string {
        const childName = this.sanitizeComponentName(child.name).toLowerCase();
        
        if (child.type === 'TEXT') {
            return `<span className="${childName}">Text Content</span>`;
        }
        
        if (child.children.length === 0) {
            return `<div className="${childName}" />`;
        }

        const childrenJSX = child.children
            .map(grandchild => this.generateChildJSX(grandchild))
            .join('\n        ');

        return `<div className="${childName}">
        ${childrenJSX}
      </div>`;
    }
}