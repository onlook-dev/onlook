import fs from 'node:fs';
import ora from 'ora';

export const writeEnvFile = (filePath: string, content: string, label: string) => {
    const spinner = ora(`Writing ${label} .env to ${filePath}`).start();
    try {
        fs.appendFileSync(filePath, content);
        spinner.succeed(`${label} .env written to ${filePath}`);
    } catch (err) {
        spinner.fail(`Failed writing ${label} .env`);
        throw err;
    }
};
