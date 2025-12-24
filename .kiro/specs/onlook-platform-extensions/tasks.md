# Implementation Plan

## Overview

This implementation plan converts the platform extensions design into a series of incremental development tasks. Each task builds on previous work and focuses on delivering functional components that can be tested and validated independently. The plan emphasizes early integration with existing Onlook architecture while maintaining clean separation of concerns.

## Tasks

- [x] 1. Set up core infrastructure and database schema
  - Create database migrations for new tables (figma_files, github_repositories, comments, assets, mcp_configs)
  - Set up new package structure for platform extensions
  - Configure environment variables for external API integrations
  - _Requirements: 1.1, 2.1, 4.2, 5.1, 6.2_

- [ ]* 1.1 Write property test for database schema integrity
  - **Property 1: Database schema consistency**
  - **Validates: Requirements 1.1, 2.1, 4.2, 5.1**

- [ ] 2. Implement Figma integration service
  - [x] 2.1 Create Figma authentication and API client
    - Implement OAuth flow for Figma API access
    - Create secure token storage and refresh mechanisms
    - Build API client with rate limiting and error handling
    - _Requirements: 1.1_

  - [ ]* 2.2 Write property test for Figma authentication
    - **Property 1: Figma Import Consistency**
    - **Validates: Requirements 1.1**

  - [x] 2.3 Implement Figma file import and parsing
    - Build file data extraction from Figma API
    - Parse components, styles, and design tokens
    - Convert Figma data structures to Onlook formats
    - _Requirements: 1.2, 1.4, 1.5_

  - [ ]* 2.4 Write property test for Figma data conversion
    - **Property 1: Figma Import Consistency**
    - **Validates: Requirements 1.2, 1.4, 1.5**

  - [x] 2.5 Implement Figma asset extraction
    - Extract images, icons, and media from Figma files
    - Optimize assets for web delivery
    - Store assets in organized project directories
    - _Requirements: 1.3_

  - [ ]* 2.6 Write unit tests for Figma asset handling
    - Test asset extraction and optimization
    - Test error handling for invalid assets
    - _Requirements: 1.3_

- [ ] 3. Implement GitHub integration service
  - [x] 3.1 Create GitHub authentication and repository access
    - Implement GitHub OAuth flow
    - Build repository listing and access validation
    - Create secure token management
    - _Requirements: 2.1_

  - [x] 3.2 Implement branch creation and management
    - Create new branches with descriptive naming
    - Track changes for commit preparation
    - Handle branch conflicts and merging
    - _Requirements: 2.2, 2.3_

  - [ ]* 3.3 Write property test for GitHub workflow
    - **Property 2: GitHub Workflow Completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

  - [x] 3.4 Implement pull request creation
    - Generate meaningful commit messages
    - Create comprehensive PR descriptions
    - Link to design references and implementation notes
    - _Requirements: 2.4, 2.5_

  - [ ]* 3.5 Write unit tests for GitHub integration
    - Test authentication and repository access
    - Test branch creation and PR generation
    - _Requirements: 2.1, 2.4, 2.5_

- [x] 4. Checkpoint - Ensure external integrations work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Components Panel
  - [x] 5.1 Create drag-and-drop components interface
    - Build categorized component display
    - Implement drag-and-drop functionality with visual feedback
    - Handle component insertion with default props
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 5.2 Write property test for Components Panel display
    - **Property 3: Components Panel Display Accuracy**
    - **Validates: Requirements 3.1, 3.4, 3.5**

  - [x] 5.3 Implement component search and filtering
    - Add search functionality for components
    - Implement category-based filtering
    - Support custom component integration
    - _Requirements: 3.4, 3.5_

  - [ ]* 5.4 Write property test for drag-drop functionality
    - **Property 4: Component Drag-Drop Functionality**
    - **Validates: Requirements 3.2, 3.3**

- [ ] 6. Implement Comment System
  - [x] 6.1 Create contextual commenting interface
    - Add comment creation on element click
    - Implement visual comment indicators
    - Store comments with user attribution and timestamps
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.2 Implement comment management features
    - Add comment resolution and status tracking
    - Implement user mentions and notifications
    - Support comment threading and replies
    - _Requirements: 4.4, 4.5_

  - [ ]* 6.3 Write property test for comment system
    - **Property 5: Comment System Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 7. Implement Asset Management System
  - [x] 7.1 Create asset upload and organization
    - Build image upload interface
    - Implement project-based asset organization
    - Add asset optimization and format conversion
    - _Requirements: 5.1, 5.3_

  - [x] 7.2 Implement reference image system
    - Create overlay and side panel display for reference images
    - Add comparison tools for design references
    - _Requirements: 5.2_

  - [ ]* 7.3 Write property test for asset management
    - **Property 6: Asset Management Consistency**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5**

  - [ ]* 7.4 Write property test for reference images
    - **Property 7: Reference Image Display**
    - **Validates: Requirements 5.2**

  - [x] 7.5 Implement asset code generation
    - Generate proper import statements for assets
    - Handle asset path resolution
    - Propagate asset updates to all references
    - _Requirements: 5.4, 5.5_

