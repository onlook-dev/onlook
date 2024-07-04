# Onlook nextjs preprocessor

## Usage

1. Install preprocessor library

```bash
npm i --save-dev @onlook/nextjs
```

2. Update `next.config.mjs` or `next.config.js`

```js
import path from "path";

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    swcPlugins: [["@onlook/nextjs", { root: path.resolve(".") }]],
  },
}

export default nextConfig
```

For more, see: https://nextjs.org/docs/pages/api-reference/next-config-js


## Nextjs 13

Unfortunately, Next.js version v13.2.4 ~ v13.3.1 cannot execute SWC Wasm plugins, due to a bug of next-swc. [See more here](https://github.com/vercel/next.js/issues/46989#issuecomment-1486989081). 

Please upgrade to next `13.4.3` or above.

```
npm i next@13.4.3
```

## Backwards compatibility note

The Next plugins ecosystem is still experimental, so SWC ships backwards incompatible version. 

We will keep updating the package to the latest version in hope of a stable release in the future. 

https://swc.rs/docs/plugin/selecting-swc-core