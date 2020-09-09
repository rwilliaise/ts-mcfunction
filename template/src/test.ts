//skipdummy
let variable = 2;

function increment(a: number) {
	variable += a;
	console.log(a);
	console.log(variable);
}

export class Incrementer {

	increment() {
		variable += 1;
	}

	static test() {
		variable += 1;
	}
}


console.log(variable);