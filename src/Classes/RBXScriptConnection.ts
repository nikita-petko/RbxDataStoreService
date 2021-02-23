export class RBXScriptConnection {
	private evt: any = null;
	private connectionStillAlive = false;
	public constructor(evt: any) {
		this.evt = evt;
		this.connectionStillAlive = true;
		evt.on('close', () => {
			this.connectionStillAlive = false;
		});
	}

	public get Connected() {
		return this.connectionStillAlive;
	}
	public Disconnect(): void {
		if (this.connectionStillAlive) {
			this.evt.emit('close');
			this.connectionStillAlive = false;
		}
	}
}
