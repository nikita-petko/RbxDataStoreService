export class DataStoreOptions {
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
	public GetExperimentalFeatures() {
		return this.experimentalFeatures;
	}
	public AllScopes: boolean;
	public SetExperimentalFeatures(experimentalFeatures: object) {
		if (this.experimentalFeatures !== experimentalFeatures) {
			this.experimentalFeatures = new Map(Object.entries(experimentalFeatures));
		}
	}
}
