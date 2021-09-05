export class DataStoreKeyInfo {
	public readonly CreatedTime: number;
	public readonly UpdatedTime: number;
	public readonly Version: string;

	/**
	 * @internal
	 */
	public constructor(
		created: number,
		updated: number,
		version: string,
		metadata: Map<string, unknown>,
		userIds: number[],
	) {
		this.CreatedTime = created;
		this.UpdatedTime = updated;
		this.Version = version;
		this.metadata = metadata;
		this.userIds = userIds;
	}

	public GetMetadata() {
		return this.metadata;
	}

	public GetUserIds() {
		return this.userIds;
	}

	/**
	 * @internal
	 */
	private readonly metadata: Map<string, unknown>;
	/**
	 * @internal
	 */
	private readonly userIds: number[];
}
