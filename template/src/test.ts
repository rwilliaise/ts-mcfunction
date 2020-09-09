let variable = 2;

function increment() {
	variable += 1;
}

class Incrementer {

	increment() {
		variable += 1;
	}

	static test() {
		variable += 1;
	}
}

Incrementer.test();