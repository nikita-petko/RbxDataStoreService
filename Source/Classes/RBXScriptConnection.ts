import EventEmitter from 'events';

export class RBXScriptConnection {
	/**
	 * @internal
	 */
	private _emitter: EventEmitter = null;
	/**
	 * @internal
	 */
	private connectionStillAlive = false;

	/**
	 * @internal
	 */
	public constructor(_eventEmitter: EventEmitter) {
		this._emitter = _eventEmitter;
		this.connectionStillAlive = true;
		_eventEmitter.on('close', () => {
			this.connectionStillAlive = false;
		});
	}

	public get Connected() {
		return this.connectionStillAlive;
	}
	public Disconnect(): void {
		if (this.connectionStillAlive) {
			this._emitter.emit('close');
			this.connectionStillAlive = false;
		}
	}
}
