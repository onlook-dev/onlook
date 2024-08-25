# Onlook supports Remix projects!

This project a template/demo that showcases how you can edit your Remix project with Onlook.

The steps to do this are
1. install the Vite plugin for React project and the Onlook Babel transform:
```bash
npm install --save-dev @vitejs/plugin-react @onlook/babel-plugin-react 
```

The Onlook Babel transform adds metadata to JSX elements, which makes it possible for Onlook to modify them.

2. Update the `vite.config.js` to the following:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    // ... your existing plugins
    react({
      babel: {
        plugins: ["@onlook/babel-plugin-react"],
      },
    }),
  ],
});
```

For an example, see `vite.config.js` in this project.

# Welcome to Remix!

- 📖 [Remix docs](https://remix.run/docs)

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

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
