import { describe, expect, test } from 'bun:test';

import { classifyDestructiveGit, externallyVisibleGit } from './destructive-git.js';

describe('the spellings a prefix rule already catches', () => {
  test('force-push, however it is written', () => {
    expect(classifyDestructiveGit('git push --force')).toBe('force_push');
    expect(classifyDestructiveGit('git push -f')).toBe('force_push');
    expect(classifyDestructiveGit('git push --force-with-lease')).toBe('force_push');
    expect(classifyDestructiveGit('git push origin +main')).toBe('force_push');
    expect(classifyDestructiveGit('git push --force origin main')).toBe('force_push');
  });

  test('a remote branch delete is a delete, not a push', () => {
    expect(classifyDestructiveGit('git push origin --delete topic')).toBe('branch_delete');
    expect(classifyDestructiveGit('git push origin -d topic')).toBe('branch_delete');
    expect(classifyDestructiveGit('git push origin :topic')).toBe('branch_delete');
  });

  test('a local branch delete, both cases', () => {
    expect(classifyDestructiveGit('git branch -d topic')).toBe('branch_delete');
    expect(classifyDestructiveGit('git branch -D topic')).toBe('branch_delete');
    expect(classifyDestructiveGit('git branch --delete topic')).toBe('branch_delete');
  });

  test('a hard reset, with or without a revision', () => {
    expect(classifyDestructiveGit('git reset --hard')).toBe('hard_reset');
    expect(classifyDestructiveGit('git reset --hard HEAD~1')).toBe('hard_reset');
    expect(classifyDestructiveGit('git reset --hard origin/main')).toBe('hard_reset');
  });

  test('flag order does not matter', () => {
    expect(classifyDestructiveGit('git push -f origin main')).toBe('force_push');
    expect(classifyDestructiveGit('git reset HEAD~1 --hard')).toBe('hard_reset');
  });
});

