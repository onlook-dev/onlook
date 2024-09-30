import { SetupStage, type SetupCallback } from "..";
import { BUILD_TOOL_NAME, CONFIG_FILE_PATTERN, CRA_DEPENDENCIES, NEXT_DEPENDENCIES, VITE_DEPENDENCIES, WEBPACK_DEPENDENCIES } from "../constants";
import { getFileExtensionByPattern, installPackages } from "../utils";
import { isCRAProject, modifyCRAConfig } from "./cra";
import { isNextJsProject, modifyNextConfig } from "./next";
import { isViteJsProject, modifyViteConfig } from "./vite";
import { isWebpackProject, modifyWebpackConfig } from "./webpack";

export class Framework {
    static readonly NEXT = new Framework("Next.js", isNextJsProject, modifyNextConfig, NEXT_DEPENDENCIES, BUILD_TOOL_NAME.NEXT);
    static readonly VITE = new Framework("Vite", isViteJsProject, modifyViteConfig, VITE_DEPENDENCIES, BUILD_TOOL_NAME.VITE);
    static readonly WEBPACK = new Framework("Webpack", isWebpackProject, modifyWebpackConfig, WEBPACK_DEPENDENCIES, BUILD_TOOL_NAME.WEBPACK);
    static readonly CRA = new Framework("Create React App", isCRAProject, modifyCRAConfig, CRA_DEPENDENCIES, BUILD_TOOL_NAME.CRA);

    private constructor(
        public readonly name: string,
        public readonly identify: () => Promise<boolean>,
        public readonly updateConfig: (configFileExtension: string) => void,
        public readonly dependencies: string[],
        public readonly buildToolName: BUILD_TOOL_NAME
    ) { }

    setup = async (callback: SetupCallback): Promise<boolean> => {

        if (await this.identify()) {
            callback(SetupStage.INSTALLING, `Installing required packages for ${this.name}...`);

            await installPackages(this.dependencies);

            callback(SetupStage.CONFIGURING, `Applying ${this.name} configuration...`);
            const configFileExtension = await getFileExtensionByPattern(process.cwd(), CONFIG_FILE_PATTERN[this.buildToolName]);
            if (configFileExtension) {
                await this.updateConfig(configFileExtension);
            }
            return true;
        }
        return false;
    }

    static getAll(): Framework[] {
        return [
            this.NEXT,
            this.VITE,
            this.WEBPACK,
            this.CRA,
        ];
    }
}
