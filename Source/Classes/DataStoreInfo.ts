/**
 * Object describing data store information such as name, created time, and time last updated. This object is a member of the [DataStoreListingPages](https://developer.roblox.com/en-us/api-reference/class/DataStoreListingPages) object returned by [DataStoreService:ListDataStoresAsync](https://developer.roblox.com/en-us/api-reference/function/DataStoreService/ListDataStoresAsync).
 *
 * ---
 * SEE ALSO
 * --------
 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
 *
 * ---
 */
export class DataStoreInfo {
	/**
	 * This property indicates when the data store was created in milliseconds since epoch.
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
	 * This property indicates the last time the data store was updated in milliseconds since epoch.
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
	 * This property indicates the name of the data store.
	 * It is used as a unique identifier to retrieve a data store instance with [DataStoreService:GetDataStore](https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore).
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 */
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
