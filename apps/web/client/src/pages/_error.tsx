import { Button } from "@onlook/ui/button";
import Link from "next/link";

function Error({ statusCode }: { statusCode: number }) {
    return (
        <div className="flex flex-col items-center justify-center size-screen gap-4">
            <h1 className="text-2xl font-bold">Error</h1>
            <p className="text-lg">
                {statusCode
                    ? `An error ${statusCode} occurred on server`
                    : 'An error occurred on client'}
            </p>
            <Link href="/">
                <Button variant="outline">Go to home</Button>
            </Link>
        </div>
    );
}

Error.getInitialProps = ({ res, err }: { res: any; err: any }) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
    return { statusCode };
};

export default Error;
