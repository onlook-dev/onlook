# Requirements Document

## Introduction

This specification defines a comprehensive set of platform extensions for Onlook that will transform it from a Next.js/Tailwind-focused visual editor into a universal design-to-code platform. The extensions include external integrations (Figma, GitHub), enhanced collaboration features, asset management, project setup automation, self-referential tooling capabilities, and support for diverse technology stacks.

## Glossary

- **Onlook_Platform**: The core visual editor system for web applications
- **Figma_Integration**: Service that imports designs and assets from Figma files
- **GitHub_Integration**: Service that manages repository operations, PR creation, and branch management
- **Components_Panel**: Drag-and-drop interface for adding UI components to projects
- **Comment_System**: Collaborative annotation system for design reviews and feedback
- **Asset_Manager**: System for managing images, icons, and other media assets
- **MCP_Integration**: Model Context Protocol integration for enhanced AI capabilities
- **Self_Toolcall**: Onlook's ability to use its own APIs for recursive operations
- **Universal_Project_Support**: Framework-agnostic project handling beyond Next.js
- **Universal_Styling_Support**: CSS framework support beyond Tailwind

## Requirements

### Requirement 1

**User Story:** As a designer, I want to import designs and assets from Figma, so that I can seamlessly transition from design to development.

#### Acceptance Criteria

1. WHEN a user provides a Figma file URL THEN the Figma_Integration SHALL authenticate with Figma API and retrieve the design data
2. WHEN importing Figma designs THEN the system SHALL extract components, styles, and assets into Onlook-compatible formats
3. WHEN Figma assets are imported THEN the Asset_Manager SHALL store images, icons, and other media with proper organization
4. WHEN Figma components are processed THEN the system SHALL generate corresponding code components with accurate styling
5. WHEN Figma design tokens are present THEN the system SHALL convert them to appropriate CSS variables or framework tokens

### Requirement 2

**User Story:** As a developer, I want to create pull requests to GitHub repositories directly from Onlook, so that I can streamline my development workflow.

#### Acceptance Criteria

1. WHEN a user connects a GitHub repository THEN the GitHub_Integration SHALL authenticate and establish repository access
2. WHEN changes are made in Onlook THEN the system SHALL track all modifications for commit preparation
3. WHEN creating a pull request THEN the GitHub_Integration SHALL create a new branch with descriptive naming
4. WHEN submitting changes THEN the system SHALL commit code changes with meaningful commit messages
5. WHEN a PR is created THEN the GitHub_Integration SHALL include proper descriptions and link to design references

### Requirement 3

**User Story:** As a developer, I want a drag-and-drop components panel, so that I can quickly add UI elements to my projects.

#### Acceptance Criteria

1. WHEN the Components_Panel is opened THEN the system SHALL display categorized UI components available for the current project
2. WHEN a component is dragged from the panel THEN the system SHALL provide visual feedback during the drag operation
3. WHEN a component is dropped onto the canvas THEN the system SHALL insert the component with appropriate default props
4. WHEN components are filtered THEN the Components_Panel SHALL show only matching components based on search criteria
5. WHEN custom components exist THEN the Components_Panel SHALL include project-specific components alongside built-in ones

### Requirement 4

**User Story:** As a team member, I want to leave comments on designs and code, so that I can collaborate effectively with my team.

#### Acceptance Criteria

1. WHEN a user clicks on any element THEN the Comment_System SHALL allow adding contextual comments
2. WHEN comments are added THEN the system SHALL store them with user attribution and timestamps
3. WHEN viewing comments THEN the system SHALL display them as visual indicators on the relevant elements
4. WHEN comments are resolved THEN the Comment_System SHALL mark them as completed and optionally hide them
5. WHEN team members are mentioned THEN the system SHALL send appropriate notifications

### Requirement 5

**User Story:** As a designer, I want to use images as references and assets in projects, so that I can maintain visual consistency and provide context.

