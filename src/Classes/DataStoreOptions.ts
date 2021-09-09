/**
 * Any object containing additional parameters that are used by [DataStoreService:GetDataStore](https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore).
 */
export class DataStoreOptions {
	/**
	 * This property specifies whether the [GlobalDataStore](https://developer.roblox.com/en-us/api-reference/class/GlobalDataStore) should work with all scopes. See here for details on scope.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 */
	public AllScopes: boolean;

	/**
	 * @internal
	 */
	private experimentalFeatures: Map<string, unknown>;

	/**
	 * @internal
	 */
	public constructor(experimentalFeatures?: object) {
		this.experimentalFeatures = new Map<string, unknown>(Object.entries(experimentalFeatures || {})) || new Map();
		this.AllScopes = false;
	}
	/**
	 * @internal
	 */
	public GetExperimentalFeatures() {
		return this.experimentalFeatures;
	}

	/**
	 * This function enables experimental features for a [GlobalDataStore](https://developer.roblox.com/en-us/api-reference/class/GlobalDataStore).
	 * Currently only `"v2"` is a valid experimental feature.
	 * Once the features are generally available, the options will not have any effect.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 * @param {object} experimentalFeatures Javascript table in `key: value` format where the key is the experimental feature name and the value is a boolean which specifies whether to enable.
	 * @return {void} No return.
	 */
	public SetExperimentalFeatures(experimentalFeatures: object): void {
		if (this.experimentalFeatures !== experimentalFeatures) {
			this.experimentalFeatures = new Map(Object.entries(experimentalFeatures));
		}
	}
}
