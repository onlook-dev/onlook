# Astro/React Onlook Example

## Create a new Astro project with the React integration

You can skip this step if you already have one created.

```bash
npm create astro@latest
```

```bash
npx astro add react
```

## Add the Onlook babel plugin

```js
// astro.config.mjs
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
	server: {
		port: 3000,
	},
	integrations: [
		react({
			babel: {
				plugins: ["@onlook/babel-plugin-react"],
			},
		}),
	],
});
```

Start your dev server and open the onlook application.

```bash
npm run dev
```
