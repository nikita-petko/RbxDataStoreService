import { HttpRequest } from './HttpRequest';
import { checkAccess } from '../Helpers/Internal/checkAccess';
import { DFInt, RequestType } from '../util/constants';
import { globals } from '../util/globals';
import { BuildGenericPersistenceUrl } from '../Helpers/Internal/BuildGenericPersistenceUrl';
import { executeGet } from '../Helpers/Internal/executeGetInternal';
import { executeSet } from '../Helpers/Internal/executeSetInternal';
import { FASTLOG2, FASTLOG3, FASTLOG4, FLog, LOGGROUP } from '../util/FastLog';

LOGGROUP('DataStore');

/**
 * A GlobalDataStore exposes functions for saving and loading data for the DataStoreService.
 * See the Data Stores article for an in-depth guide on data structure,
 * management,
 * error handling,
 * etc.
 */
export class DataStore {
	constructor(name: string, scope: string /*= 'global'*/, legacy: boolean) {
		this.isLegacy = legacy;
		this.name = name;
		this.scope = scope;
		this.nameUrlEncodedIfNeeded = this.urlEncodeIfNeeded(name);
		this.scopeUrlEncodedIfNeeded = this.urlEncodeIfNeeded(scope);
		this.serviceUrl = BuildGenericPersistenceUrl(DataStore.urlApiPath());
	}

	private _callback: <Variant extends any>(Key: string, OldValue: Variant, NewValue: Variant) => void = () => {
		return;
	};
	private readonly isLegacy: boolean = false;

	private constructPostDataForKey(key: string, index: number = 0): string {
		return this.isLegacy
			? `&qkeys[${index}].scope=${this.scopeUrlEncodedIfNeeded.toString()}&qkeys[${index}].target=&qkeys[${index}].key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}`
			: `&qkeys[${index}].scope=${this.scopeUrlEncodedIfNeeded.toString()}&qkeys[${index}].target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&qkeys[${index}].key=${this.nameUrlEncodedIfNeeded.toString()}`;
	}

	private constructGetUrl(): string {
		const placeId = globals.placeId;
		return `${
			this.serviceUrl
		}getV2?placeId=${placeId}&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}`;
	}

	private constructSetUrl(key: string, valueLength: number): string {
		const placeId = globals.placeId;
		return this.isLegacy
			? `${this.serviceUrl}set?placeId=${placeId}&key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=&valueLength=${valueLength}`
			: `${this.serviceUrl.toString()}set?placeId=${placeId}&key=${this.nameUrlEncodedIfNeeded.toString()}&&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&valueLength=${valueLength}`;
	}

	private constructSetIfUrl(key: string, valueLength: number, expectedValueLength: number): string {
		const placeId = globals.placeId;
		return this.isLegacy
			? `${this.serviceUrl}set?placeId=${placeId}&key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=&valueLength=${valueLength}&expectedValueLength=${expectedValueLength}`
			: `${this.serviceUrl.toString()}set?placeId=${placeId}&key=${this.nameUrlEncodedIfNeeded.toString()}&&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&valueLength=${valueLength}&expectedValueLength=${expectedValueLength}`;
	}

	private constructIncrementUrl(key: string, delta: number): string {
		const placeId = globals.placeId;
		return this.isLegacy
			? `${this.serviceUrl}increment?placeId=${placeId}&key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=&value=${delta}`
			: `${
					this.serviceUrl
			  }increment?placeId=${placeId}&key=${this.nameUrlEncodedIfNeeded.toString()}&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&value=${delta}`;
	}

	private constructRemoveUrl(key: string): string {
		const placeId = globals.placeId;
		return this.isLegacy
			? `${this.serviceUrl}remove?placeId=${placeId}&key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=`
			: `${
					this.serviceUrl
			  }remove?placeId=${placeId}&key=${this.nameUrlEncodedIfNeeded.toString()}&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}`;
	}

	private createFetchNewKeyRequest(key: string, request: HttpRequest): void {
		request.url = this.constructGetUrl();
		request.postData = this.constructPostDataForKey(key);
		request.owner = this;
	}

	private static serializeVariant<Variant extends any>(variant: Variant): [boolean, string] {
		let hasJsonType = true;
		let result: string;
		try {
			result = JSON.stringify(variant);
		} catch {
			hasJsonType = false;
		}
		return [hasJsonType, result];
	}

	static deserializeVariant<Variant extends any>(webValue: string): [boolean, Variant | unknown] {
		let result = '';
		if (webValue.length === 0) return [true, result];
		try {
			result = JSON.parse(webValue);
		} catch {
			return [false, result];
		}
		return [true, result];
	}

