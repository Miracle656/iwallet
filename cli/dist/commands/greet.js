"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.greetCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
exports.greetCommand = new commander_1.Command("greet")
    .description("Greet someone")
    .argument("<name>", "Name of the person to greet")
    .option("-u, --uppercase", "Convert to uppercase")
    .option("-c, --color <color>", "Text color", "green")
    .action((name, options) => {
    let message = `Hello, ${name}!`;
    if (options.uppercase) {
        message = message.toUpperCase();
    }
    const colors = {
        red: chalk_1.default.red,
        green: chalk_1.default.green,
        blue: chalk_1.default.blue,
        yellow: chalk_1.default.yellow,
    };
    const colorFn = colors[options.color ?? "green"] || chalk_1.default.green;
    console.log(colorFn(message));
});
