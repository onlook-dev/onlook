# Onlook supports Astro + React projects!

This project a template/demo that showcases how you can edit your Astro project with Onlook.

The steps to do this are:

1. install the React integration

```bash
npx astro add react
```

2. Install the Onlook babel plugin
```bash
npm install --save-dev @onlook/babel-plugin-react
```

3. Update the `astro.config.mjs` to the following:

```js
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
	server: {
		port: 3000,
	},
	integrations: [
		// ... your existing integrations
		react({
			babel: {
				plugins: ["@onlook/babel-plugin-react"],
			},
		}),
	],
});
```

Start your dev server and open the onlook application, you can make changes to the react components in your app.

```bash
npm run dev
```