	private runTransformFunction<Variant extends any>(
		key: string,
		transformFunc: (previousValue: Variant) => Variant,
	): Promise<Variant> {
		return new Promise<Variant>(
			(resolve: (value: PromiseLike<Variant> | Variant) => void, reject: (reason?: any) => void) => {
				const request = new HttpRequest();
				this.createFetchNewKeyRequest(key, request);
				request.requestType = RequestType.GET_ASYNC;
				executeGet(request).then((r) => {
					const [success, res] = DataStore.deserializeVariant(r.body);
					if (!success) return reject("Can't parse response");
					let result: Variant;
					FASTLOG3(
						FLog['DataStore'],
						`Running transform function, input: ${
							<number>res['data'].length === 0
								? undefined
								: (DataStore.deserializeVariant(res['data'][0]['Value'])[1] as Variant).toString()
						}`,
					);
					try {
						result = transformFunc(
							res['data'].length === 0
								? undefined
								: (DataStore.deserializeVariant(res['data'][0]['Value'])[1] as Variant),
						);
					} catch (e) {
						reject(e);
					}
					if (result === undefined || (result as Map<string, unknown>).size === 0 || result === null) {
						FASTLOG4(FLog['DataStore'], 'Transform function returned nil, update is cancelled');
						return reject('Transform function returned nil, update is cancelled');
					}
					// console.log(result);
					if (!this.checkValueIsAllowed(result))
						return reject(
							`${typeof result} is not allowed in ${
								this.getDataStoreTypeString() === 'standard' ? 'DataStore' : 'OrderedDataStore'
							}`,
						);

					const [success2, newValue] = DataStore.serializeVariant(result);
					if (!success2)
						return reject(
							`${typeof result} is not allowed in ${
								this.getDataStoreTypeString() === 'standard' ? 'DataStore' : 'OrderedDataStore'
							}`,
						);
					if (newValue.length > DFInt['DataStoreMaxValueSize']) return reject('Value is too large');
					const expectedValue = res['data'].length === 0 ? '' : res['data'][0]['Value'];
					const postData = `value=${this.urlEncodeIfNeeded(newValue)}&expectedValue=${this.urlEncodeIfNeeded(
						expectedValue,
					)}`;
					const postDataFinal = postData.toString();
					const request = new HttpRequest();
					request.url = this.constructSetIfUrl(key, newValue.length, expectedValue.length);
					request.postData = postDataFinal.toString();
					request.owner = this;
					request.key = key;
					request.requestType = RequestType.UPDATE_ASYNC;
					FASTLOG3(FLog['DataStore'], 'SetIf on key: ' + key);
					FASTLOG2(FLog['DataStore'], newValue);
					FASTLOG3(FLog['DataStore'], 'Url encoded: ' + request.postData);
					executeSet(request)
						.then((r2) => {
							const [success, res] = DataStore.deserializeVariant(r2.body);
							if (!success) return reject("Can't parse response");
							if (!res['data'])
								return reject(
									"The response didn't contain the data, therefore a shallow fail was performed",
								);
							const final = DataStore.deserializeVariant<Variant>(res['data'])[1];
							if (this._callback) {
								try {
									this._callback(
										key,
										(DataStore.deserializeVariant(expectedValue)[1] as string).length === 0
											? undefined
											: DataStore.deserializeVariant(expectedValue)[1],
										final,
									);
								} catch (err) {}
							} else {
								console.log('no callback');
							}
							resolve(final as Variant);
						})
						.catch((reason) => {
							return reject(reason);
						});
				});
			},
		);
	}

	protected serviceUrl: string;
	protected name: string;
	protected scope: string;
	protected scopeUrlEncodedIfNeeded: string;
	protected nameUrlEncodedIfNeeded: string;

	protected checkValueIsAllowed<Variant extends any>(v?: Variant): boolean {
		const [success] = DataStore.serializeVariant(v);
		return success;
	}

	protected getDataStoreTypeString(): string {
		return 'standard';
	}

	protected urlEncodeIfNeeded(input: string): string {
		return encodeURIComponent(input);
	}

	public static urlApiPath(): string {
		return 'persistence';
	}

