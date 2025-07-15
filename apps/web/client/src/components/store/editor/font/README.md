# Font Management 

This directory contains a modular, maintainable system for managing fonts in the Onlook editor. The original monolithic `FontManager` has been refactored into focused, testable classes, each handling a specific concern of font management.

---

## Architecture Overview

The font management system is now split into the following specialized classes:

- **FontSearchManager**: Font search, indexing, and batch loading (Google Fonts, FlexSearch)
- **FontConfigManager**: Font configuration file operations (read/write, add/remove fonts)
- **FontUploadManager**: Handles custom font file uploads and AST updates
- **TailwindConfigManager**: Updates Tailwind CSS config with font changes
- **LayoutManager**: Modifies layout files to add/remove font variables and imports

Each class is responsible for a single concern, making the codebase easier to test, extend, and maintain.

---

## Class & Function Reference

### FontSearchManager
- **Purpose**: Search, index, and load fonts (Google Fonts, FlexSearch)
- **Key Methods:**
  - `loadInitialFonts()`: Loads the first batch of fonts
  - `fetchNextFontBatch()`: Loads the next batch of fonts
  - `searchFonts(query: string)`: Searches fonts by name
  - `loadFontFromBatch(fonts: Font[])`: Loads specific fonts
  - `resetFontFetching()`, `updateFontsList(fonts)`, `clear()`
- **Usage:**
  ```ts
  const fontSearch = new FontSearchManager();
  await fontSearch.loadInitialFonts();
  const results = await fontSearch.searchFonts('Inter');
  ```

### FontConfigManager
- **Purpose**: Manage font configuration files (read, write, add, remove)
- **Key Methods:**
  - `scanFonts()`: Extracts fonts from config file
  - `scanExistingFonts(layoutPath)`: Migrates fonts from layout to config
  - `addFont(font)`: Adds a font to config
  - `removeFont(font)`: Removes a font from config
  - `readFontConfigFile()`: Reads and parses config
  - `ensureConfigFileExists()`: Ensures config file exists
- **Usage:**
  ```ts
  const configManager = new FontConfigManager(editorEngine);
  await configManager.addFont(font);
  const fonts = await configManager.scanFonts();
  ```

### FontUploadManager
- **Purpose**: Handle custom font file uploads and AST updates
- **Key Methods:**
  - `uploadFonts(fontFiles, basePath, fontConfigAst)`: Uploads and registers custom fonts
  - `clear()`: Resets upload state
- **Usage:**
  ```ts
  const uploadManager = new FontUploadManager(editorEngine);
  await uploadManager.uploadFonts(files, basePath, fontConfigAst);
  ```

### TailwindConfigManager
- **Purpose**: Update Tailwind CSS config with font changes
- **Key Methods:**
  - `addFontToTailwindConfig(font)`: Adds font to Tailwind config
  - `removeFontFromTailwindConfig(font)`: Removes font from Tailwind config
  - `ensureTailwindConfigExists()`: Creates config if missing
- **Usage:**
  ```ts
  const tailwindManager = new TailwindConfigManager(editorEngine);
  await tailwindManager.addFontToTailwindConfig(font);
  ```

### LayoutManager
- **Purpose**: Modify layout files to add/remove font variables and imports
- **Key Methods:**
  - `addFontVariableToRootLayout(fontId)`: Adds font variable to layout
  - `removeFontVariableFromLayout(fontId)`: Removes font variable
  - `updateDefaultFontInRootLayout(font)`: Sets default font
  - `getDefaultFont()`: Gets current default font
- **Usage:**
  ```ts
  const layoutManager = new LayoutManager(editorEngine);
  await layoutManager.addFontVariableToRootLayout('inter');
  ```

---

## Usage Examples

### Using the Main FontManager (Orchestrator)
The main `FontManager` class (see `index.ts`) coordinates all managers and exposes a unified API. Example:

```ts
import { FontManager } from './index';
const fontManager = new FontManager(editorEngine);
await fontManager.addFont(font);
await fontManager.scanFonts();
```

### Using Individual Managers
You can use any manager directly for advanced or isolated tasks:

```ts
import { FontSearchManager, FontConfigManager } from './';
const search = new FontSearchManager();
const config = new FontConfigManager(editorEngine);
const results = await search.searchFonts('Roboto');
await config.addFont(results[0]);
```

---

## File Structure

```
font/
├── README.md                  # This documentation
├── index.ts                   # Main FontManager (orchestrator)
├── FontSearchManager.ts       # Font search and loading
├── FontConfigManager.ts       # Font configuration management
├── FontUploadManager.ts       # Font upload handling
├── TailwindConfigManager.ts   # Tailwind config management
├── LayoutManager.ts           # Layout file management
```

---

## Next Steps for Contributors

- **Add/Improve Tests:** Each manager is testable in isolation. Add or improve tests in the appropriate test directory.
- **Type Safety:** Address any remaining type/linter issues (see notes in code).
- **Performance:** Consider lazy-loading managers if needed for large projects.
- **Documentation:** Add JSDoc comments to all public methods for better IDE support.
- **Extendability:** New font sources or config formats can be added by extending the relevant manager.

---

## Questions?
If you have questions or want to contribute, open an issue or pull request! 