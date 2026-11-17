import type { Plugin } from 'vite';
export interface NoticeEntry {
  name: string;
  version: string;
  license: string;
  flag: string;
  source: string;
  textStatus: string;
  texts: { file: string; text: string }[];
  evidence: string;
  surfaces?: string[];
  integrity?: string;
  licenseSource?: string;
  additionalNotices?: { file: string; sha256: string }[];
  embeddedComponents?: { name: string; version: string; source: string; publisherSource: string }[];
  artifacts?: { file: string; sha256: string }[];
}
export const repositoryRoot: string;
export const inventoryPath: string;
export function packagePath(name: string, parent: string): string;
export function licenseFlag(license?: string): string;
export function isNoticeFile(name: string): boolean;
export function archiveNoticeFiles(files: string[]): { prefix: string; notices: string[] };
export function publisherEvidence(directory: string, manifest: { name: string; version: string }): { artifacts: { file: string; sha256: string }[]; components: { name: string; version: string; source: string; publisherSource: string }[] };
export function packageRecord(path: string): NoticeEntry;
export function runtimePackages(path: string, seen?: Set<string>, result?: Map<string, NoticeEntry>): Map<string, NoticeEntry>;
export function assertCovered(records: { name: string; version: string; evidence?: string; license?: string; embeddedComponents?: { name: string; version: string }[] }[], inventory: NoticeEntry[]): void;
export function renderNotice(inventory: NoticeEntry[]): string;
export function buildPackages(root: string, moduleFiles: Iterable<string>): NoticeEntry[];
export function thirdPartyPlugin(root: string, starterPins?: Record<string, string>): Plugin;
export function verifyArchive(archive: string, asar: {
  extractFile(archive: string, path: string): Buffer;
  listPackage(archive: string): string[];
}, inventory: NoticeEntry[], targetNotices?: Record<string, Buffer>): { name: string; version: string }[];