	/**
	 * Returns the value of the entry in the data store with the given key.
	 * This function returns the value of the entry in the GlobalDataStore with the given key.
	 * If the key does not exist,
	 * returns undefined.
	 * This function used to cache for about 4 seconds,
	 * so you couldn't be sure that it returns the current value saved on the Roblox servers.
	 * If this function throws an error,
	 * the error message will describe the problem.
	 * Note that there are also limits that will soon apply to this function.
	 * @param key The key identifying the entry being retrieved from the data store.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async GetAsync<Variant extends any>(key: string): Promise<Variant | unknown> {
		return new Promise<Variant | unknown>(
			(
				resolve: (value: Variant | PromiseLike<Variant | unknown> | unknown) => void,
				reject: (reason?: any) => void,
			) => {
				FASTLOG3(FLog['DataStore'], `GetAsync on key ${key}`);
				const [success, message] = checkAccess(key);
				if (!success) return reject(message);

				const request = new HttpRequest();
				this.createFetchNewKeyRequest(key, request);
				request.requestType = RequestType.GET_ASYNC;
				executeGet(request)
					.then((r) => {
						const [success, result] = DataStore.deserializeVariant(r.body);
						if (!success) return reject("Can't parse response");

						const [success2, deserialized] = DataStore.deserializeVariant(
							result['data'].length === 0 ? '{"d":true}' : result['data'][0]['Value'],
						);
						if (!success2) return reject("Can't parse value");
						return resolve(deserialized['d'] ? undefined : deserialized);
					})
					.catch((reason) => {
						return reject(reason);
					});
			},
		);
	}

	/**
	 *
	 * Sets the value of the key.
	 * This overwrites any existing data stored in the key.
	 *
	 * ---
	 * CRITICAL
	 * --------
	 * If the previous value of the key is important,
	 * use UpdateAsync() instead.
	 * Using GetAsync() to retrieve a value and then setting the key with SetAsync() is risky because GetAsync() sometimes returns cached data and other game servers may have modified the key.
	 *
	 * ---
	 * NOTICE
	 * -------
	 * Any string being stored in a data store must be valid UTF-8.
	 * In UTF-8,
	 * values greater than 127 are used exclusively for encoding multi-byte codepoints,
	 * so a single byte greater than 127 will not be valid UTF-8 and the SetAsync() attempt will fail.
	 *
	 * ---
	 * If this function throws an error,
	 * the error message will describe the problem.
	 * Note that there are also limits that apply to this function.
	 * See the Data Stores article for an in-depth guide on data structure,
	 * management,
	 * error handling, etc.
	 * @param key The key identifying the entry being retrieved from the data store.
	 * @param value The value of the entry in the data store with the given key.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async SetAsync<Variant extends any>(key: string, value: Variant): Promise<void> {
		return new Promise<void>(
			(resolve: (value: PromiseLike<void> | void) => void, reject: (reason?: any) => void) => {
				const [success, message] = checkAccess(key);
				if (!success) return reject(message);
				if (value === undefined) return reject("The value can't be nil, null, undefined or void");
				if (!this.checkValueIsAllowed(value))
					return reject(
						`${typeof value} is not allowed in ${
							this.getDataStoreTypeString() === 'standard' ? 'DataStore' : 'OrderedDataStore'
						}`,
					);
				const [success2, v] = DataStore.serializeVariant(value);
				if (!success2)
					return reject(
						`${typeof value} is not allowed in ${
							this.getDataStoreTypeString() === 'standard' ? 'DataStore' : 'OrderedDataStore'
						}`,
					);
				if (v.length > DFInt['DataStoreMaxValueSize']) return reject('Value is too large');
				const request = new HttpRequest();
				request.url = this.constructSetUrl(key, v.length);
				request.owner = this;
				request.key = key;
				request.requestType = RequestType.SET_ASYNC;
				request.postData = `value=${this.urlEncodeIfNeeded(v.toString())}`.toString();
				FASTLOG3(FLog['DataStore'], `SetAsync on key: ${key}`);
				FASTLOG2(FLog['DataStore'], v);
				FASTLOG3(FLog['DataStore'], 'Url encoded: ' + request.postData);
				executeSet(request)
					.then((r) => {
						const [success, res] = DataStore.deserializeVariant(r.body);
						if (!success) return reject("Can't parse response");
						if (!res['data'])
							return reject(
								"The response didn't contain the data, therefore a shallow fail was performed",
							);
						resolve();
					})
					.catch((reason) => {
						return reject(reason);
					});
			},
		);
	}

	/**
	 * Increments the value of a particular key and returns the incremented value.
	 * Only works on values that are integers.
	 * Note that you can use OnUpdate() - Not Implemented - to execute a function every time the database updates the key’s value,
	 * such as after calling this function.
	 * If this function throws an error,
	 * the error message will describe the problem.
	 * Note that there are also limits that apply to this function.
	 * See the Data Stores article for an in-depth guide on data structure,
	 * management,
	 * error handling, etc.
	 * @param key The key identifying the entry being retrieved from the data store.
	 * @param delta The increment amount.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async IncrementAsync(key: string, delta: number = 1): Promise<number> {
		return new Promise<number>(
			(resolve: (value: PromiseLike<number> | number) => void, reject: (reason?: any) => void) => {
				const [success, message] = checkAccess(key);
				if (!success) return reject(message);
				const request = new HttpRequest();
				request.url = this.constructIncrementUrl(key, delta);
				request.owner = this;
				request.key = key;
				request.requestType = RequestType.INCREMENT_ASYNC;
				executeSet(request)
					.then((r) => {
						const [success, res] = DataStore.deserializeVariant(r.body);
						if (!success) return reject("Can't parse response");
						if (!res['data'])
							return reject('Unable to increment key as it may be anything other than a number');
						resolve(parseFloat(res['data']) || 0);
					})
					.catch((reason) => {
						return reject(reason);
					});
			},
		);
	}

	/**
	 * Retrieves the value of a key from a data store and updates it with a new value.
	 * This function retrieves the value of a key from a data store and updates it with a new value.
	 * Since this function validates the data,
	 * it should be used in favor of SetAsync() when there’s a chance that more than one server can edit the same data at the same time.
	 * The second parameter is a function which you need to provide.
	 * The function takes the key’s old value as input and returns the new value,
	 * with these exceptions:
	 * - If the key does not exist, the old value passed to the function will be nil.
	 * - If the function returns nil, the update is cancelled.
	 * The value returned by this function is the new value,
	 * returned once the altered data is properly saved.
	 *
	 * ---
	 * INFO
	 * -----
	 * In cases where another game server updated the key in the short timespan between retrieving the key's current value and setting the key's value,
	 * UpdateAsync() will call the function again to ensure that no data is overwritten.
	 * The function will be called as many times as needed until the data is saved.
	 *
	 * ---
	 * CRITICAL
	 * ---------
	 * The function you define as the second parameter of UpdateAsync() cannot yield,
	 * so do not include calls like setTimeout().
	 *
	 * ---
	 * NOTICE
	 * -------
	 * Any string being stored in a data store must be valid UTF-8.
	 * In UTF-8,
	 * values greater than 127 are used exclusively for encoding multi-byte codepoints,
	 * so a single byte greater than 127 will not be valid UTF-8 and the SetAsync() attempt will fail.
	 *
	 * ---
	 * If this function throws an error,
	 * the error message will describe the problem.
	 * Note that there are also limits that apply to this function.
	 * See the Data Stores article for an in-depth guide on data structure,
	 * management,
	 * error handling, etc.
	 * @param key The key identifying the entry being retrieved from the data store.
	 * @param transformFunc A function which you need to provide. The function takes the key’s old value as input and returns the new value.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async UpdateAsync<Variant extends any>(
		key: string,
		transformFunc: (previousValue: Variant) => Variant,
	): Promise<Variant> {
		return new Promise<Variant>(
			async (resolve: (value: PromiseLike<Variant> | Variant) => void, reject: (reason?: any) => void) => {
				const [success, message] = checkAccess(key);
				if (!success) return reject(message);
				FASTLOG3(FLog['DataStore'], 'Updating key ' + key);
				const result = await this.runTransformFunction(key, transformFunc);
				resolve(result);
			},
		);
	}

	/**
	 * Removes the given key from the data store and returns the value associated with that key.
	 * This function removes the given key from the provided GlobalDataStore and returns the value that was associated with that key.
	 * If the key is not found in the data store,
	 * this function returns undefined.
	 * If this function throws an error,
	 * the error message will describe the problem.
	 * Note that there are also limits that apply to this function.
	 * See the Data Stores article for an in-depth guide on data structure,
	 * management,
	 * error handling, etc.
	 * @param key The key identifying the entry being retrieved from the data store.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async RemoveAsync<Variant extends any>(key: string): Promise<Variant> {
		return new Promise<Variant>((resolve, reject) => {
			const [success, message] = checkAccess(key);
			if (!success) return reject(message);
			const request = new HttpRequest();
			request.url = this.constructRemoveUrl(key);
			request.owner = this;
			request.key = key;
			request.requestType = RequestType.SET_ASYNC;
			executeSet(request)
				.then((value) => {
					const [success, res] = DataStore.deserializeVariant(value.body);
					if (!success) return reject("Can't parse response");
					resolve(DataStore.deserializeVariant(res['data'])[1] as Variant);
				})
				.catch((e) => {
					return reject(e);
				});
		});
	}
	public set OnUpdate(callback: <Variant extends any>(Key: string, OldValue: Variant, NewValue: Variant) => void) {
		this._callback = callback;
		if (this._callback !== callback) this._callback = callback;
	}
}
