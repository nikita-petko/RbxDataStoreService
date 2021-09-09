/**
 * An object describing information about a particular version of the key.
 * This is returned as the second return value by [GlobalDataStore:GetAsync](https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/GetAsync),
 * [GlobalDataStore:UpdateAsync](https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/UpdateAsync),
 * [GlobalDataStore:IncrementAsync](https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/IncrementAsync),
 * [GlobalDataStore:RemoveAsync](https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/RemoveAsync), and [DataStore:GetVersionAsync](https://developer.roblox.com/en-us/api-reference/function/DataStore/GetVersionAsync).
 *
 * ---
 * SEE ALSO
 * --------
 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
 *
 * ---
 */
export class DataStoreKeyInfo {
	/**
	 * This property indicates the date and time the object was created, formatted as the number of milliseconds since epoch.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 */
	public readonly CreatedTime: number;
	/**
	 * This property indicates the date and time the object was last updated, formatted as the number of milliseconds since epoch.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 */
	public readonly UpdatedTime: number;
	/**
	 * This property uniquely identifies the version of the object. It can be passed to [DataStore:GetVersionAsync](https://developer.roblox.com/en-us/api-reference/function/DataStore/GetVersionAsync) or [DataStore:RemoveVersionAsync](https://developer.roblox.com/en-us/api-reference/function/DataStore/RemoveVersionAsync) to get or remove the version respectively.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 */
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

	/**
	 * This function returns the metadata associated with the latest version of the object.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 * @returns {Map<string, unknown>} Metadata associated with the key.
	 */
	public GetMetadata(): Map<string, unknown> {
		return this.metadata;
	}

	/**
	 * This function returns an array of [UserIds](https://developer.roblox.com/en-us/api-reference/property/Player/UserId) tagged with the object. This information is useful for adhering to [GDPR](https://developer.roblox.com/en-us/articles/managing-personal-information) policies.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 * @returns {number[]} An array of [UserIds](https://developer.roblox.com/en-us/api-reference/property/Player/UserId) associated with the object.
	 */
	public GetUserIds(): number[] {
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
