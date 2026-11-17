export const MAC_TEAM_ID = 'WLQ3KTS8SZ';
export const MAC_APP_ID = 'com.onlook.studio';
export const MAC_DESIGNATED_REQUIREMENT = `identifier "${MAC_APP_ID}" and anchor apple generic and certificate 1[field.1.2.840.113635.100.6.2.6] and certificate leaf[field.1.2.840.113635.100.6.1.13] and certificate leaf[subject.OU] = ${MAC_TEAM_ID}`;

function normalizedRequirement(value: string): string {
  return value.replace(/\/\*.*?\*\//g, '').replaceAll(`"${MAC_TEAM_ID}"`, MAC_TEAM_ID).replace(/\s+/g, ' ').trim();
}

export function assertMacSigningIdentity(metadata: string): void {
  const identifier = metadata.match(/^Identifier=(.+)$/m)?.[1]?.trim();
  const team = metadata.match(/^TeamIdentifier=(.+)$/m)?.[1]?.trim();
  const requirement = metadata.match(/^designated => (.+)$/m)?.[1];
  if (identifier !== MAC_APP_ID || team !== MAC_TEAM_ID || requirement === undefined
    || normalizedRequirement(requirement) !== normalizedRequirement(MAC_DESIGNATED_REQUIREMENT)) {
    throw new Error('Packaged Onlook signing identity changed: require com.onlook.studio, team WLQ3KTS8SZ and the stable Developer ID designated requirement');
  }
}
