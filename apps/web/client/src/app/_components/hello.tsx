"use client";

import { api } from "@/trpc/react";


export function Hello() {
    const [hi] = api.hello.useSuspenseQuery();
    const [hello] = api.external.hello.useSuspenseQuery();

    console.log(hi);
    console.log(hello);
    return (
        <div className="showcaseContainer">
            <p>{hi}</p>
            <p>{hello}</p>
        </div>
    );
}