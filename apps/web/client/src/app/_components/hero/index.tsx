import { Create } from './create';
import { Preview } from './preview';

export function Hero() {
    return (
        <div className="w-full h-full grid grid-cols-2 items-center justify-center">
            <div className="w-full h-full">
                <Preview />
            </div>
            <div className="w-full h-full">
                <Create />
            </div>
        </div>
    );
}
