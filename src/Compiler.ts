import * as ts from "ts-morph";

export class Compiler {
	public project: ts.Project;
	public transpiler: Transpiler = new Transpiler();

	constructor() {
		this.project = new ts.Project();
	}
}

export class Transpiler {
	

	private transpileStatementedNode(node: ts.Node & ts.StatementedNode): string {
		let result = "";
		node.getStatements().forEach(child => {
			result += this.transpileStatement(child);
		});
		return result;
	}

	private transpileStatement(node: ts.Statement): string {
		if (ts.TypeGuards.isBlock(node)) {
			if (node.getStatements().length === 0) {
				return "";
			}
			return this.transpileBlock(node);
		} else if (ts.TypeGuards.isImportDeclaration(node)) {
			
		} else if (
			ts.TypeGuards.isEmptyStatement(node) ||
			ts.TypeGuards.isTypeAliasDeclaration(node) ||
			ts.TypeGuards.isInterfaceDeclaration(node)
		) {
			return "";
		}
		return "";
	}

	private transpileBlock(node: ts.Block): string {
		return this.transpileStatementedNode(node);
	}

	public transpile(file: ts.SourceFile) {
		this.transpileStatementedNode(file);
	}
}