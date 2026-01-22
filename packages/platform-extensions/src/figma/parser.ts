import type { FigmaComponent, FigmaAsset, DesignToken } from './types';

/**
 * Enhanced Figma file parser with comprehensive node processing
 */
export class FigmaFileParser {
    /**
     * Parse Figma file document and extract all relevant data
     */
    static parseDocument(document: any): {
        components: FigmaComponent[];
        assets: FigmaAsset[];
        pages: any[];
        artboards: any[];
    } {
        const components: FigmaComponent[] = [];
        const assets: FigmaAsset[] = [];
        const pages: any[] = [];
        const artboards: any[] = [];

        // Process each page in the document
        if (document.children) {
            for (const page of document.children) {
                pages.push(this.parsePage(page));
                
                // Extract components and assets from page
                const pageData = this.extractFromNode(page);
                components.push(...pageData.components);
                assets.push(...pageData.assets);
                artboards.push(...pageData.artboards);
            }
        }

        return { components, assets, pages, artboards };
    }

    /**
     * Parse a single page
     */
    private static parsePage(page: any): any {
        return {
            id: page.id,
            name: page.name,
            type: page.type,
            backgroundColor: page.backgroundColor,
            children: page.children?.length || 0,
            metadata: {
                visible: page.visible,
                locked: page.locked,
                exportSettings: page.exportSettings,
            },
        };
    }

    /**
     * Recursively extract components and assets from a node
     */
    private static extractFromNode(node: any): {
        components: FigmaComponent[];
        assets: FigmaAsset[];
        artboards: any[];
    } {
        const components: FigmaComponent[] = [];
        const assets: FigmaAsset[] = [];
        const artboards: any[] = [];

        // Check if this node is a component
        if (this.isComponent(node)) {
            components.push(this.parseComponent(node));
        }

        // Check if this node is an artboard/frame
        if (this.isArtboard(node)) {
            artboards.push(this.parseArtboard(node));
        }

        // Check if this node contains assets
        const nodeAssets = this.extractAssets(node);
        assets.push(...nodeAssets);

        // Recursively process children
        if (node.children) {
            for (const child of node.children) {
                const childData = this.extractFromNode(child);
                components.push(...childData.components);
                assets.push(...childData.assets);
                artboards.push(...childData.artboards);
            }
        }

        return { components, assets, artboards };
    }

    /**
     * Check if node is a component
     */
    private static isComponent(node: any): boolean {
        return node.type === 'COMPONENT' || node.type === 'COMPONENT_SET';
    }

    /**
     * Check if node is an artboard/frame
     */
    private static isArtboard(node: any): boolean {
        return node.type === 'FRAME' && node.parent?.type === 'PAGE';
    }

    /**
     * Parse component node
     */
    private static parseComponent(node: any): FigmaComponent {
        return {
            id: node.id,
            name: node.name,
            type: node.type,
            properties: this.extractComponentProperties(node),
            styles: this.extractNodeStyles(node),
            children: this.parseComponentChildren(node),
        };
    }

    /**
     * Parse artboard/frame
     */
    private static parseArtboard(node: any): any {
        return {
            id: node.id,
            name: node.name,
            type: node.type,
            width: node.absoluteBoundingBox?.width || 0,
            height: node.absoluteBoundingBox?.height || 0,
            backgroundColor: node.backgroundColor,
            constraints: node.constraints,
            layoutMode: node.layoutMode,
            children: node.children?.length || 0,
        };
    }

    /**
     * Extract component properties and variants
     */
    private static extractComponentProperties(node: any): any[] {
        const properties: any[] = [];

        // Component property definitions
        if (node.componentPropertyDefinitions) {
            for (const [key, prop] of Object.entries(node.componentPropertyDefinitions)) {
                properties.push({
                    name: key,
                    type: (prop as any).type,
                    defaultValue: (prop as any).defaultValue,
                    variantOptions: (prop as any).variantOptions,
                });
            }
        }

        // Component set variants
        if (node.type === 'COMPONENT_SET' && node.children) {
            const variants = node.children.map((variant: any) => ({
                id: variant.id,
                name: variant.name,
                properties: variant.variantProperties || {},
            }));
            properties.push({
                name: 'variants',
                type: 'VARIANT_SET',
                variants,
            });
        }

        return properties;
    }

