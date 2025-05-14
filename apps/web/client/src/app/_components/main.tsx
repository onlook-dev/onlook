'use client';

import { Hero } from './hero';
import { TopBar } from './top-bar';

export default function Main() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center relative">
            <div className="absolute flex top-0 left-0 w-full h-12 bg-background">
                <TopBar />
            </div>
            <div className="w-screen h-screen flex items-center justify-center">
                <Hero />
            </div>
        </div>
    );
}
