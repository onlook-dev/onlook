# Onlook supports Next.js projects!

This project a template/demo that showcases how you can edit your Next.js project with Onlook.

The steps to do this are

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


# Welcome to Nextjs!

- 📖 [Nextjs docs](https://nextjs.org/docs)

## Development

Run the dev server:

```shellscript
npm run dev
```

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
