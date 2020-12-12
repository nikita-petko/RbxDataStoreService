class UnsignedIntegerCountAverage {
	public constructor() {
		this.count = 0;
		this.average = 0;
	}

	public count: number;
	public average: number;

	public incrementValueAverage(value: number) {
		if (this.count === 0) {
			this.count = 1;
			this.average = value;
		} else {
			this.average -= this.average / this.count;
			this.average += value / this.count;
			this.count = this.count + 1;
		}
	}
}
