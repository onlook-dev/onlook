import { getCurrentCommit } from "@onlook/helpers/server";
import path from "path";

const nextConfig = {
    reactStrictMode: true,
    experimental: {
        swcPlugins: [["@onlook/nextjs", { root: path.resolve("."), commit: getCurrentCommit(), absolute: true }]],
    },
}

export default nextConfig
