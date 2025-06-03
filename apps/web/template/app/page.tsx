'use client';

export default function Page() {
    return (
        <div
            className="w-screen h-screen flex items-center justify-center bg-white dark:bg-black transition-colors duration-200 flex-col p-4 gap-[32px]"
            data-oid="1"
        >
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight" data-oid="3">
                Hello world
            </h1>
            <img
                src="./favicon.ico"
                alt="Don't worry be happy"
                className="object-contain"
                data-oid="7"
            />
        </div>
    );
}
