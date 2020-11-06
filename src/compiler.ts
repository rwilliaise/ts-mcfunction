import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

export class CompilerNode {

	public static readonly NODE_MAP: Map<ts.SyntaxKind, CompilerNode> = new Map<ts.SyntaxKind, CompilerNode>();

	private children: CompilerNode[] = new Array<CompilerNode>();

	emitChildren(): void {
		this.children.forEach((node) => {
			if (node instanceof EmittableNode) {
				node.emit();
			}
			node.emitChildren();
		})
	}

	push(node: CompilerNode) {
		this.children.push(node);
	}
}

export abstract class EmittableNode extends CompilerNode {

	protected constructor(kind?: ts.SyntaxKind) {
		super();
		if (kind) {
			CompilerNode.NODE_MAP.set(kind, this);
		}
	}

	abstract emit(): string;
}

/**
 * Used to compile a group of Typescript files.
 */
export class Program extends CompilerNode {


	public constructor(file: string,
	                   options: ts.CompilerOptions = JSON.parse(fs.readFileSync(path.join(file, "tsconfig.json")).toString())) {

		super();
	}
}
