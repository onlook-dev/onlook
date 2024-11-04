import {
    intercept,
    isObservableProp,
    observe,
    type IValueDidChange,
    type IValueWillChange,
} from 'mobx';

export class ObservableWatcher<T extends object> {
    constructor(
        target: T,
        onWillChange: (key: keyof T, change: IValueWillChange<any>) => void,
        onDidChange: (key: keyof T, change: IValueDidChange<any>) => void,
    ) {
        for (const key in target) {
            if (isObservableProp(target, key)) {
                intercept(target, key, (change) => {
                    onWillChange(key, change);
                    return change;
                });
                observe(target, key, (change) => {
                    onDidChange(key, change);
                });
            }
        }
    }
}
