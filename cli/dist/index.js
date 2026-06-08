#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const greet_1 = require("./commands/greet");
const program = new commander_1.Command();
program.name("my-cli").description("A sample CLI application").version("1.0.0");
// Add commands
program.addCommand(greet_1.greetCommand);
// Parse arguments
program.parse();
