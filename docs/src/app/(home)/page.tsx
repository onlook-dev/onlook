import { redirect } from 'next/navigation';

export default function HomePage() {
    redirect('/docs');

    return (
        <main className="flex flex-1 flex-col justify-center text-center">
            <h1 className="mb-4 text-2xl font-bold">Welcome to Onlook Docs</h1>
        </main>
    );
}
