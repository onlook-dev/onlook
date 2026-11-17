export function liveClaudeEnv(
  configDir: string,
  loginEnv: NodeJS.ProcessEnv,
  queryEnv?: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  return {
    ...loginEnv,
    ...queryEnv,
    CLAUDE_CONFIG_DIR: configDir,
    CLAUDE_SECURESTORAGE_CONFIG_DIR:
      loginEnv['CLAUDE_SECURESTORAGE_CONFIG_DIR'] ?? loginEnv['CLAUDE_CONFIG_DIR'] ?? '',
  };
}
