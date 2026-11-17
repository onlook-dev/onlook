import { create } from 'zustand';
import { mirror } from '../mirror.js';
import { studio } from '../bridge.js';

/** Whether this tab is in front of the person, as main reports it; off until main answers (ONL-2960). */
export const useOnScreenStore = create<{ isOnScreen: boolean }>()(() => ({ isOnScreen: false }));

const apply = (isOnScreen: boolean): void => {
  if (useOnScreenStore.getState().isOnScreen !== isOnScreen) useOnScreenStore.setState({ isOnScreen });
};

export function subscribeToOnScreen(): () => void {
  return mirror({
    name: ['tips', 'on-screen read'],
    read: () => studio().tabOnScreen(),
    subscribe: (listener) => studio().onTabOnScreen(listener),
    apply: ({ isOnScreen }) => { apply(isOnScreen); },
  }).stop;
}
