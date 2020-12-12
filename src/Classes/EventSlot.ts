class EventSlot {
	public callback: (...args: any[]) => any;

	public constructor(callback: (...args: any[]) => any) {
		this.callback = callback;
	}

	public fire<Variant extends any>(value: Variant): boolean | void {
		if (typeof value === 'undefined') return;
		try {
			this.callback(value);
		} catch (error) {
			// TODO: Disconnect?
			return process.stderr.write(error.message);
		}
	}
}