- [x] 8. Checkpoint - Ensure core UI features work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement MCP Integration
  - [x] 9.1 Create MCP setup and configuration
    - Add MCP integration to project initialization
    - Configure appropriate MCP servers for project types
    - Handle MCP server installation and management
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 9.2 Write property test for MCP setup
    - **Property 8: MCP Integration Setup**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 9.3 Implement MCP tool exposure
    - Expose MCP tools through Onlook interface
    - Handle MCP configuration changes and service restarts
    - _Requirements: 6.4, 6.5_

  - [ ]* 9.4 Write property test for MCP tools
    - **Property 9: MCP Tool Exposure**
    - **Validates: Requirements 6.4, 6.5**

- [ ] 10. Implement Self-Toolcall capabilities
  - [x] 10.1 Create self-reference API exposure
    - Expose Onlook APIs as available tools
    - Implement infinite loop prevention and resource monitoring
    - Create audit trail system for recursive operations
    - _Requirements: 7.1, 7.4, 7.5_

  - [ ]* 10.2 Write property test for self-reference safety
    - **Property 10: Self-Reference Safety**
    - **Validates: Requirements 7.1, 7.4, 7.5**

  - [x] 10.3 Implement recursive operations
    - Enable recursive branch creation using GitHub integration
    - Support programmatic design iteration using visual editing
    - _Requirements: 7.2, 7.3_

  - [ ]* 10.4 Write property test for recursive operations
    - **Property 11: Recursive Operation Correctness**
    - **Validates: Requirements 7.2, 7.3**

- [ ] 11. Implement Universal Project Support
  - [x] 11.1 Create framework detection system
    - Detect React, Vue, Angular, and vanilla HTML projects
    - Identify project structure and routing patterns
    - Parse component hierarchies for different frameworks
    - _Requirements: 8.1, 8.3_

  - [x] 11.2 Implement framework-specific code generation
    - Adapt code generation to framework-specific patterns
    - Use appropriate imports, exports, and file structures
    - Integrate with framework-specific build tools
    - _Requirements: 8.2, 8.4, 8.5_

  - [ ]* 11.3 Write property test for framework support
    - **Property 12: Framework Detection and Adaptation**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [ ] 12. Implement Universal Styling Support
  - [x] 12.1 Create styling system detection
    - Detect CSS Modules, Styled Components, Emotion, and vanilla CSS
    - Parse existing styling patterns and structures
    - _Requirements: 9.1, 9.5_

  - [x] 12.2 Implement styling system adaptation
    - Generate styles in appropriate format for detected system
    - Translate visual changes to correct CSS syntax
    - Convert design tokens to appropriate styling format
    - _Requirements: 9.2, 9.3, 9.4_

  - [ ]* 12.3 Write property test for styling support
    - **Property 13: Styling System Adaptation**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 13. Implement Repository Integration
  - [x] 13.1 Create change tracking and preparation
    - Track all changes made in Onlook for commit preparation
    - Generate descriptive commit messages based on changes
    - Prepare comprehensive change summaries
    - _Requirements: 10.1, 10.2_

  - [x] 13.2 Implement repository submission
    - Create pull requests with comprehensive descriptions
    - Include design references and testing instructions
    - Handle merge conflicts and provide resolution guidance
    - _Requirements: 10.3, 10.4, 10.5_

  - [ ]* 13.3 Write property test for repository submission
    - **Property 14: Repository Submission Completeness**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

- [ ] 14. Integration and API wiring
  - [x] 14.1 Wire all services to tRPC routers
    - Add new routers to apps/web/client/src/server/api/root.ts
    - Implement all API endpoints for external integrations
    - Connect services to database and storage layers
    - _Requirements: All requirements_

  - [ ] 14.2 Integrate UI components with editor
    - Add Components Panel to existing editor interface
    - Integrate Comment System with visual editor
    - Connect Asset Manager to project workspace
    - _Requirements: 3.1, 4.1, 5.1_

  - [ ]* 14.3 Write integration tests
    - Test end-to-end workflows for each major feature
    - Test API endpoint functionality
    - _Requirements: All requirements_

- [ ] 15. Final checkpoint - Ensure all systems work together
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests ensure all components work together properly