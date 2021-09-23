/**
 * An object that specifies additional parameters for a [GlobalDataStore:SetAsync](https://developer.roblox.com/en-us/api-reference/class/DataStoreSetOptions) call.
 *
 * ---
 * SEE ALSO
 * --------
 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
 *
 * ---
 */
export class DataStoreSetOptions {
	/**
	 * @internal
	 */
	private attributes: Record<string, unknown>;
	/**
	 * @internal
	 */
	public constructor(attributes?: Record<string, unknown>) {
		this.attributes = attributes || {};
	}
	/**
	 * This function gets custom metadata associated with this [DataStoreSetOptions](https://developer.roblox.com/en-us/api-reference/class/DataStoreSetOptions) instance.
	 * @returns {Record<string, unknown>} Metadata associated with this [DataStoreSetOptions](https://developer.roblox.com/en-us/api-reference/class/DataStoreSetOptions) instance.
	 */
	public GetMetadata(): Record<string, unknown> {
		return this.attributes;
	}

	/**
	 * This function sets custom metadata used by [GlobalDataStore:SetAsync](https://developer.roblox.com/en-us/api-reference/class/DataStoreSetOptions) to associate metadata with a key. Metadata should be in key-value pair form.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 *
	 * @param {Record<string, unknown>} attributes Metadata values to set for the key.
	 */
	public SetMetadata(attributes: Record<string, unknown>) {
		if (this.attributes !== attributes) {
			this.attributes = attributes;
		}
	}
}
