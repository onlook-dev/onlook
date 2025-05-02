import { makeAutoObservable, reaction } from "mobx";
import type { EditorEngine } from "..";
import { FAMILIES } from "@onlook/fonts";
import type { Font } from "@onlook/models/assets";
import { type FileSyncManager } from "../sandbox/file-sync";
import localforage from "localforage";
import * as FlexSearch from "flexsearch";
import * as WebFont from "webfontloader";
import type { ProjectManager } from "@/components/store/project";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { generate } from "@babel/generator";
import { camelCase } from "lodash";
import * as t from "@babel/types";
import type { NodePath } from "@babel/traverse";
import { DefaultSettings } from "@onlook/constants";
import * as pathModule from "path";
import type { ParseResult } from "@babel/parser";
import {
  createStringLiteralWithFont,
  createTemplateLiteralWithFont,
  extractFontConfig,
  findFontClass,
  removeFontsFromClassName
} from "./util";
import { normalizePath } from "../sandbox/helpers";
import { getFontFileName } from "@onlook/utility";


type TraverseCallback = (
  classNameAttr: t.JSXAttribute,
  ast: ParseResult<t.File>,
) => void | Promise<void>;

interface FontFile {
  name: string;
  path: string;
  content: string;
}

interface RawFont {
  id: string;
  family: string;
  subsets: string[];
  weights: string[];
  styles: string[];
  defSubset: string;
  variable: boolean;
  lastModified: string;
  category: string;
  type: string;
}

interface SearchDocument {
  id: string;
  family: string;
  subsets: string[];
  variable: boolean;
  weights: string[];
  styles: string[];
}

type DocumentData = {
  id: string;
  content: string;
};

type SearchResult = {
  field: string;
  result: Array<{
    doc: DocumentData;
    score: number;
  }>;
};

type DocumentSearchResults = Record<string, SearchResult>;

interface CodeDiff {
  original: string;
  generated: string;
  path: string;
}

export class FontManager {
  private _fonts: Font[] = [];
  private _systemFonts: Font[] = [];
  private _searchResults: Font[] = [];
  private _fontFamilies: Font[] = [];
  private _defaultFont: string | null = null;
  private _lastDefaultFont: string | null = null;
  private _currentFontIndex = 0;
  private _batchSize = 20;
  private _isFetching = false;
  private _fontSearchIndex: FlexSearch.Document;
  private _allFontFamilies: RawFont[] = FAMILIES as RawFont[];
  private disposers: Array<() => void> = [];
  private previousFonts: Font[] = [];
  private selfModified = new Set<string>();

  fontConfigPath = normalizePath(DefaultSettings.FONT_CONFIG);
  tailwindConfigPath = normalizePath(DefaultSettings.TAILWIND_CONFIG);

  constructor(
    private editorEngine: EditorEngine,
    private projectManager: ProjectManager
  ) {
    makeAutoObservable(this);

    // Initialize FlexSearch index
    this._fontSearchIndex = new FlexSearch.Document({
      document: {
        id: "id",
        index: ["family"],
        store: true,
      },
      tokenize: "forward",
    });

    // Add all font families to the search index
    this._allFontFamilies.forEach((font) => {
      const doc: SearchDocument = {
        id: font.id,
        family: font.family,
        subsets: font.subsets,
        variable: font.variable,
        weights: font.weights,
        styles: font.styles,
      };
      const data: DocumentData = {
        id: doc.id,
        content: JSON.stringify(doc),
      };
      void this._fontSearchIndex.add(data);
    });

    this.initializeFonts();

    const fontConfigDisposer = reaction(
      () => this.editorEngine.sandbox?.readFile(this.fontConfigPath),
      (content) => {        
        if (content) {          
          void this.syncFontsWithConfigs();
        }
      },
      { fireImmediately: true },
    );

    const defaultFontDisposer = reaction(
      async () => {
        const defaultPath = await this.detectRouterType();
        if (defaultPath) {
          return this.editorEngine.sandbox?.readFile(defaultPath.basePath);
        }
        return null;
      },
      async () => {
        const defaultFont = await this.getDefaultFont();
        if (defaultFont) {
          const codeDiff = await this.setProjectDefaultFont(defaultFont);
          if (codeDiff) {
            await this.editorEngine.history.push({
              type: "write-code",
              diffs: [codeDiff],
            });
          }
        }
      },
      { fireImmediately: true },
    );

    this.disposers.push(fontConfigDisposer, defaultFontDisposer);
  }

  private async initializeFonts() {
    this.convertFont();
    await this.loadInitialFonts();
  } 

  private convertFont() {
    this._fontFamilies = FAMILIES.map((font) => ({
      ...font,
      weight: font.weights.map((weight) => weight.toString()),
      styles: font.styles.map((style) => style.toString()),
      variable: `--font-${font.id}`,
    }));
  }

  private async loadInitialFonts() {
    const initialFonts = this._allFontFamilies.slice(0, this._batchSize);
    const convertedFonts = initialFonts.map((font) =>
      this.convertRawFont(font),
    );
    this._systemFonts = convertedFonts;
    this._currentFontIndex = this._batchSize;

    try {
      await this.loadFontBatch(convertedFonts);
      console.log(`Initial ${convertedFonts.length} fonts loaded successfully`);
    } catch (error) {
      console.error("Failed to load initial fonts:", error);
    }
  }

  private convertRawFont(font: RawFont): Font {
    return {
      ...font,
      weight: font.weights,
      styles: font.styles || [],
      variable: `--font-${font.id}`,
    };
  }

  private async loadFontBatch(fonts: Font[]) {
    return new Promise<void>((resolve, reject) => {
      WebFont.load({
        google: {
          families: fonts.map((font) => font.family),
        },
        active: () => {
          console.log(`Batch of fonts loaded successfully`);
          resolve();
        },
        inactive: () => {
          console.warn(`Failed to load font batch`);
          reject(new Error("Font loading failed"));
        },
        timeout: 30000, // 30 second timeout
      });
    });
  }

  async scanFonts() {
    if (!this.projectManager.project) {
      console.error("No project provided");
      return [];
    }

    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      console.error("No sandbox session found");
      return [];
    }

