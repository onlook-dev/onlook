import { type Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Onlook',
    description: 'Onlook – Invitation',
};

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center">
            {children}
        </div>
    );
}
