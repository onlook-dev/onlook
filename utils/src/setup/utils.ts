import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { execSync } from 'child_process';
import * as glob from 'glob';
import * as path from 'path';
import {
  JS_FILE_EXTENSION,
  LOCK_FILE_NAME,
  MJS_FILE_EXTENSION,
  PACKAGE_JSON,
  PACKAGE_MANAGER,
  TS_FILE_EXTENSION
} from './constants';

export const exists = async (filePattern: string): Promise<boolean> => {
  try {
    const pattern = path.resolve(process.cwd(), filePattern);
    const files = getFileNamesByPattern(pattern);
    return files.length > 0;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export const getFileNamesByPattern = (pattern: string): string[] => glob.globSync(pattern);

export const installPackages = async (packages: string[]): Promise<void> => {
  const packageManager = await getPackageManager();
  const command = packageManager === PACKAGE_MANAGER.YARN ? 'yarn add -D' : `${packageManager} install -D`;

  console.log("Package manager found:", packageManager)
  console.log("\n$", `${command} ${packages.join(' ')}`)

  execSync(`${command} ${packages.join(' ')}`, { stdio: 'inherit' });
};

export const getPackageManager = async (): Promise<PACKAGE_MANAGER> => {
  try {
    if (await exists(LOCK_FILE_NAME.YARN)) {
      return PACKAGE_MANAGER.YARN;
    }
    if (await exists(LOCK_FILE_NAME.PNPM)) {
      return PACKAGE_MANAGER.PNPM;
    }
    if (await exists(LOCK_FILE_NAME.BUN)) {
      return PACKAGE_MANAGER.BUN;
    }
    return PACKAGE_MANAGER.NPM;
  } catch (e) {
    console.error("Error determining package manager, using npm by default", e)
    return PACKAGE_MANAGER.NPM
  }

};

export const hasDependency = async (dependencyName: string): Promise<boolean> => {
  const packageJsonPath = path.resolve(PACKAGE_JSON);
  if (await exists(packageJsonPath)) {
    const packageJson = require(packageJsonPath);
    return (
      (packageJson.dependencies && packageJson.dependencies[dependencyName]) ||
      (packageJson.devDependencies && packageJson.devDependencies[dependencyName])
    );
  }
  return false;
};

export const getFileExtensionByPattern = async (dir: string, filePattern: string): Promise<string | null> => {
  const fullDirPattern = path.resolve(dir, filePattern);
  const files = await getFileNamesByPattern(fullDirPattern);

  if (files.length > 0) {
    return path.extname(files[0]);
  }

  return null;
};

export const genASTParserOptionsByFileExtension = (fileExtension: string, sourceType: string = 'module'): object => {
  switch (fileExtension) {
    case JS_FILE_EXTENSION:
      return {
        sourceType: sourceType
      };
    case MJS_FILE_EXTENSION:
      return {
        sourceType: sourceType,
        plugins: ['jsx']
      };
    case TS_FILE_EXTENSION:
      return {
        sourceType: sourceType,
        plugins: ['typescript']
      };
    default:
      return {};
  }
};

export const genImportDeclaration = (fileExtension: string, dependency: string): t.VariableDeclaration | t.ImportDeclaration | null => {
  switch (fileExtension) {
    case JS_FILE_EXTENSION:
      return t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier(dependency),
          t.callExpression(t.identifier('require'), [t.stringLiteral(dependency)])
        )
      ]);
    case MJS_FILE_EXTENSION:
      return t.importDeclaration(
        [t.importDefaultSpecifier(t.identifier(dependency))],
        t.stringLiteral(dependency)
      );
    default:
      return null;
  }
};

export const checkVariableDeclarationExist = (path: NodePath<t.VariableDeclarator>, dependency: string): boolean => {
  return t.isIdentifier(path.node.id, { name: dependency }) &&
    t.isCallExpression(path.node.init) &&
    (path.node.init.callee as t.V8IntrinsicIdentifier).name === 'require' &&
    (path.node.init.arguments[0] as any).value === dependency;
};

export const isSupportFileExtension = (fileExtension: string): boolean => {
  return [JS_FILE_EXTENSION, MJS_FILE_EXTENSION].indexOf(fileExtension) !== -1;
};

export const isViteProjectSupportFileExtension = (fileExtension: string): boolean => {
  return [JS_FILE_EXTENSION, TS_FILE_EXTENSION].indexOf(fileExtension) !== -1;
};