describe('the shapes a prefix rule cannot catch', () => {
  test('a repository given by flag', () => {
    expect(classifyDestructiveGit('git -C /tmp/x push -f')).toBe('force_push');
    expect(classifyDestructiveGit('git -c push.default=current push --force')).toBe('force_push');
  });

  test('an absolute path to git', () => {
    expect(classifyDestructiveGit('/usr/bin/git push -f')).toBe('force_push');
    expect(classifyDestructiveGit('/opt/homebrew/bin/git reset --hard')).toBe('hard_reset');
  });

  test('a quoted subcommand', () => {
    expect(classifyDestructiveGit("git 'push' -f")).toBe('force_push');
    expect(classifyDestructiveGit('git "reset" --hard')).toBe('hard_reset');
  });

  test('a shell wrapper', () => {
    expect(classifyDestructiveGit('bash -c "git push -f"')).toBe('force_push');
    expect(classifyDestructiveGit("sh -c 'git branch -D topic'")).toBe('branch_delete');
  });

  test('a runner that executes its arguments', () => {
    expect(classifyDestructiveGit('mise exec -- git push -f')).toBe('force_push');
    expect(classifyDestructiveGit('npx --no-install git reset --hard')).toBe('hard_reset');
  });

  test('a runner option that takes a value', () => {
    expect(
      classifyDestructiveGit('git branch --merged | grep -v main | xargs -n 1 git branch -d'),
    ).toBe('branch_delete');
    expect(classifyDestructiveGit('git branch --merged | xargs -I {} git branch -D {}')).toBe(
      'branch_delete',
    );
    expect(classifyDestructiveGit('xargs -P 4 -n 1 git push origin --delete < gone.txt')).toBe(
      'branch_delete',
    );
    expect(classifyDestructiveGit('git branch | xargs -rn 1 git branch -d')).toBe('branch_delete');
    expect(classifyDestructiveGit('git branch | xargs -0I {} git branch -D {}')).toBe(
      'branch_delete',
    );
    expect(classifyDestructiveGit('git branch | xargs -tn 1 git push origin --delete')).toBe(
      'branch_delete',
    );
    expect(classifyDestructiveGit('git branch | xargs --max-args 1 git branch -d')).toBe(
      'branch_delete',
    );
  });

  test('a compound command, where only one part is destructive', () => {
    expect(classifyDestructiveGit('cd /tmp/x && git push -f')).toBe('force_push');
    expect(classifyDestructiveGit('git fetch; git reset --hard origin/main')).toBe('hard_reset');
  });

  test('short options bundled into one token', () => {
    expect(classifyDestructiveGit('git push -fu origin topic')).toBe('force_push');
    expect(classifyDestructiveGit('git push -uf origin topic')).toBe('force_push');
    expect(classifyDestructiveGit('git push -qf origin topic')).toBe('force_push');
    expect(classifyDestructiveGit('git branch -dr origin/topic')).toBe('branch_delete');
    expect(classifyDestructiveGit('git branch -qD topic')).toBe('branch_delete');
  });

  test('a wrapper that takes an operand of its own', () => {
    expect(classifyDestructiveGit('timeout 30 git push -f')).toBe('force_push');
    expect(classifyDestructiveGit('timeout 30s git push --force')).toBe('force_push');
    expect(classifyDestructiveGit('nice -n 10 git reset --hard')).toBe('hard_reset');
  });

  test('a wrapper option that takes a value', () => {
    expect(classifyDestructiveGit('timeout -s KILL 30 git push -f')).toBe('force_push');
    expect(classifyDestructiveGit('timeout --signal KILL 30 git push -f')).toBe('force_push');
    expect(classifyDestructiveGit('timeout -s KILL -k 5 30 git reset --hard')).toBe('hard_reset');
    expect(classifyDestructiveGit('env -u GIT_DIR git push -f')).toBe('force_push');
    expect(classifyDestructiveGit('env --unset GIT_DIR git branch -D topic')).toBe('branch_delete');
    expect(classifyDestructiveGit('env -C app git push -f')).toBe('force_push');
    expect(classifyDestructiveGit('env -P /usr/bin git push -f')).toBe('force_push');
    expect(classifyDestructiveGit('stdbuf -o L git push -f')).toBe('force_push');
    expect(classifyDestructiveGit('stdbuf -oL git push -f')).toBe('force_push');
  });

  test('the compound spellings ordinary shell work produces', () => {
    expect(classifyDestructiveGit('git branch --merged | grep -v main | xargs git branch -d')).toBe(
      'branch_delete',
    );
    expect(classifyDestructiveGit('for b in x; do git branch -D "$b"; done')).toBe('branch_delete');
    expect(classifyDestructiveGit('if [ -n "$x" ]; then git reset --hard HEAD~1; fi')).toBe(
      'hard_reset',
    );
    expect(classifyDestructiveGit('(git push -f)')).toBe('force_push');
    expect(classifyDestructiveGit('{ git push --force origin main; }')).toBe('force_push');
    // The group closes on the last token, so the flag it carries is the one being read (ONL-2933).
    expect(classifyDestructiveGit('(cd app && git push --force)')).toBe('force_push');
    expect(classifyDestructiveGit('(cd app && git branch -D topic)')).toBe('branch_delete');
  });

  test('a compound whose opening keyword runs the command', () => {
    expect(classifyDestructiveGit('if git push -f origin main; then echo ok; fi')).toBe(
      'force_push',
    );
    expect(classifyDestructiveGit('while git branch -D foo; do :; done')).toBe('branch_delete');
    expect(classifyDestructiveGit('until git reset --hard HEAD~1; do :; done')).toBe('hard_reset');
  });

  test('a command continued across a line', () => {
    expect(classifyDestructiveGit('git push \\\n  --force origin main')).toBe('force_push');
  });

  test('a shell whose -c is bundled with other short options', () => {
    expect(classifyDestructiveGit('bash -lc "git push -f"')).toBe('force_push');
    expect(classifyDestructiveGit("sh -ec 'git branch -D topic'")).toBe('branch_delete');
  });
});

describe('what must stay quiet, so routine work does not ask', () => {
  test('a message that merely contains a destructive-looking fragment', () => {
    expect(classifyDestructiveGit('git commit -m "fix -f handling"')).toBeUndefined();
    expect(classifyDestructiveGit('git commit -m "revert the --hard reset"')).toBeUndefined();
  });

  test('a runner whose command is not git', () => {
    expect(classifyDestructiveGit('ls | xargs -n 1 echo')).toBeUndefined();
    expect(classifyDestructiveGit('ls | xargs -0n1 echo')).toBeUndefined();
    expect(classifyDestructiveGit('git branch | xargs -I {} git log -1 {}')).toBeUndefined();
    expect(externallyVisibleGit('ls | xargs -n 1 echo')).toBe(false);
    expect(externallyVisibleGit('git branch | xargs -I {} git log -1 {}')).toBe(false);
  });

  test('ordinary read-only git', () => {
    expect(classifyDestructiveGit('git status --short')).toBeUndefined();
    expect(classifyDestructiveGit('git log --oneline')).toBeUndefined();
    expect(classifyDestructiveGit('git diff HEAD~1')).toBeUndefined();
  });

  test('ordinary writing git', () => {
    expect(classifyDestructiveGit('git push origin main')).toBeUndefined();
    expect(classifyDestructiveGit('git add -A')).toBeUndefined();
    expect(classifyDestructiveGit('git checkout -b topic')).toBeUndefined();
    expect(classifyDestructiveGit('git reset HEAD~1')).toBeUndefined();
    expect(classifyDestructiveGit('git reset --soft HEAD~1')).toBeUndefined();
  });

  test('short option bundles that carry no destructive letter', () => {
    expect(classifyDestructiveGit('git push -u origin main')).toBeUndefined();
    expect(classifyDestructiveGit('git push -qn origin main')).toBeUndefined();
    expect(classifyDestructiveGit('git push -o ci.skip origin main')).toBeUndefined();
    expect(classifyDestructiveGit('git branch -r')).toBeUndefined();
    expect(classifyDestructiveGit('git branch -M main')).toBeUndefined();
    expect(classifyDestructiveGit('git branch -av')).toBeUndefined();
  });

  test('a wrapper around routine work stays quiet', () => {
    expect(classifyDestructiveGit('timeout 30 git status')).toBeUndefined();
    expect(classifyDestructiveGit('timeout -s KILL 30 git status')).toBeUndefined();
    expect(classifyDestructiveGit('env -u GIT_DIR git log -1')).toBeUndefined();
    expect(classifyDestructiveGit('bash -lc "git commit -m fix"')).toBeUndefined();
    expect(externallyVisibleGit('env -u GIT_DIR git log -1')).toBe(false);
  });

  test('a branch whose name merely contains a dash and a letter', () => {
    expect(classifyDestructiveGit('git branch fix-dropdown')).toBeUndefined();
    expect(classifyDestructiveGit('git branch feature-docs')).toBeUndefined();
    expect(classifyDestructiveGit('git branch -m old new-Design')).toBeUndefined();
  });

  test('a different program whose name ends in git', () => {
    expect(classifyDestructiveGit('legit push -f')).toBeUndefined();
    expect(classifyDestructiveGit('gitk --all')).toBeUndefined();
  });

  test('nothing at all', () => {
    expect(classifyDestructiveGit('')).toBeUndefined();
    expect(classifyDestructiveGit('   ')).toBeUndefined();
  });
});

