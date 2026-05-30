import chalk from "chalk";

export const logger = {
  info: (msg: string) => console.log(chalk.blue(`ℹ ${msg}`)),
  success: (msg: string) => console.log(chalk.green(`✔ ${msg}`)),
  error: (msg: string) => console.error(chalk.red(`✖ ${msg}`)),
  warn: (msg: string) => console.log(chalk.yellow(`⚠ ${msg}`)),
};
