export class DataStoreObjectVersionInfo {
	public readonly CreatedTime: number;
	public readonly IsDeleted: boolean;
	public readonly Version: string;

	/**
	 * @internal
	 */
	public constructor(created: number, isDeleted: boolean, version: string) {
		this.CreatedTime = created;
		this.IsDeleted = isDeleted;
		this.Version = version;
	}
}
