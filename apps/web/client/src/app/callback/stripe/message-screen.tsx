export default function MessageScreen({
    title,
    message,
    icon,
}: {
    title: string;
    message: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
            {icon}
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-lg">{message}</p>
        </div>
    );
}
