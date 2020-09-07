import fs from "fs-extra";
import path from "path";
import spawn from "cross-spawn"
import { SpawnOptions } from "child_process";

async function cmd(process: string, args: Array<string>, options?: SpawnOptions) {
	return new Promise<string>((resolve, reject) => {
		let output = "";
		spawn(process, args, options)
			.on("message", msg => (output += msg))
			.on("error", e => reject(e.message))
			.on("close", () => resolve(output));
	});
}

export abstract class Initializer {
	private static step = 0;
	
	public static async doStep(message: string, callback: () => Promise<unknown>) {
		const start = Date.now();
		process.stdout.write(`\t${++this.step} - ${message}`)
		await callback();
		process.stdout.write(` ( ${Date.now() - start } ms )\n`)
	}

	public static async init() {
		const dir = process.cwd();
		const srcPath = path.join(dir, "src");

		if ((await fs.pathExists(srcPath)) && (await (await fs.readdir(srcPath)).length > 0)) {
			throw new Error("Cannot initialize with existing src directory!")
		}

		await this.doStep("Create package.json...", async () => {
			await cmd("npm", ["init", "-y"])
		})
	}
}