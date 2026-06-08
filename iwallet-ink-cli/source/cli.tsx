#!/usr/bin/env node
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
  Usage
    $ iwallet-ink-cli

  Options
    --name  Your name

  Examples
    $ iwallet-ink-cli --name=Jane
`,
	{
		importMeta: import.meta,
		flags: {
			name: {type: 'string'},
		},
	},
);

render(<App name={cli.flags.name} />);
