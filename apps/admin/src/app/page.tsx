export default function HomePage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white">
            <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
                    Onlook <span className="text-blue-500">Admin</span>
                </h1>
                <p className="text-2xl text-slate-300">
                    Hello World
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
                    <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
                        <h3 className="text-2xl font-bold">Status →</h3>
                        <div className="text-lg">
                            Admin app is running on port 3001
                        </div>
                    </div>
                    <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20">
                        <h3 className="text-2xl font-bold">Next Steps →</h3>
                        <div className="text-lg">
                            Add tRPC routes and authentication
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
