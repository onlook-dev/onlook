const { defineConfig } = require('electron-builder');
const path = require('path');
const os = require('os');

module.exports = defineConfig({
  beforeBuild: async (context) => {
    process.env.npm_config_node_gyp = path.join(__dirname, 'scripts', 'node-gyp-wrapper.js');
    process.env.npm_config_build_from_source = 'true';
  },
  directories: {
    output: 'release',
    buildResources: 'build'
  },
  files: [
    'dist-electron',
    'dist',
    'scripts/node-gyp-wrapper.js'
  ],
  extraResources: [
    {
      from: 'scripts/node-gyp-wrapper.js',
      to: 'scripts/node-gyp-wrapper.js'
    }
  ],
  mac: {
    target: ['dmg', 'zip'],
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },
  win: {
    target: ['nsis', 'zip'],
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },
  linux: {
    target: ['AppImage', 'deb'],
    artifactName: '${productName}-${version}-${arch}.${ext}'
  }
});
