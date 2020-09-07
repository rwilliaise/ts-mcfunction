import { Compiler } from "./Compiler";
// import { expect } from "chai";
import "mocha";

describe("Compiler", () => {

})

describe("Transpiler", () => {
	describe("#transpile()", () => {
		it("should correctly output a valid mcfunction group", () => {
			let compiler: Compiler = new Compiler("./template");
			console.log(compiler.transpiler.transpile(compiler.project.getSourceFiles()[0]));
		})
	})
})