#!/usr/bin/env node
import { Command } from "commander";
import { greetCommand } from "./commands/greet";

const program = new Command();

program.name("my-cli").description("A sample CLI application").version("1.0.0");

// Add commands
program.addCommand(greetCommand);

// Parse arguments
program.parse();
