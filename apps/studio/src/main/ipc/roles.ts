const chromeSenders = new WeakSet<object>();

export function registerStudioChromeSender(sender: object): void {
  chromeSenders.add(sender);
}

const taskManagerSenders = new WeakSet<object>();

export function registerTaskManagerSender(sender: object): void {
  taskManagerSenders.add(sender);
}

export function isTaskManagerSender(sender: object): boolean {
  return taskManagerSenders.has(sender);
}

export function isStudioChromeSender(sender: object): boolean {
  return chromeSenders.has(sender);
}
