# Onlook supports React with Webpack!

For base Webpack project, use [babel-loader](https://www.npmjs.com/package/babel-loader) in order to use the Babel plugin

1. Install `babel-loader` and the plugin 
```bash
npm install -D babel-loader @babel/core @babel/preset-env webpack @onlook/babel-plugin-react
```

1. Add `babel-loader` rule in webpack.config.js

```js
module: {
  rules: [
    {
      test: /\.(?:js|mjs|cjs|ts|tsx|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', { targets: "defaults" }]
          ]
        }
      }
    }
  ]
}
```

3. Add the onlook babel plugin

If it doesn't exists, create a `.babelrc` file and add the onlook plugin.
```json
{
  "plugins": ["@onlook/react"]
}
```

4. Run the project normally
