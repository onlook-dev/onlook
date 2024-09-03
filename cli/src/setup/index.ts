import { BUILD_TOOL_NAME, CONFIG_FILE_PATTERN, CRA_DEPENDENCIES, ONLOOK_NEXTJS_PLUGIN, VITE_DEPENDENCIES, WEBPACK_DEPENDENCIES } from './constants';
import { ensureConfigOverrides, isCRAProject, modifyStartScript } from './cra';
import { isNextJsProject, modifyNextConfig } from './next';
import { getFileExtensionByPattern, installPackages } from './utils';
import { isViteJsProject, modifyViteConfig } from './vite';
import { isWebpackProject, modifyBabelrc, modifyWebpackConfig } from './webpack';

export const setup = async (): Promise<void> => {
  try {
    if (await isNextJsProject()) {
      console.log('This is a Next.js project.');
      await installPackages([ONLOOK_NEXTJS_PLUGIN]);
      const configFileExtension = await getFileExtensionByPattern(process.cwd(), CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.NEXT]);
      if (configFileExtension) {
        modifyNextConfig(configFileExtension);
      }
      return;
    }

    if (await isCRAProject()) {
      console.log('This is a create-react-app project.');
      await installPackages(CRA_DEPENDENCIES);
      ensureConfigOverrides();
      modifyStartScript();
      return;
    }

    if (await isWebpackProject()) {
      console.log('This is a webpack project.');
      await installPackages(WEBPACK_DEPENDENCIES);
      const configFileExtension = await getFileExtensionByPattern(process.cwd(), CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.WEBPACK]);
      if (configFileExtension) {
        modifyWebpackConfig(configFileExtension);
      }
      modifyBabelrc();
      return;
    }

    if (await isViteJsProject()) {
      console.log('This is a Vite project.');
      await installPackages(VITE_DEPENDENCIES);
      const configFileExtension = await getFileExtensionByPattern(process.cwd(), CONFIG_FILE_PATTERN[BUILD_TOOL_NAME.VITE]);
      if (configFileExtension) {
        modifyViteConfig(configFileExtension);
      }
      return;
    }

    console.warn('Cannot determine the project framework.', '\nIf this is unexpected, see: https://github.com/onlook-dev/onlook/wiki/How-to-set-up-my-project%3F#do-it-manually');
  } catch (err) {
    console.error(err);
  }
};
