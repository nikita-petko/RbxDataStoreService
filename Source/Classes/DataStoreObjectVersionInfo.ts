/**
 * An instance describing version information for a key, including the version string, created time, and whether it has been marked as deleted.
 *
 * ---
 * SEE ALSO
 * --------
 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
 *
 * ---
 */
export class DataStoreObjectVersionInfo {
	/**
	 * This property indicates when the version was created in milliseconds since epoch.
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
	 * This property describes whether the version has been marked as deleted. Deleted versions will be permanently deleted after 30 days.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 */
	public readonly IsDeleted: boolean;
	/**
	 * This property uniquely identifies a particular version of the key. It can be passed to [DataStore:GetVersionAsync](https://developer.roblox.com/en-us/api-reference/function/DataStore/GetVersionAsync) or [DataStore:RemoveVersionAsync](https://developer.roblox.com/en-us/api-reference/function/DataStore/RemoveVersionAsync) to get or remove the version respectively.
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
	public constructor(created: number, isDeleted: boolean, version: string) {
		this.CreatedTime = created;
		this.IsDeleted = isDeleted;
		this.Version = version;
	}
}
