"use client";

import { api } from "@/trpc/react";


export function Hello() {
    const [internal] = api.hello.useSuspenseQuery();
    const [external] = api.external.hello.useSuspenseQuery();

    return (
        <div className="showcaseContainer">
            <p>{internal}</p>
            <p>{external}</p>
        </div>
    );
}