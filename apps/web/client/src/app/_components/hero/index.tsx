'use client';

import { Create } from './create';
import { ContributorSection } from '../landing-page/ContributorSection';

export function Hero() {
    return (
        <div className="w-full h-full items-center justify-center">
            <div className="w-full h-full">
                <Create />
            </div>
        </div>
    );
}
