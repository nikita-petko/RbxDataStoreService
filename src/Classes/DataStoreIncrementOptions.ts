export class DataStoreIncrementOptions {
	private attributes: Record<string, unknown>;
	public constructor(attributes?: Record<string, unknown>) {
		this.attributes = attributes || {};
	}
	public GetMetadata() {
		return this.attributes;
	}
	public SetMetadata(attributes: Record<string, unknown>) {
		if (this.attributes !== attributes) {
			this.attributes = attributes;
		}
	}
}