    try {
        let existedFonts: Font[] | undefined = [];
        try {
            existedFonts = await this.scanExistingFonts();
            if (existedFonts && existedFonts.length > 0) {
                await this.addFonts(existedFonts);
            }
        } catch (existingFontsError) {
            console.error('Error scanning existing fonts:', existingFontsError);
        }

      const content = await this.editorEngine.sandbox?.readFile(this.fontConfigPath) ?? '';
      if (!content) {
        return [];
      }

      const fonts: Font[] = [];

      try {
        const ast = parse(content, {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
        });

        const fontImports: Record<string, string> = {};

        traverse(ast, {
          // Extract font imports from 'next/font/google' and 'next/font/local'
          ImportDeclaration(path) {
            const source = path.node.source.value;
            if (source === "next/font/google") {
              path.node.specifiers.forEach((specifier) => {
                if (
                  t.isImportSpecifier(specifier) &&
                  t.isIdentifier(specifier.imported)
                ) {
                  fontImports[specifier.imported.name] =
                    specifier.imported.name;
                }
              });
            } else if (source === "next/font/local") {
              path.node.specifiers.forEach((specifier) => {
                if (
                  t.isImportDefaultSpecifier(specifier) &&
                  t.isIdentifier(specifier.local)
                ) {
                  fontImports[specifier.local.name] = "localFont";
                }
              });
            }
          },

          VariableDeclaration(path) {
            const parentNode = path.parent;
            if (!t.isExportNamedDeclaration(parentNode)) {
              return;
            }

            path.node.declarations.forEach((declarator) => {
              if (!t.isIdentifier(declarator.id) || !declarator.init) {
                return;
              }

              const fontId = declarator.id.name;

              if (t.isCallExpression(declarator.init)) {
                const callee = declarator.init.callee;

                let fontType = "";
                if (t.isIdentifier(callee) && fontImports[callee.name]) {
                  fontType = fontImports[callee.name] ?? '';
                }

                const configArg = declarator.init.arguments[0];
                if (t.isObjectExpression(configArg)) {
                  const fontConfig = extractFontConfig(
                    fontId,
                    fontType,
                    configArg,
                  );
                  fonts.push(fontConfig);
                }
              }
            });
          },
        });

        this._fonts = fonts;
        return fonts;
      } catch (parseError) {
        console.error("Error parsing font file:", parseError);
        return [];
      }
    } catch (error) {
      console.error("Error scanning fonts:", error);
      return [];
    }
  }

  async scanExistingFonts(): Promise<Font[] | undefined> {
    if (!this.projectManager.project) {
      console.error("No project provided");
      return [];
    }

    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      console.error("No sandbox session found");
      return [];
    }

    try {
      const routerConfig = await this.detectRouterType();
      if (!routerConfig) {
        console.log('Could not detect Next.js router type');
        return [];
      }

      // Determine the layout file path based on router type
      let layoutPath: string;
      
      if (routerConfig.type === 'app') {
        layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
      } else {
        layoutPath = pathModule.join(routerConfig.basePath, '_app.tsx');
      }

      const content = await sandbox.readFile(normalizePath(layoutPath));
      if (!content) {
        console.log(`Layout file is empty or doesn't exist: ${layoutPath}`);
        return [];
      }

      try {
        const ast = parse(content, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx'],
        });

        const fontImports: Record<string, string> = {};
        const fontVariables: string[] = [];
        const fonts: Font[] = [];
        let updatedAst = false;

        traverse(ast, {
          ImportDeclaration(path) {
            if (!path.node?.source?.value) {
              return;
            }

            const source = path.node.source.value;
            if (source === 'next/font/google') {
              if (!path.node.specifiers) {
                return;
              }

              path.node.specifiers.forEach((specifier) => {
                if (
                  t.isImportSpecifier(specifier) &&
                  t.isIdentifier(specifier.imported)
                ) {
                  fontImports[specifier.imported.name] = specifier.imported.name;
                  try {
                    path.remove();
                  } catch (removeError) {
                    console.error('Error removing font import:', removeError);
                  }
                }
              });
            } else if (source === 'next/font/local') {
              if (!path.node.specifiers) {
                return;
              }

              path.node.specifiers.forEach((specifier) => {
                if (
                  t.isImportDefaultSpecifier(specifier) &&
                  t.isIdentifier(specifier.local)
                ) {
                  fontImports[specifier.local.name] = 'localFont';
                  try {
                    path.remove();
                  } catch (removeError) {
                    console.error('Error removing font import:', removeError);
                  }
                }
              });
            }
          },

          VariableDeclaration(path) {
            if (!path.node?.declarations) {
              return;
            }

            path.node.declarations.forEach((declarator) => {
              if (!t.isIdentifier(declarator.id) || !declarator.init) {
                return;
              }

              if (t.isCallExpression(declarator.init)) {
                const callee = declarator.init.callee;
                if (t.isIdentifier(callee) && fontImports[callee.name]) {
                  const fontType = fontImports[callee.name] ?? '';
                  const configArg = declarator.init.arguments[0];
                  fontVariables.push(declarator.id.name);

                  if (t.isObjectExpression(configArg)) {
                    const fontConfig = extractFontConfig(
                      declarator.id.name,
                      fontType,
                      configArg,
                    );

                    if (!fontConfig.variable) {
                      fontConfig.variable = `--font-${declarator.id.name}`;
                    }

                    fonts.push(fontConfig);
                  }
                  updatedAst = true;
                  try {
                    path.remove();
                  } catch (removeError) {
                    console.error('Error removing font variable:', removeError);
                  }
                }
              }
            });
          },

          JSXOpeningElement(path) {
            if (
              !path.node ||
              !t.isJSXIdentifier(path.node.name) ||
              !path.node.attributes
            ) {
              return;
            }

            path.node.attributes.forEach((attr) => {
              if (
                t.isJSXAttribute(attr) &&
                t.isJSXIdentifier(attr.name) &&
                attr.name.name === 'className'
              ) {
                try {
                  if (
                    removeFontsFromClassName(attr, { fontIds: fontVariables })
                  ) {
                    updatedAst = true;
                  }
                } catch (classNameError) {
                  console.error('Error processing className:', classNameError);
                }
              }
            });
          },
        });

        if (updatedAst) {
          try {
            const { code } = generate(ast);
            await sandbox.writeFile(normalizePath(layoutPath), code);
          } catch (generateError) {
            console.error('Error generating code from AST:', generateError);
          }
        }
        return fonts;
      } catch (parseError) {
        console.error(`Error parsing layout file ${layoutPath}:`, parseError);
        return [];
      }
    } catch (error) {
      console.error('Error scanning existing fonts:', error);
      return [];
    }
  }


  /**
   * Adds a new font to the project by:
   * 1. Adding the font import and configuration to fonts.ts
   * 2. Updating Tailwind config with the new font family
   * 3. Adding the font variable to the appropriate layout file
   */
  async addFont(font: Font) {
    if (!this.projectManager.project) {
      console.error("No project provided");
      return false;
    }

    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      console.error("No sandbox session found");
      return false;
    }

    try {
      const content =
        (await sandbox.readFile(this.fontConfigPath)) ?? "";

      // Convert the font family to the import name format (Pascal case, no spaces)
      const importName = font.family.replace(/\s+/g, "_");
      const fontName = camelCase(font.id);

      // Parse the file content using Babel
      const ast = parse(content, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      let hasGoogleFontImport = false;
      let hasImportName = false;
      let hasFontExport = false;

      // Check if import and export already exists
      traverse(ast, {
        ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
          if (path.node.source.value === "next/font/google") {
            hasGoogleFontImport = true;
            path.node.specifiers.forEach((specifier) => {
              if (
                t.isImportSpecifier(specifier) &&
                t.isIdentifier(specifier.imported) &&
                specifier.imported.name === importName
              ) {
                hasImportName = true;
              }
            });
          }
        },
        ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
          if (
            t.isVariableDeclaration(path.node.declaration) &&
            path.node.declaration.declarations.some(
              (declaration) =>
                t.isIdentifier(declaration.id) &&
                declaration.id.name === fontName,
            )
          ) {
            hasFontExport = true;
          }
        },
      });

      if (hasFontExport) {
        console.log(`Font ${fontName} already exists in font.ts`);
        return false;
      }

      // Create the AST nodes for the new font
      const fontConfigObject = t.objectExpression([
        t.objectProperty(
          t.identifier("subsets"),
          t.arrayExpression(font.subsets.map((s) => t.stringLiteral(s))),
        ),
        t.objectProperty(
          t.identifier("weight"),
          t.arrayExpression((font.weight ?? []).map((w) => t.stringLiteral(w))),
        ),
        t.objectProperty(
          t.identifier("style"),
          t.arrayExpression((font.styles ?? []).map((s) => t.stringLiteral(s))),
        ),
        t.objectProperty(
          t.identifier("variable"),
          t.stringLiteral(font.variable),
        ),
        t.objectProperty(t.identifier("display"), t.stringLiteral("swap")),
      ]);

      const fontDeclaration = t.variableDeclaration("const", [
        t.variableDeclarator(
          t.identifier(fontName),
          t.callExpression(t.identifier(importName), [fontConfigObject]),
        ),
      ]);

      const exportDeclaration = t.exportNamedDeclaration(fontDeclaration, []);

      // Add the export declaration to the end of the file
      ast.program.body.push(exportDeclaration);

      // Add or update the import if needed
      if (!hasGoogleFontImport) {
        const importDeclaration = t.importDeclaration(
          [
            t.importSpecifier(
              t.identifier(importName),
              t.identifier(importName),
            ),
          ],
          t.stringLiteral("next/font/google"),
        );
        ast.program.body.unshift(importDeclaration);
      } else if (!hasImportName) {
        traverse(ast, {
          ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
            if (path.node.source.value === "next/font/google") {
              const newSpecifiers = [...path.node.specifiers];
              newSpecifiers.push(
                t.importSpecifier(
                  t.identifier(importName),
                  t.identifier(importName),
                ),
              );
              path.node.specifiers = newSpecifiers;
            }
          },
        });
      }

      const { code } = generate(ast);

      const success = await sandbox.writeFile(
        this.fontConfigPath,
        code,
      );
      if (!success) {
        throw new Error("Failed to write font configuration");
      }

      this._fonts.push(font);

      await this.scanFonts();
      await this.loadFontBatch([font]);

      return true;
    } catch (error) {
      console.error(
        "Error adding font:",
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  async addFonts(fonts: Font[]) {
    for (const font of fonts) {
        await this.addFont(font);
    }
}


  async removeFont(font: Font) {
    if (!this.projectManager.project) {
      console.error("No project provided");
      return false;
    }

    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      console.error("No sandbox session found");
      return false;
    }

    try {
      const content = await sandbox.readFile(this.fontConfigPath);
      if (!content) {
        return false;
      }

      const ast = parse(content, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      const fontIdToRemove = font.id;
      const importToRemove = font.family.replace(/\s+/g, "_");
      let removedFont = false;
      const fontFilesToDelete: string[] = [];
      // Track if any localFont declarations remain after removal
      let hasRemainingLocalFonts = false;

      // Track all imports from next/font/google to know if we should remove the import
      traverse(ast, {
        ImportDeclaration(path) {
          if (path.node.source.value === "next/font/google") {
            const importSpecifiers = path.node.specifiers.filter(
              (specifier) => {
                if (
                  t.isImportSpecifier(specifier) &&
                  t.isIdentifier(specifier.imported)
                ) {
                  return specifier.imported.name !== importToRemove;
                }
                return true;
              },
            );
            if (importSpecifiers.length === 0) {
              path.remove();
            } else if (
              importSpecifiers.length !== path.node.specifiers.length
            ) {
              path.node.specifiers = importSpecifiers;
            }
          }
        },

        ExportNamedDeclaration(path) {
          if (t.isVariableDeclaration(path.node.declaration)) {
            const declarations = path.node.declaration.declarations;

            for (let i = 0; i < declarations.length; i++) {
              const declaration = declarations[i];

              // Check if this is a localFont declaration (not the one being removed)
              if (
                declaration &&
                t.isIdentifier(declaration.id) &&
                declaration.id.name !== fontIdToRemove &&
                t.isCallExpression(declaration.init) &&
                t.isIdentifier(declaration.init.callee) &&
                declaration.init.callee.name === "localFont"
              ) {
                hasRemainingLocalFonts = true;
              }

              if (
                declaration &&
                t.isIdentifier(declaration.id) &&
                declaration.id.name === fontIdToRemove
              ) {
                // Extract font file paths from the local font configuration
                if (
                  t.isCallExpression(declaration.init) &&
                  t.isIdentifier(declaration.init.callee) &&
                  declaration.init.callee.name === "localFont" &&
                  declaration.init.arguments.length > 0 &&
                  t.isObjectExpression(declaration.init.arguments[0])
                ) {
                  const fontConfig = declaration.init.arguments[0];
                  const srcProp = fontConfig.properties.find(
                    (prop) =>
                      t.isObjectProperty(prop) &&
                      t.isIdentifier(prop.key) &&
                      prop.key.name === "src",
                  );

                  if (
                    srcProp &&
                    t.isObjectProperty(srcProp) &&
                    t.isArrayExpression(srcProp.value)
                  ) {
                    // Loop through the src array to find font file paths
                    srcProp.value.elements.forEach((element) => {
                      if (t.isObjectExpression(element)) {
                        const pathProp = element.properties.find(
                          (prop) =>
                            t.isObjectProperty(prop) &&
                            t.isIdentifier(prop.key) &&
                            prop.key.name === "path",
                        );

                        if (
                          pathProp &&
                          t.isObjectProperty(pathProp) &&
                          t.isStringLiteral(pathProp.value)
                        ) {
                          // Get the path value
                          let fontFilePath = pathProp.value.value;
                          if (fontFilePath.startsWith("../")) {
                            fontFilePath = fontFilePath.substring(3); // Remove '../' prefix
                          }
                          fontFilesToDelete.push(fontFilePath);
                        }
                      }
                    });
                  }
                }

                if (declarations.length === 1) {
                  path.remove();
                } else {
                  declarations.splice(i, 1);
                }
                removedFont = true;
                break;
              }
            }
          }
        },
      });

      if (removedFont) {
        let { code } = generate(ast);

        // Remove localFont import if no localFont declarations remain
        if (!hasRemainingLocalFonts) {
          const localFontImportRegex =
            /import\s+localFont\s+from\s+['"]next\/font\/local['"];\n?/g;
          code = code.replace(localFontImportRegex, "");
        }
        const codeDiff: CodeDiff = {
          original: content,
          generated: code,
          path: this.fontConfigPath,
        };

        const success = await sandbox.writeFile(
          this.fontConfigPath,
          code,
        );
        if (!success) {
          throw new Error("Failed to write font configuration");
        }
        await this.scanFonts();

        if (font.id === this._defaultFont) {
          this._defaultFont = null;
        }

        return codeDiff;
      } else {
        console.log(`Font ${fontIdToRemove} not found in font.ts`);
      }
    } catch (error) {
      console.error("Error removing font:", error);
      return false;
    }
  }

  async setDefaultFont(font: Font) {
    if (!this.projectManager.project) {
      console.error("No project provided");
      return false;
    }

    try {
      const prevDefaultFont = this._defaultFont;
      this._defaultFont = font.id;
      this._lastDefaultFont = prevDefaultFont;

      const codeDiff = await this.setProjectDefaultFont(font);

      if (codeDiff) {
        // await this.editorEngine.history.push({
        //   type: "write-code",
        //   diffs: [codeDiff],
        // });
        await this.editorEngine.sandbox.writeFile(codeDiff.path, codeDiff.generated);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error setting default font:", error);
      return false;
    }
  }

  async uploadFonts(fontFiles: {
        file: { name: string; buffer: number[] };
        name: string;
        weight: string;
        style: string;
    }[]) {
    if (!this.projectManager.project) {
      console.error("No project provided");
      return false;
    }

    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      console.error("No sandbox session found");
      return false;
    }

    try {
      // Read the current font configuration file
      const content = await sandbox.readFile(this.fontConfigPath) ?? '';

      // Parse the file content using Babel
      const ast = parse(content, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      // Check if the localFont import already exists
      let hasLocalFontImport = false;
      traverse(ast, {
        ImportDeclaration(path) {
          if (path.node.source.value === "next/font/local") {
            hasLocalFontImport = true;
          }
        },
      });

      // Extract the base font name from the first file
      const baseFontName = fontFiles[0]?.name.split('.')[0] ?? 'customFont';
      const fontName = camelCase(`custom-${baseFontName}`);

      // Check if this font name already exists
      let fontNameExists = false;
      let existingFontNode: t.ExportNamedDeclaration | null = null;

      traverse(ast, {
        ExportNamedDeclaration(path) {
          if (
            path.node.declaration &&
            t.isVariableDeclaration(path.node.declaration) &&
            path.node.declaration.declarations.some(
              (declaration) =>
                t.isIdentifier(declaration.id) && declaration.id.name === fontName,
            )
          ) {
            fontNameExists = true;
            existingFontNode = path.node;
          }
        },
      });

      // Make sure the fonts directory exists (this is handled by sandbox in our case)
      const fontsDir = "fonts";

        // Save font files and prepare font configuration
        const fontConfigs = await Promise.all(
            fontFiles.map(async (fontFile) => {
                const weight = fontFile.weight;
                const style = fontFile.style.toLowerCase();
                const fileName = getFontFileName(baseFontName, weight, style);
                const filePath = pathModule.join(
                    fontsDir,
                    `${fileName}.${fontFile.file.name.split('.').pop()}`,
                );

                // Save the file as binary data
                const buffer = Buffer.from(fontFile.file.buffer);
                await sandbox.writeFile(filePath, buffer.toString('base64'));

                return {
                    path: filePath,
                    weight,
                    style,
                };
            }),
        );

      // Create array elements for the src property
      const srcArrayElements = fontConfigs.map((config) =>
        t.objectExpression([
          t.objectProperty(t.identifier("path"), t.stringLiteral(`../${config.path}`)),
          t.objectProperty(t.identifier("weight"), t.stringLiteral(config.weight)),
          t.objectProperty(t.identifier("style"), t.stringLiteral(config.style)),
        ])
      );

      if (fontNameExists && existingFontNode) {
        // Merge new font configurations with existing ones
        traverse(ast, {
          ExportNamedDeclaration(path) {
            if (path.node === existingFontNode && path.node.declaration) {
              const declaration = path.node.declaration;
              if (t.isVariableDeclaration(declaration) && declaration.declarations.length > 0) {
                const declarator = declaration.declarations[0];
                if (
                  declarator &&
                  t.isIdentifier(declarator.id) &&
                  declarator.id.name === fontName &&
                  declarator.init &&
                  t.isCallExpression(declarator.init) &&
                  t.isIdentifier(declarator.init.callee) &&
                  declarator.init.callee.name === "localFont" &&
                  declarator.init.arguments.length > 0 &&
                  t.isObjectExpression(declarator.init.arguments[0])
                ) {
                  const configObject = declarator.init.arguments[0];
                  const srcProp = configObject.properties.find(
                    (prop) =>
                      t.isObjectProperty(prop) &&
                      t.isIdentifier(prop.key) &&
                      prop.key.name === "src"
                  );

                  if (
                    srcProp &&
                    t.isObjectProperty(srcProp) &&
                    t.isArrayExpression(srcProp.value)
                  ) {
                    srcProp.value.elements.push(...srcArrayElements);
                  }
                }
              }
            }
          },
        });
      } else {
        // Create a new font configuration
        const fontConfigObject = t.objectExpression([
          t.objectProperty(t.identifier("src"), t.arrayExpression(srcArrayElements)),
          t.objectProperty(
            t.identifier("variable"),
            t.stringLiteral(`--font-${fontName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`)
          ),
          t.objectProperty(t.identifier("display"), t.stringLiteral("swap")),
          t.objectProperty(
            t.identifier("fallback"),
            t.arrayExpression([
              t.stringLiteral("system-ui"),
              t.stringLiteral("sans-serif"),
            ])
          ),
          t.objectProperty(t.identifier("preload"), t.booleanLiteral(true)),
        ]);

        const fontDeclaration = t.variableDeclaration("const", [
          t.variableDeclarator(
            t.identifier(fontName),
            t.callExpression(t.identifier("localFont"), [fontConfigObject])
          ),
        ]);

        const exportDeclaration = t.exportNamedDeclaration(fontDeclaration, []);

        ast.program.body.push(exportDeclaration);

        if (!hasLocalFontImport) {
          const importDeclaration = t.importDeclaration(
            [t.importDefaultSpecifier(t.identifier("localFont"))],
            t.stringLiteral("next/font/local")
          );
          ast.program.body.unshift(importDeclaration);
        }
      }

      // Generate and write the updated code back to the file
      const { code } = generate(ast);
      await sandbox.writeFile(this.fontConfigPath, code);

      await this.scanFonts();

      return true;
    } catch (error) {
      console.error("Error uploading fonts:", error);
      return false;
    }
  }

  async fetchNextFontBatch(): Promise<{ fonts: Font[]; hasMore: boolean }> {
    if (this._isFetching) {
      console.log("Already fetching fonts, please wait...");
      return {
        fonts: [],
        hasMore: this._currentFontIndex < this._allFontFamilies.length,
      };
    }

    this._isFetching = true;

    try {
      const start = this._currentFontIndex;
      const end = Math.min(
        start + this._batchSize,
        this._allFontFamilies.length,
      );

      if (start >= this._allFontFamilies.length) {
        return { fonts: [], hasMore: false };
      }

      const batchFonts = this._allFontFamilies
        .slice(start, end)
        .map((font) => this.convertRawFont(font));

      await this.loadFontBatch(batchFonts);
      this._systemFonts.push(...batchFonts);
      this._currentFontIndex = end;

      return {
        fonts: batchFonts,
        hasMore: end < this._allFontFamilies.length,
      };
    } catch (error) {
      console.error("Error fetching font batch:", error);
      throw error;
    } finally {
      this._isFetching = false;
    }
  }

  async searchFonts(query: string): Promise<Font[]> {
    try {
      const searchResults = (await this._fontSearchIndex.search(
        query,
      )) as unknown as DocumentSearchResults;
      const fonts = Object.values(searchResults).flatMap((result) =>
        result.result.map((item) => {
          const doc = JSON.parse(item.doc.content) as SearchDocument;
          const font = this._allFontFamilies.find((f) => f.id === doc.id);
          if (!font) {
            throw new Error(`Font ${doc.id} not found in font families`);
          }
          return {
            id: font.id,
            family: font.family,
            subsets: font.subsets,
            variable: `--font-${font.family.toLowerCase().replace(/\s+/g, "-")}`,
            weight: font.weights,
            styles: font.styles,
            type: font.type,
          };
        }),
      );

      if (fonts.length > 0) {
        await this.loadFontBatch(fonts);
        this._searchResults = fonts;
      }

      return fonts;
    } catch (error) {
      console.error(
        "Error searching fonts:",
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  }

  resetFontFetching() {
    this._currentFontIndex = 0;
    this._isFetching = false;
  }

  get fonts() {
    return this._fonts;
  }

  get fontFamilies() {
    return this._fontFamilies;
  }

  get systemFonts() {
    return this._systemFonts.filter(
      (fontFamily) =>
        !this._fonts.some((font) => font.family === fontFamily.family),
    );
  }

  get defaultFont() {
    return this._defaultFont;
  }

  get searchResults() {
    return this._searchResults.filter(
      (fontFamily) =>
        !this._fonts.some((font) => font.family === fontFamily.family),
    );
  }

  get isFetching() {
    return this._isFetching;
  }

  get currentFontIndex() {
    return this._currentFontIndex;
  }

  get hasMoreFonts() {
    return this._currentFontIndex < this._allFontFamilies.length;
  }

  clear() {
    this._fonts = [];
    this._fontFamilies = [];
    this._systemFonts = [];
    this._searchResults = [];
    this._defaultFont = null;
    this._lastDefaultFont = null;
    this._currentFontIndex = 0;
    this._isFetching = false;

    // Clean up all reactions
    this.disposers.forEach((disposer) => disposer());
    this.disposers = [];
  }

  /**
   * Updates a file with a font import if needed
   */
  private async updateFileWithImport(
    filePath: string,
    content: string,
    ast: ParseResult<t.File>,
    fontName: string,
  ): Promise<void> {
    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      return;
    }

    const { code } = generate(ast);
    const fontPath = DefaultSettings.FONT_CONFIG.replace(/^\.\/app\//, "./").replace(
      /\.ts$/,
      "",
    );
    const importRegex = new RegExp(
      `import\\s*{([^}]*)}\\s*from\\s*['"]${fontPath}['"]`,
    );
    const importMatch = content.match(importRegex);

    let newContent = code;

    if (importMatch?.[1]) {
      const currentImports = importMatch[1];
      if (!currentImports.includes(fontName)) {
        const newImports = currentImports.trim() + `, ${fontName}`;
        newContent = newContent.replace(
          importRegex,
          `import { ${newImports} } from '${fontPath}'`,
        );
      }
    } else {
      const fontImport = `import { ${fontName} } from '${fontPath}';`;
      newContent = fontImport + "\n" + newContent;
    }

    await sandbox.writeFile(filePath, newContent);
  }

  /**
   * Adds a font variable to specified target elements in a file
   */
  private async addFontVariableToElement(
    filePath: string,
    fontName: string,
    targetElements: string[],
  ): Promise<void> {
    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      return;
    }

    try {
      const content = await sandbox.readFile(filePath);
      if (!content) {
        console.error(`Failed to read file: ${filePath}`);
        return;
      }

      let updatedAst = false;
      let targetElementFound = false;

      await this.traverseClassName(
        filePath,
        targetElements,
        async (classNameAttr, ast) => {
          targetElementFound = true;
          const fontVarExpr = t.memberExpression(
            t.identifier(fontName),
            t.identifier("variable"),
          );

          if (t.isStringLiteral(classNameAttr.value)) {
            if (classNameAttr.value.value === "") {
              const quasis = [
                t.templateElement({ raw: "", cooked: "" }, false),
                t.templateElement({ raw: "", cooked: "" }, true),
              ];
              classNameAttr.value = t.jsxExpressionContainer(
                t.templateLiteral(quasis, [fontVarExpr]),
              );
            } else {
              classNameAttr.value = t.jsxExpressionContainer(
                createTemplateLiteralWithFont(
                  fontVarExpr,
                  t.stringLiteral(classNameAttr.value.value),
                ),
              );
            }
            updatedAst = true;
          } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
            const expr = classNameAttr.value.expression;

            if (t.isTemplateLiteral(expr)) {
              const hasFont = expr.expressions.some(
                (e) =>
                  t.isMemberExpression(e) &&
                  t.isIdentifier(e.object) &&
                  e.object.name === fontName &&
                  t.isIdentifier(e.property) &&
                  e.property.name === "variable",
              );

              if (!hasFont) {
                if (expr.expressions.length > 0) {
                  const lastQuasi = expr.quasis[expr.quasis.length - 1];
                  if (lastQuasi) {
                    lastQuasi.value.raw = lastQuasi.value.raw + " ";
                    lastQuasi.value.cooked = lastQuasi.value.cooked + " ";
                  }
                }
                expr.expressions.push(fontVarExpr);
                if (expr.quasis.length <= expr.expressions.length) {
                  expr.quasis.push(
                    t.templateElement({ raw: "", cooked: "" }, true),
                  );
                }
                updatedAst = true;
              }
            } else if (t.isIdentifier(expr) || t.isMemberExpression(expr)) {
              classNameAttr.value = t.jsxExpressionContainer(
                createTemplateLiteralWithFont(fontVarExpr, expr),
              );
              updatedAst = true;
            }
          }

          if (updatedAst) {
            await this.updateFileWithImport(filePath, content, ast, fontName);
          }
        },
      );

      if (!targetElementFound) {
        console.log(
          `Could not find target elements (${targetElements.join(", ")}) in ${filePath}`,
        );
      }
    } catch (error) {
      console.error(`Error adding font variable to ${filePath}:`, error);
    }
  }

  /**
   * Adds a font variable to the appropriate layout file
   */
  private async addFontVariableToLayout(fontId: string): Promise<boolean> {
    try {
      const routerConfig = await this.detectRouterType();
      if (!routerConfig) {
        return false;
      }

      const fontName = camelCase(fontId);

      if (routerConfig.type === "app") {
        const layoutPath = pathModule.join(routerConfig.basePath, "layout.tsx");
        await this.addFontVariableToElement(layoutPath, fontName, ["html"]);
      } else {
        const appPath = pathModule.join(routerConfig.basePath, "_app.tsx");
        await this.addFontVariableToElement(appPath, fontName, [
          "div",
          "main",
          "section",
          "body",
        ]);
      }
      return true;
    } catch (error) {
      console.error(`Error adding font variable to layout:`, error);
      return false;
    }
  }

  /**
   * Removes a font variable from the layout file
   */
  private async removeFontVariableFromLayout(
    layoutPath: string,
    fontId: string,
    targetElements: string[],
  ): Promise<boolean> {
    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      return false;
    }

    try {
      const content = await sandbox.readFile(layoutPath) ?? '';
      if (!content) {
        return false;
      }

      let updatedAst = false;
      let ast: ParseResult<t.File> | null = null;
      const fontName = camelCase(fontId);

      await this.traverseClassName(
        layoutPath,
        targetElements,
        async (classNameAttr, currentAst) => {
          ast = currentAst;
          if (
            removeFontsFromClassName(classNameAttr, {
              fontIds: [fontName],
            })
          ) {
            updatedAst = true;
          }
        },
      );

      if (updatedAst && ast) {
        // Remove the font import if it exists
        const fontPath = DefaultSettings.FONT_CONFIG.replace(
          /^\.\//,
          "",
        ).replace(/\.ts$/, "");
        const importRegex = new RegExp(
          `import\\s*{([^}]*)}\\s*from\\s*['"]${fontPath}['"]`,
        );
        const importMatch = content.match(importRegex);

        let newContent = generate(ast).code;

        if (importMatch?.[1]) {
          const currentImports = importMatch[1];
          const newImports = currentImports
            .split(",")
            .map((imp) => imp.trim())
            .filter((imp) => {
              const importName = imp.split(" as ")[0]?.trim();
              return importName !== fontName;
            })
            .join(", ");

          if (newImports) {
            newContent = newContent.replace(
              importRegex,
              `import { ${newImports} } from '${fontPath}'`,
            );
          } else {
            newContent = newContent.replace(
              new RegExp(`${importRegex.source}\\n?`),
              "",
            );
          }
        }

        return await sandbox.writeFile(layoutPath, newContent);
      }
      return false;
    } catch (error) {
      console.error(`Error removing font variable from ${layoutPath}:`, error);
      return false;
    }
  }

  /**
   * Updates the font in a layout file by modifying className attributes
   */
  private async updateFontInLayout(
    filePath: string,
    font: Font,
    targetElements: string[],
  ): Promise<CodeDiff | null> {
    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      return null;
    }

    let updatedAst = false;
    const fontClassName = `font-${font.id}`;
    let result = null;

    const normalizedFilePath = normalizePath(filePath);

    const content = await sandbox.readFile(normalizedFilePath);
    if (!content) {
      console.error(`Failed to read file: ${filePath}`);
      return null;
    }

    await this.traverseClassName(normalizedFilePath, targetElements, (classNameAttr, ast) => {
      if (t.isStringLiteral(classNameAttr.value)) {
        classNameAttr.value = createStringLiteralWithFont(
          fontClassName,
          classNameAttr.value.value,
        );
        updatedAst = true;
      } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
        const expr = classNameAttr.value.expression;
        if (t.isTemplateLiteral(expr)) {
          const newQuasis = [
            t.templateElement(
              { raw: fontClassName + " ", cooked: fontClassName + " " },
              false,
            ),
            ...expr.quasis.slice(1),
          ];

          expr.quasis = newQuasis;
          updatedAst = true;
        }
      }
      if (updatedAst) {
        const { code } = generate(ast);
        const codeDiff: CodeDiff = {
          original: content,
          generated: code,
          path: normalizedFilePath,
        };
        result = codeDiff;
      }
    });

    return result;
  }

  /**
   * Detects the current font being used in a layout file
   */
  private async detectCurrentFont(
    filePath: string,
    targetElements: string[],
  ): Promise<string | null> {
    let currentFont: string | null = null;

    await this.traverseClassName(filePath, targetElements, (classNameAttr) => {
      if (t.isStringLiteral(classNameAttr.value)) {
        currentFont = findFontClass(classNameAttr.value.value);
      } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
        const expr = classNameAttr.value.expression;
        if (t.isTemplateLiteral(expr)) {
          const firstQuasi = expr.quasis[0];
          if (firstQuasi) {
            currentFont = findFontClass(firstQuasi.value.raw);
          }
        }
      }
    });

    return currentFont;
  }

  /**
   * Gets the default font from the project
   */
  private async getDefaultFont(): Promise<string | null> {
    try {
      const routerConfig = await this.detectRouterType();

      if (!routerConfig) {
        console.log("Could not detect Next.js router type");
        return null;
      }

      const normalizedFilePath = normalizePath(routerConfig.basePath);

      if (routerConfig.type === "app") {
        const layoutPath = pathModule.join(normalizedFilePath, "layout.tsx");
        return await this.detectCurrentFont(layoutPath, ["html"]);
      } else {
        const appPath = pathModule.join(normalizedFilePath, "_app.tsx");
        return await this.detectCurrentFont(appPath, [
          "div",
          "main",
          "section",
          "body",
        ]);
      }
    } catch (error) {
      console.error("Error getting current font:", error);
      return null;
    }
  }

  /**
   * Sets the default font for the project
   */
  private async setProjectDefaultFont(font: Font): Promise<CodeDiff | null> {
    try {
      const routerConfig = await this.detectRouterType();

      if (!routerConfig) {
        console.log("Could not detect Next.js router type");
        return null;
      }

      if (routerConfig.type === "app") {
        const layoutPath = pathModule.join(routerConfig.basePath, "layout.tsx");
        console.log("layoutPath", layoutPath);
        
        return await this.updateFontInLayout(layoutPath, font, ["html"]);
      } else {
        const appPath = pathModule.join(routerConfig.basePath, "_app.tsx");
        console.log("appPath", appPath);
        return await this.updateFontInLayout(appPath, font, [
          "div",
          "main",
          "section",
          "body",
        ]);
      }
    } catch (error) {
      console.error("Error setting default font:", error);
      return null;
    }
  }

  /**
   * Synchronizes detected fonts with the project configuration files.
   * Uses more sophisticated font handling for layout files.
   */
  private async syncFontsWithConfigs() {
    if (!this.projectManager.project) {
      console.error("No project provided");
      return;
    }

    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      console.error("No sandbox session found");
      return;
    }

    try {
      const currentFonts = await this.scanFonts();
      
      const removedFonts = this.previousFonts.filter(
        (prevFont) =>
          !currentFonts.some((currFont) => currFont.id === prevFont.id),
      );

      const addedFonts = currentFonts.filter(
        (currFont) =>
          !this.previousFonts.some((prevFont) => currFont.id === prevFont.id),
      );


      for (const font of removedFonts) {
        const routerConfig = await this.detectRouterType();

        if (routerConfig) {
          if (routerConfig.type === "app") {
            const layoutPath = pathModule.join(
              routerConfig.basePath,
              "layout.tsx",
            );
            this.selfModified.add(layoutPath);
            await this.removeFontVariableFromLayout(layoutPath, font.id, [
              "html",
            ]);
          } else {
            const appPath = pathModule.join(routerConfig.basePath, "_app.tsx");
            this.selfModified.add(appPath);
            await this.removeFontVariableFromLayout(appPath, font.id, [
              "div",
              "main",
              "section",
              "body",
            ]);
          }
        }
        await this.removeFontFromTailwindConfig(font);
      }

      if (addedFonts.length > 0) {
        for (const font of addedFonts) {
          await this.updateTailwindFontConfig(font);

          const routerConfig = await this.detectRouterType();
          if (routerConfig) {
            if (routerConfig.type === "app") {
              const layoutPath = pathModule.join(
                routerConfig.basePath,
                "layout.tsx",
              );
              this.selfModified.add(layoutPath);
              await this.addFontVariableToLayout(font.id);
            } else {
              const appPath = pathModule.join(
                routerConfig.basePath,
                "_app.tsx",
              );
              this.selfModified.add(appPath);
              await this.addFontVariableToLayout(font.id);
            }
          }
        }
      }

      if (removedFonts.length > 0 || addedFonts.length > 0) {
        this._fonts = currentFonts;
      }

      this.previousFonts = currentFonts;
    } catch (error) {
      console.error("Error syncing fonts:", error);
    }
  }

  /**
   * Detects the router type (app or pages) and the base path of the project
   */
  private async detectRouterType(): Promise<{
    type: "app" | "pages";
    basePath: string;
  } | null> {
    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      return null;
    }

    try {
      // Check for app router (app/layout.tsx)
      const appFiles = await sandbox.listFilesRecursively("app").then((files) => files.filter((file) => file.includes("layout.tsx")));

      if (appFiles.length > 0) {
        return { type: "app", basePath: "app" };
      }

      // Check for pages router (pages/_app.tsx)
      const pagesFiles = await sandbox.listFilesRecursively("pages").then((files) => files.filter((file) => file.includes("_app.tsx")));
      if (pagesFiles.length > 0) {
        return { type: "pages", basePath: "pages" };
      }

      // Default to app router if we can't determine
      return { type: "app", basePath: "app" };
    } catch (error) {
      console.error("Error detecting router type:", error);
      return null;
    }
  }

  /**
   * Removes a font from the Tailwind config
   */
  private async removeFontFromTailwindConfig(font: Font) {
    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      return false;
    }

    try {      
      if (!this.tailwindConfigPath) {
        return false;
      }

      const content = await sandbox.readFile(this.tailwindConfigPath);
      if (!content) {
        return false;
      }

      // Parse the Tailwind config
      const ast = parse(content, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      let themeFound = false;
      let fontFamilyFound = false;

      // Find the theme.fontFamily property and remove the font
      traverse(ast, {
        ObjectProperty(path) {
          if (
            t.isIdentifier(path.node.key) &&
            path.node.key.name === "theme" &&
            path.parent.type === "ObjectExpression"
          ) {
            themeFound = true;

            // Look for fontFamily within theme
            if (t.isObjectExpression(path.node.value)) {
              path.node.value.properties.forEach((prop, index) => {
                if (
                  t.isObjectProperty(prop) &&
                  t.isIdentifier(prop.key) &&
                  prop.key.name === "fontFamily"
                ) {
                  fontFamilyFound = true;

                  // Remove the font from fontFamily
                  if (t.isObjectExpression(prop.value)) {
                    prop.value.properties = prop.value.properties.filter(
                      (fontProp) => {
                        if (
                          t.isObjectProperty(fontProp) &&
                          t.isIdentifier(fontProp.key)
                        ) {
                          return fontProp.key.name !== camelCase(font.id);
                        }
                        return true;
                      },
                    );
                  }
                }
              });
            }
          }
        },
      });

      if (!themeFound || !fontFamilyFound) {
        return false;
      }

      const { code } = generate(ast);
      return await sandbox.writeFile(this.tailwindConfigPath, code);
    } catch (error) {
      console.error("Error removing font from Tailwind config:", error);
      return false;
    }
  }

  /**
   * Updates Tailwind config with a new font
   */
  private async updateTailwindFontConfig(font: Font) {
    const sandbox = this.editorEngine.sandbox;
    if (!sandbox) {
      return false;
    }

    try {
      if (!this.tailwindConfigPath) {
        return false;
      }

      const content = await sandbox.readFile(this.tailwindConfigPath);
      if (!content) {
        return false;
      }

      // Parse the Tailwind config
      const ast = parse(content, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      let themeFound = false;
      let fontFamilyFound = false;
      const fontId = camelCase(font.id);
      const fontVariable = font.variable;

      // Find or create the theme.fontFamily property
      traverse(ast, {
        ObjectProperty(path) {
          if (
            t.isIdentifier(path.node.key) &&
            path.node.key.name === "theme" &&
            path.parent.type === "ObjectExpression"
          ) {
            themeFound = true;

            // Look for fontFamily within theme
            if (t.isObjectExpression(path.node.value)) {
              let fontFamilyProperty = null;

              for (const prop of path.node.value.properties) {
                if (
                  t.isObjectProperty(prop) &&
                  t.isIdentifier(prop.key) &&
                  prop.key.name === "fontFamily"
                ) {
                  fontFamilyProperty = prop;
                  fontFamilyFound = true;
                  break;
                }
              }

              // If fontFamily exists, add the new font
              if (
                fontFamilyFound &&
                fontFamilyProperty &&
                t.isObjectExpression(fontFamilyProperty.value)
              ) {
                // Check if font already exists
                const fontExists = fontFamilyProperty.value.properties.some(
                  (prop) =>
                    t.isObjectProperty(prop) &&
                    t.isIdentifier(prop.key) &&
                    prop.key.name === fontId,
                );

                if (!fontExists) {
                  // Add the new font
                  fontFamilyProperty.value.properties.push(
                    t.objectProperty(
                      t.identifier(fontId),
                      t.arrayExpression([
                        t.stringLiteral(`var(${fontVariable})`),
                        t.stringLiteral("sans-serif"),
                      ]),
                    ),
                  );
                }
              }
              // If fontFamily doesn't exist, create it
              else if (!fontFamilyFound) {
                path.node.value.properties.push(
                  t.objectProperty(
                    t.identifier("fontFamily"),
                    t.objectExpression([
                      t.objectProperty(
                        t.identifier(fontId),
                        t.arrayExpression([
                          t.stringLiteral(`var(${fontVariable})`),
                          t.stringLiteral("sans-serif"),
                        ]),
                      ),
                    ]),
                  ),
                );
              }
            }
          }
        },
      });

      // If theme doesn't exist, create it
      if (!themeFound) {
        traverse(ast, {
          ObjectExpression(path) {
            if (
              path.parent.type === "VariableDeclarator" ||
              path.parent.type === "ReturnStatement"
            ) {
              path.node.properties.push(
                t.objectProperty(
                  t.identifier("theme"),
                  t.objectExpression([
                    t.objectProperty(
                      t.identifier("fontFamily"),
                      t.objectExpression([
                        t.objectProperty(
                          t.identifier(fontId),
                          t.arrayExpression([
                            t.stringLiteral(`var(${fontVariable})`),
                            t.stringLiteral("sans-serif"),
                          ]),
                        ),
                      ]),
                    ),
                  ]),
                ),
              );
            }
          },
        });
      }

      const { code } = generate(ast);
      return await sandbox.writeFile(this.tailwindConfigPath, code);
    } catch (error) {
      console.error("Error updating Tailwind font config:", error);
      return false;
    }
  }
  /**
 * Traverses className attributes in a file and applies a callback
 */
private async traverseClassName(
  filePath: string,
  targetElements: string[],
  callback: TraverseCallback,
): Promise<void> {
  const sandbox = this.editorEngine.sandbox;
  if (!sandbox) {
    console.error("No sandbox session found");
    return;
  }

  try {
    const content = await sandbox.readFile(filePath);
    if (!content) {
      console.error(`Failed to read file: ${filePath}`);
      return;
    }

    const ast = parse(content, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    traverse(ast, {
      JSXOpeningElement(path) {
        if (
          !t.isJSXIdentifier(path.node.name) ||
          !targetElements.includes(path.node.name.name)
        ) {
          return;
        }

        const classNameAttr = path.node.attributes.find(
          (attr): attr is t.JSXAttribute =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name) &&
            attr.name.name === "className",
        );

        if (!classNameAttr) {
          const newClassNameAttr = t.jsxAttribute(
            t.jsxIdentifier("className"),
            t.stringLiteral(""),
          );
          path.node.attributes.push(newClassNameAttr);
          callback(newClassNameAttr, ast);
          return;
        }
        callback(classNameAttr, ast);
      },
    });
  } catch (error) {
    console.error(`Error traversing className in ${filePath}:`, error);
  }
}

}