#### Acceptance Criteria

1. WHEN images are uploaded THEN the Asset_Manager SHALL store them in organized project directories
2. WHEN images are used as references THEN the system SHALL display them as overlays or side panels for comparison
3. WHEN images are used as assets THEN the system SHALL optimize them for web delivery with appropriate formats
4. WHEN assets are referenced in code THEN the system SHALL generate proper import statements and file paths
5. WHEN assets are updated THEN the system SHALL propagate changes to all references automatically

### Requirement 6

**User Story:** As a developer, I want automated project setup with MCP integration, so that I can quickly start new projects with AI-enhanced capabilities.

#### Acceptance Criteria

1. WHEN creating a new project THEN the system SHALL offer MCP_Integration setup as part of the initialization process
2. WHEN MCP is configured THEN the system SHALL install and configure appropriate MCP servers for the project type
3. WHEN project templates are used THEN the system SHALL include MCP configurations suitable for the chosen stack
4. WHEN MCP tools are available THEN the system SHALL expose them through Onlook's interface for enhanced development
5. WHEN MCP configurations change THEN the system SHALL update project settings and restart services as needed

### Requirement 7

**User Story:** As a power user, I want Onlook to use itself as a toolcall for branch creation and iteration, so that I can leverage recursive development capabilities.

#### Acceptance Criteria

1. WHEN Self_Toolcall is enabled THEN the Onlook_Platform SHALL expose its own APIs as available tools
2. WHEN creating branches recursively THEN the system SHALL use its GitHub_Integration to manage branch operations
3. WHEN iterating on designs THEN the system SHALL use its own visual editing capabilities programmatically
4. WHEN self-referential operations are performed THEN the system SHALL prevent infinite loops and resource exhaustion
5. WHEN recursive operations complete THEN the system SHALL provide clear audit trails of all automated actions

### Requirement 8

**User Story:** As a developer using various frameworks, I want Onlook to support non-Next.js projects, so that I can use it with my preferred technology stack.

#### Acceptance Criteria

1. WHEN detecting project types THEN the Universal_Project_Support SHALL identify React, Vue, Angular, and vanilla HTML projects
2. WHEN working with different frameworks THEN the system SHALL adapt its code generation to framework-specific patterns
3. WHEN parsing non-Next.js projects THEN the system SHALL understand component structures and routing patterns
4. WHEN generating code THEN the system SHALL use appropriate imports, exports, and file structures for each framework
5. WHEN building projects THEN the system SHALL integrate with framework-specific build tools and development servers

### Requirement 9

**User Story:** As a developer using different CSS approaches, I want Onlook to support non-Tailwind projects, so that I can maintain my existing styling methodology.

#### Acceptance Criteria

1. WHEN detecting styling approaches THEN the Universal_Styling_Support SHALL identify CSS Modules, Styled Components, Emotion, and vanilla CSS
2. WHEN generating styles THEN the system SHALL output CSS in the format appropriate for the detected styling system
3. WHEN editing styles visually THEN the system SHALL translate visual changes to the correct CSS syntax and structure
4. WHEN importing designs THEN the system SHALL convert design tokens to the appropriate styling format for the project
5. WHEN working with existing styles THEN the system SHALL preserve and extend current styling patterns without conflicts

### Requirement 10

**User Story:** As a project maintainer, I want all changes to be committed back to my repository, so that I can review and merge improvements through standard development processes.

#### Acceptance Criteria

1. WHEN development work is completed THEN the system SHALL prepare all changes for repository submission
2. WHEN creating commits THEN the GitHub_Integration SHALL generate descriptive commit messages based on the changes made
3. WHEN submitting to repositories THEN the system SHALL create pull requests with comprehensive descriptions and change summaries
4. WHEN conflicts exist THEN the system SHALL identify merge conflicts and provide resolution guidance
5. WHEN PRs are created THEN the system SHALL include links to design references, testing instructions, and implementation notes