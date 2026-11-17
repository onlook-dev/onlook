export function questionNumberIndex(event: { key: string; altKey: boolean; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; repeat: boolean; defaultPrevented: boolean; isComposing: boolean }, isEditable: boolean): number | undefined {
  if (isEditable || event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || !/^[1-9]$/.test(event.key)) return undefined;
  return Number(event.key) - 1;
}
