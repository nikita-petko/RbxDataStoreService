/**
 * Object representing a key on a [DataStoreKeyPages](https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyPages) object.
 * It contains the key name as [DataStoreKey.KeyName](https://developer.roblox.com/en-us/api-reference/property/DataStoreKey/KeyName).
 * This object is a member of the [DataStoreKeyPages](https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyPages) object returned by [DataStore:ListKeysAsync](https://developer.roblox.com/en-us/api-reference/function/DataStore/ListKeysAsync).
 *
 * ---
 * SEE ALSO
 * --------
 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
 *
 * ---
 */
export class DataStoreKey {
	/**
	 * This property indicates the name of the key.
	 * This name can then be used in other operations such as [GlobalDataStore:GetAsync](https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/GetAsync) and [GlobalDataStore:SetAsync](https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/SetAsync).
	 * If [DataStoreOptions.AllScopes](https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes) was set to true when accessing the data store through [DataStoreService:GetDataStore](https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore), the name will include its scope as a prefix.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 */
	public readonly KeyName: string;

	/**
	 * @internal
	 */
	public constructor(name: string) {
		this.KeyName = name;
	}
}
