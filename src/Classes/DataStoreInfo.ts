export class DataStoreInfo {
	public readonly CreatedTime: number;
	public readonly UpdatedTime: number;
	public readonly DataStoreName: string;

	/**
	 * @internal
	 */
	public constructor(created: number, updated: number, name: string) {
		this.CreatedTime = created;
		this.UpdatedTime = updated;
		this.DataStoreName = name;
	}
}
