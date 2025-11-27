import React from 'react';

export function EnterpriseFeaturesGridSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-20">
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Framework Agnostic</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Works with React, Vue, Angular, and more</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Onlook works with any framework that renders to the DOM. Whether your team uses React, Vue, Angular, or another framework, Onlook integrates seamlessly with your existing stack.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Existing Component Library</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Use components already in your codebase</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Import your existing codebase and start editing visually. No need to rebuild or recreate components. Your design system and component library work exactly as they are.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Designer-to-Code Workflow</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Designers ship changes directly to code</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Designers make visual changes that write directly to your codebase. Eliminate the handoff process and translation errors. What designers see is what gets shipped to production.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Component-Driven Architecture</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Built for component-driven development</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Onlook works seamlessly with component-driven architectures and existing design systems. Build, test, and document components in isolation while maintaining your current workflow.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Team Collaboration</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Design and development in one place</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Bridge the gap between design and development. Designers and developers work in the same environment, with code as the source of truth for both teams.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Enterprise Ready</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Built for large teams and complex codebases</p>
                    <p className="text-foreground-secondary text-regular text-balance leading-relaxed">
                        Onlook scales with your team. Integrate with your existing CI/CD, version control, and deployment workflows.
                    </p>
                </div>
            </div>
        </div>
    );
}

