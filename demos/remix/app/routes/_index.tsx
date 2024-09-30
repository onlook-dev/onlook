import type { MetaFunction } from "@remix-run/node";
import React, { Fragment } from "react";

export const meta: MetaFunction = () => {
    return [
        { title: "New Remix App" },
        { name: "description", content: "Welcome to Remix!" },
    ];
};

export default function Index() {
    return (
        <div className="font-sans p-4">
            <>
                <React.Fragment>
                    <Fragment>
                        <h1 className="text-3xl">Welcome to Remix</h1>
                    </Fragment>
                </React.Fragment>
            </>
            <ul className="list-disc mt-4 pl-6 space-y-2">
                <li>
                    <a
                        className="text-blue-700 underline visited:text-purple-900"
                        target="_blank"
                        href="https://remix.run/docs"
                        rel="noreferrer"
                    >
                        Remix Docs
                    </a>
                </li>
                <li>
                    <a
                        className="text-blue-700 underline visited:text-purple-900"
                        target="_blank"
                        href="https://remix.run/start/quickstart"
                        rel="noreferrer"
                    >
                        5m Quick Start
                    </a>
                </li>
                <li>
                    <a
                        className="text-blue-700 underline visited:text-purple-900"
                        target="_blank"
                        href="https://remix.run/start/tutorial"
                        rel="noreferrer"
                    >
                        30m Tutorial
                    </a>
                </li>
            </ul>
        </div>
    );
}
