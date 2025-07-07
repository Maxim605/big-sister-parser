import * as chalk from "chalk";
import { plainToClass } from "class-transformer";
import { validateSync } from "class-validator";
import { load } from "js-yaml";

import * as fs from "fs";

import { Settings } from "./entities/settings";

const SETTINGS_PARSING_ERROR = "\n\nSETTINGS PARSING ERROR";

function parseYml(filePath: string): any {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return load(content);
  } catch (e) {
    console.error(chalk.red(`${SETTINGS_PARSING_ERROR} ${filePath}`));
    console.error(chalk.red(e));
    console.log(e);
    process.exit(1);
  }
}

function validateSettings(settings: Settings): Settings {
  const errors = validateSync(settings);

  if (errors.length) {
    console.error(chalk.red(SETTINGS_PARSING_ERROR));
    console.error(chalk.red(errors.join("\n")));
    process.exit(1);
  }

  return settings;
}

function getSettings(settingsFilePath = "./settings.yml"): Settings {
  let settings = parseYml(settingsFilePath);

  if (!settings) {
    console.error(chalk.red(`${SETTINGS_PARSING_ERROR} empty file content`));
    process.exit(1);
  }

  settings = validateSettings(plainToClass(Settings, settings));
  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
  settings.apiVersion = packageJson.version;

  return settings;
}

const settings = getSettings();

export default settings;
