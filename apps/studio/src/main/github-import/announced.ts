import { githubLandingPending, registeredProject, rememberGithubImport, takeGithubLanding } from '../workspace/store.js';

const GITHUB_REPO = 'github.com/';

/** The repository a Project was cloned from, when its identity is a GitHub one. */
export function githubRepository(repoIdentity: string): string | undefined {
  return repoIdentity.startsWith(GITHUB_REPO) ? repoIdentity.slice(GITHUB_REPO.length) : undefined;
}

/* A clone's landing is announced once, by main, wherever the person is. The claim sits on the
   Project's own record, so it survives a relaunch and leaves when the Project is deleted; past
   the window the Project keeps its repository name and its turns notify as any other's (ONL-3182). */
export const ANNOUNCEMENT_WINDOW_MS = 10 * 60 * 1000;

export function importedProject(workspacePath: string, repository: string, now = Date.now()): void {
  rememberGithubImport(workspacePath, repository, new Date(now).toISOString());
}

/** Set for the life of the Project, so every notification about it names the repository. */
export function importedRepository(workspacePath: string): string | undefined {
  return registeredProject(workspacePath)?.githubImport?.repository;
}

/** True until the landing of a clone still inside the window has been handed to someone. */
export function importLandingPending(workspacePath: string): boolean {
  return githubLandingPending(workspacePath, ANNOUNCEMENT_WINDOW_MS);
}

export const takeImportLanding = takeGithubLanding;
