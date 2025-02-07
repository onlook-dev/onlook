import { Configuration, TargetConfiguration } from 'electron-builder';
import baseConfig from './base';

const config: Configuration = {
    ...baseConfig,
    mac: {
        ...baseConfig.mac,
        target: [
            {
                target: 'dmg',
                arch: ['arm64'],
            } as TargetConfiguration,
            {
                target: 'zip',
                arch: ['arm64'],
            } as TargetConfiguration,
        ],
    },
};

export default config;
