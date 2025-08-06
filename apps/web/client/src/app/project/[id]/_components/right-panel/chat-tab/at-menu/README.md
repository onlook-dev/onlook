# @ Menu Folder Navigation

This document describes the folder navigation feature in the @ menu component.

## Overview

When a user types an @-mention followed by a forward slash (`/`), the @ menu will show child files and folders within the specified folder. This allows users to navigate through the file structure and select specific files.

## Usage

### Basic Folder Navigation

1. Type `@` to open the @ menu
2. Type a folder name followed by `/` (e.g., `@src/`)
3. The menu will show child files and folders within that folder
4. Use arrow keys to navigate and Enter to select

### Examples

- `@src/` - Shows files and folders within the `src` directory
- `@app/` - Shows files and folders within the `app` directory
- `@components/` - Shows files and folders within the `components` directory

## Implementation Details

### Data Providers

The `AtMenuDataProviders` class includes new methods for folder navigation:

- `getChildFiles(folderPath: string)` - Returns files within a specific folder
- `getChildFolders(folderPath: string)` - Returns folders within a specific folder
- `getChildItems(folderPath: string)` - Returns all child items (files and folders) within a specific folder

### Menu State

The menu tracks folder context using the `currentFolderContext` state, which displays a breadcrumb showing the current folder being navigated.

### Input Handling

The chat input component detects folder navigation patterns using regex:
- Pattern: `/^([^\/]+)\/$/` - Matches folder names followed by `/`
- When detected, the search query is updated to trigger folder navigation mode

### Selection Handling

When a user selects a child file from folder navigation:
1. The entire folder mention (e.g., `@src/`) is replaced with the selected file (e.g., `@index.ts`)
2. A space is automatically added after the file name
3. The menu closes and returns to normal input mode

## UI Features

### Breadcrumb Display

When in folder navigation mode, a breadcrumb appears at the top of the menu showing:
- Folder icon
- Folder name with `/` suffix
- Monospace font styling

### Child Item Styling

Child items in folder navigation mode:
- Don't show the full path (since they're already in the context of the folder)
- Maintain the same selection and hover states
- Include appropriate icons for files and folders

## Testing

Use the test page at `/test-at-menu` to verify folder navigation functionality:

1. Type `@src/` to see child files in the src folder
2. Type `@app/` to see child files in the app folder
3. Navigate with arrow keys and select with Enter
4. Verify that the folder mention is replaced with the selected file

## Future Enhancements

- Support for nested folder navigation (e.g., `@src/components/`)
- Breadcrumb navigation to go back to parent folders
- Search within folder context
- Keyboard shortcuts for folder navigation 