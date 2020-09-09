import { Compiler } from "./Compiler";
// import { expect } from "chai";
import "mocha";

describe("Compiler", () => {
	describe("#compile()", () => {
		it("should correctly, without error, output a valid output", () => {
			let compiler: Compiler = new Compiler("./template");
			compiler.compile();
		})
	})
});