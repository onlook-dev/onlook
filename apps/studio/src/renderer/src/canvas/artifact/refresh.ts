export function createArtifactRefresh(reload: () => void): {
  update(revision: string | undefined): void;
  ready(): void;
} {
  let initialized = false;
  let revision: string | undefined;
  let ready = false;
  let pending = false;
  const flush = () => {
    if (!ready || !pending) return;
    pending = false;
    ready = false;
    reload();
  };
  return {
    update(next) {
      if (initialized && next !== revision) pending = true;
      initialized = true;
      revision = next;
      flush();
    },
    ready() {
      ready = true;
      flush();
    },
  };
}
