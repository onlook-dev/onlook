# FontManager Refactoring

This document outlines the refactoring of the `FontManager` class from a monolithic 1500+ line class into smaller, more maintainable components.

## Architecture Overview

The original `FontManager` class has been split into the following specialized classes:

### 1. **RouterDetector** (`RouterDetector.ts`)
- **Purpose**: Detects Next.js router type (App Router vs Pages Router)
- **Responsibilities**:
  - Analyzes project structure to determine router type
  - Provides base path information for router-specific operations
- **Key Methods**:
  - `detectRouterType()`: Returns router configuration

### 2. **ASTHelper** (`ASTHelper.ts`)
- **Purpose**: Utility functions for AST manipulation
- **Responsibilities**:
  - Traverses className attributes in JSX files
  - Manages font imports in AST
  - Handles font name existence checks
  - Merges font configurations
- **Key Methods**:
  - `traverseClassName()`: Applies callbacks to className attributes
  - `addFontImport()`: Adds font imports to AST
  - `findFontExportDeclaration()`: Checks if font name exists in AST
  - `mergeLocalFontSources()`: Merges font configurations

### 3. **FontSearchManager** (`FontSearchManager.ts`)
- **Purpose**: Manages font search, indexing, and batch loading
- **Responsibilities**:
  - Maintains FlexSearch index for font discovery
  - Handles font batch loading from Google Fonts
  - Manages search results and system fonts
  - Loads fonts using WebFont loader
- **Key Methods**:
  - `loadInitialFonts()`: Loads first batch of fonts
  - `fetchNextFontBatch()`: Loads next batch of fonts
  - `searchFonts()`: Searches fonts using FlexSearch
  - `loadFontFromBatch()`: Loads specific fonts

### 4. **FontConfigManager** (`FontConfigManager.ts`)
- **Purpose**: Manages font configuration file operations
- **Responsibilities**:
  - Reads and writes font configuration files
  - Scans existing fonts from layout files
  - Adds and removes fonts from configuration
  - Manages font imports and exports
- **Key Methods**:
  - `scanFonts()`: Scans fonts from config file
  - `addFont()`: Adds font to configuration
  - `removeFont()`: Removes font from configuration
  - `readFontConfigFile()`: Reads and parses font config

### 5. **TailwindConfigManager** (`TailwindConfigManager.ts`)
- **Purpose**: Manages Tailwind CSS configuration updates
- **Responsibilities**:
  - Updates Tailwind config with new fonts
  - Removes fonts from Tailwind config
  - Creates new Tailwind config if needed
  - Manages theme.fontFamily configuration
- **Key Methods**:
  - `updateTailwindFontConfig()`: Adds font to Tailwind config
  - `removeFontFromTailwindConfig()`: Removes font from config
  - `ensureTailwindConfigExists()`: Creates config if missing

### 6. **LayoutManager** (`LayoutManager.ts`)
- **Purpose**: Manages layout file modifications
- **Responsibilities**:
  - Adds/removes font variables from layout files
  - Updates default fonts in layout files
  - Detects current fonts in use
  - Manages font imports in layout files
- **Key Methods**:
  - `addFontVariableToLayout()`: Adds font variable to layout
  - `removeFontVariableFromLayout()`: Removes font variable
  - `updateDefaultFontInRootLayout()`: Updates default font
  - `getDefaultFont()`: Gets current default font

### 7. **FontUploadManager** (`FontUploadManager.ts`)
- **Purpose**: Handles custom font file uploads
- **Responsibilities**:
  - Processes font file uploads
  - Creates font source objects for AST
  - Updates AST with font configurations
  - Manages upload state
- **Key Methods**:
  - `uploadFonts()`: Processes and uploads font files
  - `processFontFiles()`: Saves font files to project
  - `createFontSrcObjects()`: Creates AST objects for fonts

### 8. **FontManager** (Refactored)
- **Purpose**: Main orchestrator class
- **Responsibilities**:
  - Coordinates between all managers
  - Maintains overall state
  - Provides public API
  - Handles MobX reactivity
- **Key Methods**: Same public API as before, but delegates to managers

## Benefits of Refactoring

### 1. **Single Responsibility Principle**
Each class now has a single, well-defined purpose:
- Router detection is separated from font management
- AST manipulation is isolated in helper utilities
- Font search is independent of configuration management

### 2. **Better Testability**
- Each class can be tested in isolation
- Dependencies are injected, making mocking easier
- Smaller classes are easier to understand and test

### 3. **Improved Maintainability**
- Changes to one concern don't affect others
- Easier to locate and fix bugs
- Code is more readable and understandable

### 4. **Better Reusability**
- Individual managers can be reused in other contexts
- Common functionality is centralized in helpers
- Easier to extend with new features

### 5. **Reduced Complexity**
- Original 1500+ line class split into manageable pieces
- Each class averages 100-300 lines
- Easier to understand individual components

## Migration Guide

### For Existing Code
The public API of `FontManager` remains the same, so existing code should continue to work without changes:

```typescript
// This still works the same way
const fontManager = new FontManager(editorEngine);
await fontManager.addFont(font);
await fontManager.scanFonts();
```

### For New Development
You can now work with individual managers for specific needs:

```typescript
// Working with specific managers
const routerDetector = new RouterDetector(editorEngine);
const routerConfig = await routerDetector.detectRouterType();

const fontSearchManager = new FontSearchManager();
const fonts = await fontSearchManager.searchFonts('Inter');
```

### Testing
Individual managers can be tested in isolation:

```typescript
// Test router detection independently
const routerDetector = new RouterDetector(mockEditorEngine);
const config = await routerDetector.detectRouterType();
expect(config.type).toBe(RouterType.APP);
```

## File Structure

```
font/
├── README.md                    # This documentation
├── index.ts                     # Original FontManager (1500+ lines)
├── FontManagerRefactored.ts     # New refactored version
├── RouterDetector.ts            # Router detection logic
├── ASTHelper.ts                 # AST manipulation utilities
├── FontSearchManager.ts         # Font search and loading
├── FontConfigManager.ts         # Font configuration management
├── TailwindConfigManager.ts     # Tailwind config management
├── LayoutManager.ts             # Layout file management
└── FontUploadManager.ts         # Font upload handling
```

## Next Steps

1. **Replace Original**: Replace the original `index.ts` with the refactored version
2. **Add Tests**: Add comprehensive tests for each manager
3. **Address Type Issues**: Fix the linter errors related to type definitions
4. **Performance**: Consider lazy loading of managers if needed
5. **Documentation**: Add JSDoc comments for better IDE support

## Type Issues

There are some linter errors related to type definitions that need to be addressed:
- `RawFont` type import issues
- `RouterConfig` type resolution
- Function return type inference

These should be resolved by fixing the type definitions in the respective packages. 