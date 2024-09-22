# Onlook supports Vite/Remix projects!

This project a template/demo that showcases how you can edit your Vite project with Onlook.


There are 2 ways to do this:

## Option 1: Use the npx script

```
npx onlook setup
```

## Option 2: Manual

#### 1. Install the Vite plugin for React project and the Onlook Babel transform:
```bash
npm install --save-dev @vitejs/plugin-react @onlook/babel-plugin-react 
```

The Onlook Babel transform adds metadata to JSX elements, which makes it possible for Onlook to modify them.


#### 2. Update the `vite.config.js` to the following:

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


#### 3. Run your project and open the url in Onlook
Run you project as you usually do (by default, just write `vite` in terminal), and Vite will run your project on `localhost`, for example `localhost:5173`:

![image](https://github.com/user-attachments/assets/37235915-7255-49df-a109-194b196282ff)

After that, you can easily open your project in Onlook, just write the url your project running at (e.g. `localhost:5173`):

![image](https://github.com/user-attachments/assets/40987e5e-9182-47fe-ada5-f4870d20ec18)

