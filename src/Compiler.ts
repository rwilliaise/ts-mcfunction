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

	constructor(filePath = ".") {
		this.project = new ts.Project({
			tsConfigFilePath: path.join(filePath, "tsconfig.json")
		});
	}
}

export class Transpiler {
	
	private currentGroup: Map<string, string> = new Map();
	private callDummies: Map<ts.Node, string> = new Map();
	private funcParams: Map<ts.Node, Map<string, string>> = new Map();
	private globalsInit: Array<string> = [];
	private globalId: number = 0;

	private usableId(name?: string): string {
		return (name || "TS") + "_" + this.globalId++;
	}

	private pushFile(name: string, contents: string) {
		this.currentGroup.set(name, contents);
	}

	private transpileStatementedNode(node: ts.Node & ts.StatementedNode): string {
		if (!node) { return ""; }
		let result = "";
		for (const child of node.getStatements()) {
			result += this.transpileStatement(child);
			if (child.getKind() === ts.SyntaxKind.ReturnStatement) {
				break;
			}
		}
		return result;
	}

	private getTracer(node: ts.Node) {
		return "[ line " + node.getStartLineNumber() as string + " ] " + node.getSourceFile().getBaseName() + ":";
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

			let name: string = this.usableId(param.getName());
			if (param.isRestParameter()) {
				throw new Error(`${this.getTracer(param)} ... operator unsupported!`);
			}
			if (!this.funcParams.has(node)) {
				this.funcParams.set(node, new Map());
			}
			this.funcParams.get(node)?.set(param.getName(), name);
			initStack.push(`scoreboard objectives add ${name} dummy`);
			paramStack.push(name);

			if (param.isParameterProperty()) {

			}
		});
	}

	private transpileStatement(node: ts.Statement): string {
		if (ts.TypeGuards.isBlock(node)) {
			if (node.getStatements().length === 0) {
				return "";
			}
			return this.transpileBlock(node);
		} else if (ts.TypeGuards.isImportDeclaration(node)) {
		} else if (ts.TypeGuards.isExpressionStatement(node)) {
			return this.transpileExpressionStatement(node);
		} else if (ts.TypeGuards.isFunctionDeclaration(node)) {
			return this.transpileFunctionDeclaration(node);
		} else if (ts.TypeGuards.isClassDeclaration(node)) {
			return this.transpileClassDeclaration(node);
		} else if (
			ts.TypeGuards.isEmptyStatement(node) ||
			ts.TypeGuards.isTypeAliasDeclaration(node) ||
			ts.TypeGuards.isInterfaceDeclaration(node)
		) {
			return "";
		} else {
			console.warn(this.getTracer(node) + " Uncompilable statement! Possibly fatal!");
		}
		return "";
	}

	private transpileExpressionStatement(node: ts.ExpressionStatement): string {
		// big set of rules for expression statements
		const expression = node.getExpression();
		if (
			!ts.TypeGuards.isCallExpression(expression) &&
			!ts.TypeGuards.isNewExpression(expression) &&
			!ts.TypeGuards.isAwaitExpression(expression) &&
			!ts.TypeGuards.isPostfixUnaryExpression(expression) &&
			!(
				ts.TypeGuards.isPrefixUnaryExpression(expression) &&
				(expression.getOperatorToken() === ts.SyntaxKind.PlusPlusToken ||
					expression.getOperatorToken() === ts.SyntaxKind.MinusMinusToken)
			) &&
			!(
				ts.TypeGuards.isBinaryExpression(expression) &&
				(expression.getOperatorToken().getKind() === ts.SyntaxKind.EqualsToken ||
					expression.getOperatorToken().getKind() === ts.SyntaxKind.PlusEqualsToken ||
					expression.getOperatorToken().getKind() === ts.SyntaxKind.MinusEqualsToken ||
					expression.getOperatorToken().getKind() === ts.SyntaxKind.AsteriskEqualsToken ||
					expression.getOperatorToken().getKind() === ts.SyntaxKind.AsteriskAsteriskEqualsToken ||
					expression.getOperatorToken().getKind() === ts.SyntaxKind.SlashEqualsToken ||
					expression.getOperatorToken().getKind() === ts.SyntaxKind.PercentEqualsToken)
			)
		) {
			throw new Error(this.getTracer(expression) + " Expression statements must be variable assignments or function calls.");
		}
		return this.transpileExpression(expression) + "\n";
	}

	private transpileFunctionDeclaration(node: ts.FunctionDeclaration): string {
		const name = node.getNameOrThrow();
		const body = node.getBody();
		let result = "";

		if (!body) {
			this.pushFile(name, "");
			return "";
		}

		if (node.isAsync()) {
			console.warn(this.getTracer(node) + " Promises are currently unsupported.");
		}
		let paramStack = new Array<string>();
		this.getParameters(node, paramStack, this.globalsInit);
		this.callDummies.set(node, this.usableId(name + "_calldummy"));

		if (ts.TypeGuards.isBlock(body)) {
			result += this.transpileBlock(body);
		}

		this.pushFile(name, result);
		return ""; // do not add to initial file
	}

	private transpileCallExpression(node: ts.CallExpression) {
		const exp = node.getExpression();
		const callPath = this.transpileExpression(exp);
		const params = this.transpileArguments(node.getArguments() as Array<ts.Expression>);
		return `${params}\nfunction ${callPath}`;
	}

	// START LITERALS
	private transpileStringLiteral(node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral): string {
		return "";
	}

	private transpileNumericLiteral(node: ts.NumericLiteral): string {
		return node.getLiteralValue().toString();
	}

	private transpileBooleanLiteral(node: ts.BooleanLiteral): string {
		return "";
	}

	// START EXPRESSIONS
	private transpileArrayLiteralExpression(node: ts.ArrayLiteralExpression): string {
		return "";
	}

	private transpileObjectLiteralExpression(node: ts.ObjectLiteralExpression, compress: boolean): string {
		return "";
	}
	// END LITERALS

	private transpileFunctionExpression(node: ts.FunctionExpression | ts.ArrowFunction): string {
		return "";
	}

	private transpileIdentifier(node: ts.Identifier): string {
		if (node.getType().isUndefined()) {
			return "test";
		}
		let name = node.getText();
		return name;
	}

	private getUsableParam(node: ts.Node, name: string): string {
		const parent = 	node.getFirstAncestorByKind(ts.SyntaxKind.FunctionDeclaration) ||
						node.getFirstAncestorByKind(ts.SyntaxKind.MethodDeclaration) ||
						node.getFirstAncestorByKind(ts.SyntaxKind.ArrowFunction) ||
						node.getFirstAncestorByKind(ts.SyntaxKind.Constructor);
		if (parent) {
			let param = this.funcParams.get(parent)?.get(name);
			if (param) {
				return param;
			}
		}
		return "";
	}

	private getCallDummy(node: ts.Node): string {
		const parent = 	node.getFirstAncestorByKind(ts.SyntaxKind.FunctionDeclaration) ||
						node.getFirstAncestorByKind(ts.SyntaxKind.MethodDeclaration) ||
						node.getFirstAncestorByKind(ts.SyntaxKind.ArrowFunction) ||
						node.getFirstAncestorByKind(ts.SyntaxKind.Constructor);
		if (parent) {
			let dummy = this.callDummies.get(node);
			if (dummy) {
				return dummy;
			}
		}
		return "";
	}

	private transpileBinaryExpression(node: ts.BinaryExpression): string {
		const opToken = node.getOperatorToken();
		const opKind = opToken.getKind();

		if (opKind === ts.SyntaxKind.CaretToken || opKind === ts.SyntaxKind.CaretEqualsToken) {
			throw new Error(`${this.getTracer(node)} Binary XOR operator ( ^ ) is not supported! Did you mean to use ** or **=?`);
		}

		let result = "";

		const lhs = node.getLeft();
		const rhs = node.getRight();
		const callDummy = this.getCallDummy(lhs);
		let lhsStr = this.transpileExpression(lhs);
		let rhsStr = this.transpileExpression(rhs);
		if (ts.TypeGuards.isNumericLiteral(lhs)) {
			lhsStr = this.createRegister();
			result += `scoreboard players set @e[tag=${callDummy}] ${lhsStr} ${lhs.getLiteralValue()}\n`
		}
		if (ts.TypeGuards.isNumericLiteral(rhs)) {
			rhsStr = this.createRegister();
			result += `scoreboard players set @e[tag=${callDummy}] ${rhsStr} ${rhs.getLiteralValue()}\n`
		}
		const lhsParam = this.getUsableParam(lhs, lhsStr) || lhsStr; // try and get a parameter for use, or just give up
		const rhsParam = this.getUsableParam(rhs, rhsStr) || rhsStr;
		const getOperandStr = () => {
			switch (opKind) {
				case ts.SyntaxKind.EqualsToken:
					return `scoreboard players operation @e[tag=${callDummy}] ${lhsParam} = @e[tag=${callDummy}] ${rhsParam}`;
				case ts.SyntaxKind.PlusEqualsToken:
					return `scoreboard players operation @e[tag=${callDummy}] ${lhsParam} += @e[tag=${callDummy}] ${rhsParam}`;
				case ts.SyntaxKind.MinusEqualsToken:
					return `scoreboard players operation @e[tag=${callDummy}] ${lhsParam} -= @e[tag=${callDummy}] ${rhsParam}`;
				case ts.SyntaxKind.AsteriskEqualsToken:
					return `scoreboard players operation @e[tag=${callDummy}] ${lhsParam} *= @e[tag=${callDummy}] ${rhsParam}`;
				case ts.SyntaxKind.SlashEqualsToken:
					return `scoreboard players operation @e[tag=${callDummy}] ${lhsParam} /= @e[tag=${callDummy}] ${rhsParam}`;
				case ts.SyntaxKind.AsteriskAsteriskEqualsToken:
					return `scoreboard players operation @e[tag=${callDummy}] ${lhsParam} *= @e[tag=${callDummy}] ${rhsParam}` +
						 `\nscoreboard players operation @e[tag=${callDummy}] ${lhsParam} *= @e[tag=${callDummy}] ${rhsParam}`;
				case ts.SyntaxKind.PercentEqualsToken:
					return `scoreboard players operation @e[tag=${callDummy}] ${lhsParam} %= @e[tag=${callDummy}] ${rhsParam}`;
			}
			throw new Error(`${this.getTracer(node)} Unrecognized operation!`);
		}
		result += getOperandStr();
		return result;
	}

	private transpilePrefixUnaryExpression(node: ts.PrefixUnaryExpression): string {
		return "";
	}

	private transpilePostfixUnaryExpression(node: ts.PostfixUnaryExpression): string {
		return "";
	}

	private transpilePropertyAccessExpression(node: ts.PropertyAccessExpression): string {
		return "";
	}

	private transpileNewExpression(node: ts.NewExpression): string {
		return "";
	}

	private transpileParenthesizedExpression(node: ts.ParenthesizedExpression): string {
		return "";
	}

	private transpileTemplateExpression(node: ts.TemplateExpression): string {
		return "";
	}

	private transpileElementAccessExpression(node: ts.ElementAccessExpression): string {
		return "";
	}

	private transpileConditionalExpression(node: ts.ConditionalExpression): string {
		return "";
	}

	private transpileThisExpression(node: ts.ThisExpression): string {
		return "";
	}

	private transpileTypeOfExpression(node: ts.TypeOfExpression): string {
		return "";
	}

	private transpileSpreadElement(node: ts.SpreadElement): string {
		return "";
	}

	private transpileSuperExpression(node: ts.SuperExpression): string {
		return "";
	}
	// END EXPRESSIONS

	private transpileExpression(node: ts.Expression, compress: boolean = false): string {
		if (ts.TypeGuards.isStringLiteral(node) || ts.TypeGuards.isNoSubstitutionTemplateLiteral(node)) {
			return this.transpileStringLiteral(node);
		} else if (ts.TypeGuards.isNumericLiteral(node)) {
			return this.transpileNumericLiteral(node);
		} else if (ts.TypeGuards.isBooleanLiteral(node)) {
			return this.transpileBooleanLiteral(node);
		} else if (ts.TypeGuards.isArrayLiteralExpression(node)) {
			return this.transpileArrayLiteralExpression(node);
		} else if (ts.TypeGuards.isObjectLiteralExpression(node)) {
			return this.transpileObjectLiteralExpression(node, compress);
		} else if (ts.TypeGuards.isFunctionExpression(node) || ts.TypeGuards.isArrowFunction(node)) {
			return this.transpileFunctionExpression(node);
		} else if (ts.TypeGuards.isCallExpression(node)) {
			return this.transpileCallExpression(node);
		} else if (ts.TypeGuards.isIdentifier(node)) {
			return this.transpileIdentifier(node);
		} else if (ts.TypeGuards.isBinaryExpression(node)) {
			return this.transpileBinaryExpression(node);
		} else if (ts.TypeGuards.isPrefixUnaryExpression(node)) {
			return this.transpilePrefixUnaryExpression(node);
		} else if (ts.TypeGuards.isPostfixUnaryExpression(node)) {
			return this.transpilePostfixUnaryExpression(node);
		} else if (ts.TypeGuards.isPropertyAccessExpression(node)) {
			return this.transpilePropertyAccessExpression(node);
		} else if (ts.TypeGuards.isNewExpression(node)) {
			return this.transpileNewExpression(node);
		} else if (ts.TypeGuards.isParenthesizedExpression(node)) {
			return this.transpileParenthesizedExpression(node);
		} else if (ts.TypeGuards.isTemplateExpression(node)) {
			return this.transpileTemplateExpression(node);
		} else if (ts.TypeGuards.isElementAccessExpression(node)) {
			return this.transpileElementAccessExpression(node);
		} else if (ts.TypeGuards.isAwaitExpression(node)) {
			throw new Error(`${this.getTracer(node)} await is not supported!`);
		} else if (ts.TypeGuards.isConditionalExpression(node)) {
			return this.transpileConditionalExpression(node);
		} else if (ts.TypeGuards.isTypeOfExpression(node)) {
			return this.transpileTypeOfExpression(node);
		} else if (ts.TypeGuards.isSpreadElement(node)) {
			return this.transpileSpreadElement(node);
		} else if (ts.TypeGuards.isThisExpression(node)) {
			if (!node.getFirstAncestorByKind(ts.SyntaxKind.ClassDeclaration)) {
				throw new Error(`${this.getTracer(node)} this is only allowed inside a class!`);
			}
			return this.transpileThisExpression(node);
		} else if (ts.TypeGuards.isSuperExpression(node)) {
			return this.transpileSuperExpression(node);
		} else if (
			ts.TypeGuards.isAsExpression(node) ||
			ts.TypeGuards.isTypeAssertion(node) ||
			ts.TypeGuards.isNonNullExpression(node)
		) {
			return this.transpileExpression(node.getExpression());
		} else if (ts.TypeGuards.isNullLiteral(node)) {
			throw new Error(`${this.getTracer(node)} null is not supported!`);
		} else {
			const kindName = node.getKindName();
			throw new Error(`${this.getTracer(node)} Bad expression: ${kindName}!`);
		}
	}

	private transpileArguments(args: Array<ts.Expression>) {
		return args.map(arg => this.transpileExpression(arg)).join(", ")
	}

	private transpileClassDeclaration(node: ts.ClassDeclaration): string {
		if (node.hasDeclareKeyword()) {
			return "";
		}

		const name = node.getName() || this.usableId();
		let out = "";
		let varStack: Array<string> = new Array();

		node.getMethods()
			.filter(method => method.getBody() !== undefined)
			.forEach(method => {
				this.transpileMethodDeclaration(name, method, varStack);
			});
		varStack.forEach(init => {
			out += `${init}\n`
		});
		this.pushFile(`${name}CLASS`, out);
		return "";
	}

	private transpileMethodDeclaration(className: string, node: ts.MethodDeclaration, initstack: Array<string>) {
		const name = node.getName();
		const body = node.getBodyOrThrow();
		let result = "";

		if (node.isAsync()) {
			console.warn(this.getTracer(node) + " Promises are currently unsupported.");
		}
		let paramStack = new Array<string>();
		this.getParameters(node, paramStack, initstack);
		this.callDummies.set(node, this.usableId(name + "_calldummy"));

		if (ts.TypeGuards.isBlock(body)) {
			result += this.transpileBlock(body);
		}

		this.pushFile(`${className}_${name}`, result);
		return ""; // do not output to inital file
	}

	private transpileBlock(node: ts.Block): string {
		return this.transpileStatementedNode(node);
	}

	private registerId: number = 0;
	private createRegister(): string {
		let id = `register${this.registerId++}`;
		this.globalsInit.push(`$scoreboard objectives add ${id} dummy`);
		return id;
	}

	public transpile(file: ts.SourceFile) {
		this.currentGroup.clear();
		this.globalsInit = new Array();
		let outFile = this.transpileStatementedNode(file);
		outFile = this.globalsInit.join("\n") + outFile;
		this.pushFile(file.getBaseNameWithoutExtension(), outFile);
		return new Map(this.currentGroup); // do NOT return the private map
	}
}