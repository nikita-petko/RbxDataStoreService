export class DataStoreKey {
	public readonly KeyName: string;

	/**
	 * @internal
	 */
	public constructor(name: string) {
		this.KeyName = name;
	}
}