    /**
     * Extract styling information from node
     */
    private static extractNodeStyles(node: any): any[] {
        const styles: any[] = [];

        // Fill styles
        if (node.fills && node.fills.length > 0) {
            styles.push({
                property: 'fills',
                value: node.fills,
                cssProperty: 'background',
                cssValue: this.convertFillsToCSS(node.fills),
            });
        }

        // Stroke styles
        if (node.strokes && node.strokes.length > 0) {
            styles.push({
                property: 'strokes',
                value: node.strokes,
                cssProperty: 'border',
                cssValue: this.convertStrokesToCSS(node.strokes, node.strokeWeight),
            });
        }

        // Text styles
        if (node.style) {
            styles.push({
                property: 'typography',
                value: node.style,
                cssProperty: 'font',
                cssValue: this.convertTextStyleToCSS(node.style),
            });
        }

        // Effects (shadows, blurs)
        if (node.effects && node.effects.length > 0) {
            styles.push({
                property: 'effects',
                value: node.effects,
                cssProperty: 'box-shadow',
                cssValue: this.convertEffectsToCSS(node.effects),
            });
        }

        // Layout properties
        if (node.layoutMode) {
            styles.push({
                property: 'layout',
                value: {
                    layoutMode: node.layoutMode,
                    itemSpacing: node.itemSpacing,
                    paddingLeft: node.paddingLeft,
                    paddingRight: node.paddingRight,
                    paddingTop: node.paddingTop,
                    paddingBottom: node.paddingBottom,
                },
                cssProperty: 'display',
                cssValue: node.layoutMode === 'HORIZONTAL' ? 'flex' : 'block',
            });
        }

        return styles;
    }

    /**
     * Parse component children recursively
     */
    private static parseComponentChildren(node: any): FigmaComponent[] {
        const children: FigmaComponent[] = [];

        if (node.children) {
            for (const child of node.children) {
                if (this.isComponent(child)) {
                    children.push(this.parseComponent(child));
                } else {
                    // For non-component children, create a simplified representation
                    children.push({
                        id: child.id,
                        name: child.name || child.type,
                        type: child.type,
                        properties: [],
                        styles: this.extractNodeStyles(child),
                        children: this.parseComponentChildren(child),
                    });
                }
            }
        }

        return children;
    }

    /**
     * Extract assets (images, icons) from node
     */
    private static extractAssets(node: any): FigmaAsset[] {
        const assets: FigmaAsset[] = [];

        // Check for image fills
        if (node.fills) {
            for (const fill of node.fills) {
                if (fill.type === 'IMAGE' && fill.imageRef) {
                    assets.push({
                        id: fill.imageRef,
                        name: node.name || 'Image Asset',
                        type: 'image',
                        url: '', // Will be populated by API call
                        format: 'png',
                        size: 0,
                    });
                }
            }
        }

        // Check for vector/icon nodes
        if (node.type === 'VECTOR' || (node.type === 'BOOLEAN_OPERATION' && this.isIcon(node))) {
            assets.push({
                id: node.id,
                name: node.name || 'Vector Asset',
                type: 'icon',
                url: '', // Will be populated by API call
                format: 'svg',
                size: 0,
            });
        }

        return assets;
    }

    /**
     * Check if node represents an icon
     */
    private static isIcon(node: any): boolean {
        // Heuristics to determine if a node is likely an icon
        const bounds = node.absoluteBoundingBox;
        if (!bounds) return false;

        const width = bounds.width;
        const height = bounds.height;
        const aspectRatio = width / height;

        // Icons are typically small and square-ish
        return width <= 100 && height <= 100 && aspectRatio >= 0.5 && aspectRatio <= 2;
    }

    /**
     * Convert Figma fills to CSS
     */
    private static convertFillsToCSS(fills: any[]): string {
        const visibleFills = fills.filter(fill => fill.visible !== false);
        if (visibleFills.length === 0) return 'transparent';

        const fill = visibleFills[0]; // Use first visible fill
        
        switch (fill.type) {
            case 'SOLID':
                return this.rgbaToCSS(fill.color, fill.opacity);
            case 'GRADIENT_LINEAR':
                return this.gradientToCSS(fill);
            case 'IMAGE':
                return `url(/* image-${fill.imageRef} */)`;
            default:
                return 'transparent';
        }
    }

