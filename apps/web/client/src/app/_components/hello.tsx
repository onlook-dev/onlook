"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
import styles from "../index.module.css";

export function Hello() {
    const [latestPost] = api.external.api.hello({ text: "world" });



    return (
        <div className={styles.showcaseContainer}>
            {latestPost ? (
                <p className={styles.showcaseText}>
                    Your most recent post: {latestPost.name}
                </p>
            ) : (
                <p className={styles.showcaseText}>You have no posts yet.</p>
            )}

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    createPost.mutate({ name });
                }}
                className={styles.form}
            >
                <input
                    type="text"
                    placeholder="Title"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.input}
                />
                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={createPost.isPending}
                >
                    {createPost.isPending ? "Submitting..." : "Submit"}
                </button>
            </form>
        </div>
    );
}