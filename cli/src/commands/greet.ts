import { Command } from "commander";
import chalk from "chalk";

export const greetCommand = new Command("greet")
  .description("Greet someone")
  .argument("<name>", "Name of the person to greet")
  .option("-u, --uppercase", "Convert to uppercase")
  .option("-c, --color <color>", "Text color", "green")
  .action((name: string, options: { uppercase?: boolean; color?: string }) => {
    let message = `Hello, ${name}!`;

    if (options.uppercase) {
      message = message.toUpperCase();
    }

    const colors: Record<string, (text: string) => string> = {
      red: chalk.red,
      green: chalk.green,
      blue: chalk.blue,
      yellow: chalk.yellow,
    };

    const colorFn = colors[options.color ?? "green"] || chalk.green;
    console.log(colorFn(message));
  });