    /**
     * Convert Figma strokes to CSS border
     */
    private static convertStrokesToCSS(strokes: any[], strokeWeight?: number): string {
        const visibleStrokes = strokes.filter(stroke => stroke.visible !== false);
        if (visibleStrokes.length === 0) return 'none';

        const stroke = visibleStrokes[0];
        const weight = strokeWeight || 1;
        const color = this.rgbaToCSS(stroke.color, stroke.opacity);
        
        return `${weight}px solid ${color}`;
    }

    /**
     * Convert Figma text style to CSS
     */
    private static convertTextStyleToCSS(style: any): string {
        const fontSize = style.fontSize || 16;
        const fontFamily = style.fontFamily || 'sans-serif';
        const fontWeight = style.fontWeight || 400;
        const lineHeight = style.lineHeightPx ? `${style.lineHeightPx}px` : 'normal';
        
        return `${fontWeight} ${fontSize}px/${lineHeight} "${fontFamily}"`;
    }

    /**
     * Convert Figma effects to CSS
     */
    private static convertEffectsToCSS(effects: any[]): string {
        const shadows = effects
            .filter(effect => effect.type === 'DROP_SHADOW' && effect.visible !== false)
            .map(effect => {
                const x = effect.offset?.x || 0;
                const y = effect.offset?.y || 0;
                const blur = effect.radius || 0;
                const color = this.rgbaToCSS(effect.color, effect.color?.a);
                return `${x}px ${y}px ${blur}px ${color}`;
            });

        return shadows.length > 0 ? shadows.join(', ') : 'none';
    }

    /**
     * Convert Figma gradient to CSS
     */
    private static gradientToCSS(fill: any): string {
        if (!fill.gradientStops || fill.gradientStops.length === 0) {
            return 'transparent';
        }

        const stops = fill.gradientStops
            .map((stop: any) => {
                const color = this.rgbaToCSS(stop.color, stop.color?.a);
                const position = Math.round(stop.position * 100);
                return `${color} ${position}%`;
            })
            .join(', ');

        // Calculate angle from gradient transform
        const angle = this.calculateGradientAngle(fill.gradientTransform);
        
        return `linear-gradient(${angle}deg, ${stops})`;
    }

    /**
     * Calculate gradient angle from transform matrix
     */
    private static calculateGradientAngle(transform?: number[][]): number {
        if (!transform || transform.length < 2 || !transform[0] || transform[0].length < 2) return 0;
        
        // Extract angle from transformation matrix
        const dx = transform[0][0];
        const dy = transform[0][1];
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        return Math.round(angle);
    }

    /**
     * Convert Figma color to CSS rgba
     */
    private static rgbaToCSS(color: any, opacity: number = 1): string {
        if (!color) return 'transparent';
        
        const r = Math.round((color.r || 0) * 255);
        const g = Math.round((color.g || 0) * 255);
        const b = Math.round((color.b || 0) * 255);
        const a = (opacity !== undefined ? opacity : color.a || 1);
        
        if (a === 1) {
            return `rgb(${r}, ${g}, ${b})`;
        } else {
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
    }

    /**
     * Extract design tokens from document
     */
    static extractDesignTokens(document: any): DesignToken[] {
        const tokens: DesignToken[] = [];

        // Extract color tokens from styles
        if (document.styles) {
            for (const [styleId, style] of Object.entries(document.styles)) {
                const styleData = style as any;
                if (styleData.styleType === 'FILL') {
                    tokens.push({
                        name: styleData.name,
                        value: this.convertFillsToCSS(styleData.fills || []),
                        type: 'color',
                    });
                } else if (styleData.styleType === 'TEXT') {
                    tokens.push({
                        name: styleData.name,
                        value: this.convertTextStyleToCSS(styleData.style || {}),
                        type: 'typography',
                    });
                } else if (styleData.styleType === 'EFFECT') {
                    tokens.push({
                        name: styleData.name,
                        value: this.convertEffectsToCSS(styleData.effects || []),
                        type: 'shadow',
                    });
                }
            }
        }

        return tokens;
    }
}