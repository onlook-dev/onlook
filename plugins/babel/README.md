# Onlook svelte preprocessor

## Usage

1. Install preprocessor library

```bash
npm i --save-dev @onlook/babel-plugin-react
```

2. Add the onlook preprocessor

If it doesn't exists, create a `.babelrc` file and add the onlook preprocessor.
```
{
  "plugins": ["@onlook/react"]
}
```

## Using with Create react app
To use with Create React App, access to webpack configuration is required to add the preprocessor. This requires either [ejecting the app](https://create-react-app.dev/docs/available-scripts/#npm-run-eject) or using `react-app-rewired`. 


### Using react-app-rewired
1. Install dependencies 

```
npm install react-app-rewired customize-cra @onlook/babel-plugin-react --save-dev
```


2. Modify the `package.json` scripts

In your package.json, replace react-scripts with react-app-rewired in the start, build, and test scripts.

```
"scripts": {
  "start": "react-app-rewired start",
  "build": "react-app-rewired build",
  "test": "react-app-rewired test",
  "eject": "react-scripts eject"
},
```

3. Create a `config-overrides.js` file

In the root of your project, create a file named `config-overrides.js` with the following content.

```
const { override, addBabelPlugins } = require('customize-cra');

module.exports = override(
  ...addBabelPlugins(
    '@onlook/react'
  )
);
```

### Ejecting create-react-app
Alternatively, you can eject create-react-app. This exposes the internals of how create-react-app works which allows us to use the preprocessor. 

WARNING: This cannot be reversed! Before ejecting, it's highly recommended to commit your current changes to version control. This way, you have a point to revert back to in case something goes wrong during the eject process.


1. Run the Eject Command

In your project directory, run the following command:
 ```
 npm run eject
 ```

You'll notice that the config and scripts folders have been added to your project directory. These folders contain all the configuration files and scripts that were previously managed by CRA, including webpack, Babel, ESLint, etc.

2. Add the onlook preprocessor

If it doesn't exists, create a `.babelrc` file and add the onlook preprocessor.
```
{
  "plugins": ["@onlook/react"]
}
```