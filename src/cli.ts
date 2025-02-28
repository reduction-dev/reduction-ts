#!/usr/bin/env bun
import { Command } from 'commander';

// Get version from package.json
let version = '0.0.1';
try {
  const packageJson = require('../package.json');
  version = packageJson.version;
} catch (e) {
  // Ignore errors
}

// Create the CLI program
const program = new Command();

program
  .name('reduction-ts')
  .description('TypeScript SDK for the Reduction streaming engine')
  .version(version);

// Add the config command
program
  .command('config')
  .description('Output the job configuration as JSON')
  .action(() => {
    console.error('Error: You need to provide an implementation of the config command.');
    process.exit(1);
  });

// Add the serve command
program
  .command('serve')
  .description('Start the handler server')
  .option('-p, --port <port>', 'The port to listen on', '8080')
  .action((options) => {
    console.error('Error: You need to provide an implementation of the serve command.');
    process.exit(1);
  });

// Parse the command line arguments
program.parse(process.argv);

// If no command was specified, show the help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