describe('a command that publishes work, which is asked about every time (ONL-2933)', () => {
  test('a push, however it is spelled', () => {
    expect(externallyVisibleGit('git push')).toBe(true);
    expect(externallyVisibleGit('git push origin main')).toBe(true);
    expect(externallyVisibleGit('git push -u origin topic')).toBe(true);
    expect(externallyVisibleGit('git -C /tmp/x push')).toBe(true);
    expect(externallyVisibleGit('/usr/bin/git push --dry-run')).toBe(true);
    expect(externallyVisibleGit("git 'push'")).toBe(true);
  });

  test('a pull request opened or merged', () => {
    expect(externallyVisibleGit('gh pr create --fill')).toBe(true);
    expect(externallyVisibleGit('gh pr merge 12 --squash')).toBe(true);
    expect(externallyVisibleGit('gh --repo onlook/studio pr create')).toBe(true);
    expect(externallyVisibleGit('gh pr -R onlook/studio create')).toBe(true);
  });

  test('the one part of a compound command that publishes, which is the reported case', () => {
    expect(
      externallyVisibleGit('git commit -m "wip" && git push origin topic; git log -1; git status'),
    ).toBe(true);
    expect(externallyVisibleGit('git add -A; git commit -m x; gh pr create')).toBe(true);
  });

  test('a wrapper, a runner or a shell around it', () => {
    expect(externallyVisibleGit('timeout 30s git push')).toBe(true);
    expect(externallyVisibleGit('timeout -s KILL 30 git push')).toBe(true);
    expect(externallyVisibleGit('bash -lc "git push origin main"')).toBe(true);
    expect(externallyVisibleGit('mise exec -- git push')).toBe(true);
    expect(externallyVisibleGit('git branch | xargs -n 1 git push origin')).toBe(true);
    expect(externallyVisibleGit('if git push; then echo ok; fi')).toBe(true);
    // A group closing on the subcommand itself, which is the token being compared (ONL-2933).
    expect(externallyVisibleGit('(cd app && git push)')).toBe(true);
    expect(externallyVisibleGit('(gh pr create)')).toBe(true);
    expect(externallyVisibleGit('{ cd app && git push origin main; }')).toBe(true);
  });

  test('work that stays on the machine, so its card still offers a persistent choice', () => {
    expect(externallyVisibleGit('git status --short')).toBe(false);
    expect(externallyVisibleGit('git log --oneline')).toBe(false);
    expect(externallyVisibleGit('git commit -m "ship the push card"')).toBe(false);
    expect(externallyVisibleGit('npm run build')).toBe(false);
    expect(externallyVisibleGit('echo git push')).toBe(false);
    expect(externallyVisibleGit('gh pr view 12')).toBe(false);
    expect(externallyVisibleGit('gh pr list')).toBe(false);
    expect(externallyVisibleGit('gh issue create')).toBe(false);
    expect(externallyVisibleGit('git pushx')).toBe(false);
    // A closing quote sits past the paren, so stripping a group never reaches quoted text.
    expect(externallyVisibleGit('git commit -m "wip (push)"')).toBe(false);
    expect(externallyVisibleGit('')).toBe(false);
  });
});
