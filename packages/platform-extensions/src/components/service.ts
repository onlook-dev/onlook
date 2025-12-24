import type { ComponentDefinition, ComponentCategory, DragOperation, DropTarget, ComponentInsertResult } from './types';

export class ComponentsPanelService {
    private components: ComponentDefinition[] = [];
    private categories: ComponentCategory[] = [];
    private currentDragOperation?: DragOperation;

    /**
     * Initialize components panel with built-in and custom components
     */
    async initialize(projectId: string): Promise<void> {
        // Load built-in components
        this.components = await this.loadBuiltInComponents();
        
        // Load custom components for project
        const customComponents = await this.loadCustomComponents(projectId);
        this.components.push(...customComponents);
        
        // Organize into categories
        this.categories = this.organizeIntoCategories(this.components);
    }

    /**
     * Get all component categories
     */
    getCategories(): ComponentCategory[] {
        return this.categories;
    }

    /**
     * Search components by name or tags
     */
    searchComponents(query: string): ComponentDefinition[] {
        const lowercaseQuery = query.toLowerCase();
        return this.components.filter(component =>
            component.name.toLowerCase().includes(lowercaseQuery) ||
            component.description?.toLowerCase().includes(lowercaseQuery) ||
            component.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
        );
    }

    /**
     * Filter components by category
     */
    filterByCategory(categoryId: string): ComponentDefinition[] {
        const category = this.categories.find(cat => cat.id === categoryId);
        return category ? category.components : [];
    }

    /**
     * Start drag operation
     */
    startDrag(componentId: string, startPosition: { x: number; y: number }): void {
        this.currentDragOperation = {
            componentId,
            startPosition,
            currentPosition: startPosition,
            isDragging: true,
        };
    }

    /**
     * Update drag position
     */
    updateDragPosition(position: { x: number; y: number }): void {
        if (this.currentDragOperation) {
            this.currentDragOperation.currentPosition = position;
        }
    }

    /**
     * End drag operation
     */
    endDrag(): void {
        this.currentDragOperation = undefined;
    }

    /**
     * Get current drag operation
     */
    getCurrentDragOperation(): DragOperation | undefined {
        return this.currentDragOperation;
    }

    /**
     * Validate drop target
     */
    validateDropTarget(elementId: string, position: { x: number; y: number }): DropTarget {
        // This would integrate with the visual editor to determine valid drop targets
        // For now, return a basic validation
        return {
            elementId,
            position: 'inside',
            isValid: true,
        };
    }

