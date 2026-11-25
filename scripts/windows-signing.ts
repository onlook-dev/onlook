export function windowsSigning(env: NodeJS.ProcessEnv): { unsigned: boolean; win: Record<string, unknown>; forceCodeSigning: boolean } {
  if (env['ONLOOK_WINDOWS_ALLOW_UNSIGNED'] === '1') {
    return { unsigned: true, forceCodeSigning: false, win: { signExecutable: false, verifyUpdateCodeSignature: false } };
  }
  const required = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'ONLOOK_AZURE_SIGN_ENDPOINT', 'ONLOOK_AZURE_SIGN_ACCOUNT', 'ONLOOK_AZURE_SIGN_PROFILE'];
  const missing = required.filter((key) => !env[key] || env[key]?.startsWith('FILL_ME'));
  if (missing.length) throw new Error(`Windows signing is not configured: ${missing.join(', ')}. For an explicitly unsigned build set ONLOOK_WINDOWS_ALLOW_UNSIGNED=1.`);
  return {
    unsigned: false,
    forceCodeSigning: true,
    win: {
      verifyUpdateCodeSignature: true,
      azureSignOptions: {
        endpoint: env['ONLOOK_AZURE_SIGN_ENDPOINT'],
        codeSigningAccountName: env['ONLOOK_AZURE_SIGN_ACCOUNT'],
        certificateProfileName: env['ONLOOK_AZURE_SIGN_PROFILE'],
        publisherName: WINDOWS_PUBLISHER_NAME,
      },
    },
  };
}
export const WINDOWS_PUBLISHER_NAME = 'On Off, Inc.';
