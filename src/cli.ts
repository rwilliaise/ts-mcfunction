#!/usr/bin/env node

import yargs from "yargs";
import { Initializer } from "./Initializer"

const argv = yargs
	.usage("Usage: mctsc [options]")

	.alias("v", "version")
	.version(require("../package.json").version as string)
	.describe("version", "show version information")

	.alias("h", "help")
	.help("help")
	.describe("help", "show hep information")
	.showHelpOnFail(false, "specify --help for avaliable options")

	.option("init", {
		alias: "i",
		default: false,
		describe: "Initialize a base workspace for mctsc"
	})

	.wrap(yargs.terminalWidth())
	
	.parse();

void (async () => {
	try {
		if (argv.init) {

		} else {
			
		}
	} catch(e) {
		e.log();
	}
})();