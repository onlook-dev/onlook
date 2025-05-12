'use client';

export default function Page() {
    return (
        <div
            className="w-full min-h-screen flex items-center justify-center bg-white dark:bg-black transition-colors duration-200 flex-col p-4 gap-[32px]"
            data-oid="1"
        >
            <div className="text-center text-gray-900 dark:text-gray-100 p-4 m-6" data-oid="2">
                <h1 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight" data-oid="3">
                    Don't
                </h1>
                <h1 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight" data-oid="4">
                    Worry
                </h1>
                <h1 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight" data-oid="5">
                    Be
                </h1>
                <h1 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight" data-oid="6">
                    Happy
                </h1>
                <img
                    src="./favicon.ico"
                    alt="Don't worry be happy"
                    className="object-contain absolute"
                    data-oid="7"
                />
            </div>
            <div className="text-center text-gray-900 dark:text-gray-100 p-4 m-6" data-oid="8">
                <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.</p>
            </div>
        </div>
    );
}
