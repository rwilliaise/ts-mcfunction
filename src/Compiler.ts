import * as ts from "ts-morph";

// import fs from "fs-extra";
import path from "path";

type HasParameters =
	| ts.FunctionExpression
	| ts.ArrowFunction
	| ts.FunctionDeclaration
	| ts.ConstructorDeclaration
	| ts.MethodDeclaration
	| ts.GetAccessorDeclaration
	| ts.SetAccessorDeclaration;

export class Compiler {
	public project: ts.Project;
	public transpiler: Transpiler = new Transpiler();

	constructor() {
		this.project = new ts.Project({
			tsConfigFilePath: path.resolve("./template/tsconfig.json")
		});
	}
}

export class Transpiler {
	
	private currentGroup: Map<string, string> = new Map();
	private globalId: number = 0;

	private usableId(name = "TS"): string {
		return name + "_" + ++this.globalId;
	}

	private pushFile(name: string, contents: string) {
		this.currentGroup.set(name, contents);
	}

	private transpileStatementedNode(node: ts.Node & ts.StatementedNode) {
		if (!node) { return; }
		node.getStatements().forEach(child => {
			this.transpileStatement(child);
		});
	}

	private getTracer(node: ts.Node) {
		return "[ " + node.getStartLineNumber() as string + ":" + node.getStartLinePos() as string + " ] " + node.getSourceFile().getBaseName() + ":";
	}

	private getParameters(node: HasParameters, paramStack: Array<string>, initStack: Array<string>) {
		node.getParameters().forEach(param => {
			const child = 
				param.getFirstChildByKind(ts.SyntaxKind.Identifier) ||
				param.getFirstChildByKind(ts.SyntaxKind.ArrayBindingPattern) ||
				param.getFirstChildByKind(ts.SyntaxKind.ObjectBindingPattern);

			if (!child) {
				throw new Error(`${this.getTracer(node)} Child missing from paramater! ${param}`);
			}

			let name: string;
			if (ts.TypeGuards.isIdentifier(child)) {
				name = child.getText();
			} else if (child.getKind() === ts.SyntaxKind.ArrayBindingPattern 
					|| child.getKind() === ts.SyntaxKind.ObjectBindingPattern) {
				name = this.usableId();
			} else {
				throw new Error(`${this.getTracer(child)} Unexpected param type! (${child.getKindName()})`);
			}

			if (param.isRestParameter()) {
				console.warn(`${this.getTracer(param)} ... operator unsupported!`);
				return;
			}
			paramStack.push(name);

			if (param.hasScopeKeyword()) {

			}
		});
	}

	private transpileStatement(node: ts.Statement) {
		if (ts.TypeGuards.isBlock(node)) {
			if (node.getStatements().length === 0) {
				return;
			}
			this.transpileBlock(node);
		} else if (ts.TypeGuards.isImportDeclaration(node)) {

		} else if (ts.TypeGuards.isFunctionDeclaration(node)) {
			this.transpileFunctionDeclaration(node);
		} else if (ts.TypeGuards.isClassDeclaration(node)) {
			this.transpileClassDeclaration(node);
		} else if (
			ts.TypeGuards.isEmptyStatement(node) ||
			ts.TypeGuards.isTypeAliasDeclaration(node) ||
			ts.TypeGuards.isInterfaceDeclaration(node)
		) {
			
		} else {
			console.warn(this.getTracer(node) + " Uncompilable statement! Possibly fatal!");
		}
	}

	private transpileFunctionDeclaration(node: ts.FunctionDeclaration) {

	}

	private transpileClassDeclaration(node: ts.ClassDeclaration) {
		if (node.hasDeclareKeyword()) {
			return;
		}

		const name = node.getName() || this.usableId();
		let out = "";
		let varStack: Array<string> = new Array();

		node.getMethods()
			.filter(method => method.getBody() !== undefined)
			.forEach(method => {
				this.transpileMethodDeclaration(name, method, varStack);
			});
		this.pushFile(name + "_DEF", out);
	}

	private transpileMethodDeclaration(className: string, node: ts.MethodDeclaration, initstack: Array<string>) {
		const name = node.getName();
		const body = node.getBodyOrThrow();

		if (node.isAsync()) {
			console.warn(this.getTracer(node) + " Promises are currently unsupported.");
			
		}
	}

	private transpileBlock(node: ts.Block) {
		this.transpileStatementedNode(node);
	}

	public transpile(file: ts.SourceFile) {
		this.currentGroup.clear();
		this.transpileStatementedNode(file);
		return new Map(this.currentGroup); // do NOT return the private map
	}
}