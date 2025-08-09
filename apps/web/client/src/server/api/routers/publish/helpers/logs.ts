export type DeploymentLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export type DeploymentLogEntry = {
  timestamp: number;
  level: DeploymentLogLevel;
  message: string;
};

const MAX_ENTRIES_PER_DEPLOYMENT = 500;

const deploymentLogs = new Map<string, DeploymentLogEntry[]>();

export const addDeploymentLog = (
  deploymentId: string,
  message: string,
  level: DeploymentLogLevel = 'info',
): void => {
  if (!deploymentId) return;
  const entry: DeploymentLogEntry = {
    timestamp: Date.now(),
    level,
    message,
  };
  const list = deploymentLogs.get(deploymentId) ?? [];
  list.push(entry);
  // Trim to max
  if (list.length > MAX_ENTRIES_PER_DEPLOYMENT) {
    const excess = list.length - MAX_ENTRIES_PER_DEPLOYMENT;
    list.splice(0, excess);
  }
  deploymentLogs.set(deploymentId, list);
};

export const getDeploymentLogs = (deploymentId: string): DeploymentLogEntry[] => {
  if (!deploymentId) return [];
  return deploymentLogs.get(deploymentId) ?? [];
};

export const clearDeploymentLogs = (deploymentId: string): void => {
  if (!deploymentId) return;
  deploymentLogs.delete(deploymentId);
};