    /**
     * Insert component at drop target
     */
    async insertComponent(
        componentId: string,
        targetElementId: string,
        position: 'before' | 'after' | 'inside' | 'replace'
    ): Promise<ComponentInsertResult> {
        try {
            const component = this.components.find(c => c.id === componentId);
            if (!component) {
                return {
                    success: false,
                    error: 'Component not found',
                };
            }

            // Generate unique element ID
            const elementId = `${component.name.toLowerCase()}-${Date.now()}`;
            
            // This would integrate with the visual editor to actually insert the component
            // For now, simulate successful insertion
            await this.simulateComponentInsertion(component, targetElementId, position, elementId);

            return {
                success: true,
                elementId,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Add custom component to project
     */
    async addCustomComponent(projectId: string, component: Omit<ComponentDefinition, 'id' | 'isCustom'>): Promise<ComponentDefinition> {
        const customComponent: ComponentDefinition = {
            ...component,
            id: `custom-${Date.now()}`,
            isCustom: true,
        };

        // Save to database/storage
        await this.saveCustomComponent(projectId, customComponent);
        
        // Add to current components
        this.components.push(customComponent);
        
        // Update categories
        this.categories = this.organizeIntoCategories(this.components);

        return customComponent;
    }

    /**
     * Load built-in components
     */
    private async loadBuiltInComponents(): Promise<ComponentDefinition[]> {
        // This would load from a components library
        return [
            {
                id: 'button',
                name: 'Button',
                category: 'basic',
                description: 'Interactive button component',
                props: [
                    { name: 'children', type: 'node', required: true, description: 'Button content' },
                    { name: 'variant', type: 'enum', required: false, defaultValue: 'primary', options: ['primary', 'secondary', 'outline'] },
                    { name: 'size', type: 'enum', required: false, defaultValue: 'medium', options: ['small', 'medium', 'large'] },
                    { name: 'disabled', type: 'boolean', required: false, defaultValue: false },
                    { name: 'onClick', type: 'function', required: false, description: 'Click handler' },
                ],
                code: `<button className="btn btn-{variant} btn-{size}" disabled={disabled} onClick={onClick}>
  {children}
</button>`,
                framework: 'react',
                tags: ['interactive', 'form'],
                isCustom: false,
            },
            {
                id: 'input',
                name: 'Input',
                category: 'form',
                description: 'Text input field',
                props: [
                    { name: 'type', type: 'enum', required: false, defaultValue: 'text', options: ['text', 'email', 'password', 'number'] },
                    { name: 'placeholder', type: 'string', required: false },
                    { name: 'value', type: 'string', required: false },
                    { name: 'onChange', type: 'function', required: false },
                    { name: 'disabled', type: 'boolean', required: false, defaultValue: false },
                ],
                code: `<input 
  type={type} 
  placeholder={placeholder} 
  value={value} 
  onChange={onChange} 
  disabled={disabled}
  className="input"
/>`,
                framework: 'react',
                tags: ['form', 'input'],
                isCustom: false,
            },
            {
                id: 'card',
                name: 'Card',
                category: 'layout',
                description: 'Container with shadow and padding',
                props: [
                    { name: 'children', type: 'node', required: true },
                    { name: 'title', type: 'string', required: false },
                    { name: 'padding', type: 'enum', required: false, defaultValue: 'medium', options: ['small', 'medium', 'large'] },
                ],
                code: `<div className="card card-{padding}">
  {title && <h3 className="card-title">{title}</h3>}
  <div className="card-content">
    {children}
  </div>
</div>`,
                framework: 'react',
                tags: ['layout', 'container'],
                isCustom: false,
            },
        ];
    }

    /**
     * Load custom components for project
     */
    private async loadCustomComponents(projectId: string): Promise<ComponentDefinition[]> {
        // This would load from database
        // For now, return empty array
        return [];
    }

    /**
     * Organize components into categories
     */
    private organizeIntoCategories(components: ComponentDefinition[]): ComponentCategory[] {
        const categoryMap = new Map<string, ComponentDefinition[]>();
        
        components.forEach(component => {
            if (!categoryMap.has(component.category)) {
                categoryMap.set(component.category, []);
            }
            categoryMap.get(component.category)!.push(component);
        });

        return Array.from(categoryMap.entries()).map(([categoryId, categoryComponents]) => ({
            id: categoryId,
            name: this.getCategoryDisplayName(categoryId),
            description: this.getCategoryDescription(categoryId),
            components: categoryComponents,
        }));
    }

    /**
     * Get display name for category
     */
    private getCategoryDisplayName(categoryId: string): string {
        const displayNames: Record<string, string> = {
            basic: 'Basic',
            form: 'Form Controls',
            layout: 'Layout',
            navigation: 'Navigation',
            feedback: 'Feedback',
            data: 'Data Display',
            custom: 'Custom Components',
        };
        return displayNames[categoryId] || categoryId;
    }

    /**
     * Get description for category
     */
    private getCategoryDescription(categoryId: string): string {
        const descriptions: Record<string, string> = {
            basic: 'Essential UI components',
            form: 'Form inputs and controls',
            layout: 'Layout and container components',
            navigation: 'Navigation and menu components',
            feedback: 'Alerts, modals, and notifications',
            data: 'Tables, lists, and data visualization',
            custom: 'Project-specific custom components',
        };
        return descriptions[categoryId] || '';
    }

    /**
     * Simulate component insertion (would integrate with visual editor)
     */
    private async simulateComponentInsertion(
        component: ComponentDefinition,
        targetElementId: string,
        position: string,
        elementId: string
    ): Promise<void> {
        // This would integrate with the visual editor's DOM manipulation
        console.log(`Inserting component ${component.name} at ${position} of ${targetElementId} with ID ${elementId}`);
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Save custom component to storage
     */
    private async saveCustomComponent(projectId: string, component: ComponentDefinition): Promise<void> {
        // This would save to database
        console.log(`Saving custom component ${component.name} for project ${projectId}`);
    }
}