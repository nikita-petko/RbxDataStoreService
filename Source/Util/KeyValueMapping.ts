/**
 * @internal
 */
export class KeyValueMapping {
	public static FetchKeyFromObjectCaseInsensitive<T = any>(object: { [x: string]: any }, key: string): T {
		return object[Object.keys(object).find((k) => k.toLowerCase() === key.toLowerCase())];
	}
}
