import { CRA_DEPENDENCIES } from './constants';
import { ensureConfigOverrides, isCRAProject, modifyStartScript } from './cra';
import { Framework } from './frameworks';
import { installPackages } from './utils';

export const setup = async (): Promise<void> => {
  try {
    for (const framework of Framework.getAll()) {
      const updated = await framework.run();
      if (updated) {
        return;
      }
    }

    if (await isCRAProject()) {
      console.log('This is a create-react-app project.');
      await installPackages(CRA_DEPENDENCIES);
      ensureConfigOverrides();
      modifyStartScript();
      return;
    }


    console.warn('Cannot determine the project framework.', '\nIf this is unexpected, see: https://github.com/onlook-dev/onlook/wiki/How-to-set-up-my-project%3F#do-it-manually');
  } catch (err) {
    console.error(err);
  }
};
