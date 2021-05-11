import { HttpRequest } from './HttpRequest';
import { Globals } from '../Util/Globals';
import { DFInt, DYNAMIC_FASTINTVARIABLE, FASTLOG, FASTLOG1, FASTLOGS, FLog, LOGVARIABLE } from '../Tools/FastLogTool';
import { DataStoreSetOptions } from './DataStoreSetOptions';
import { DataStoreIncrementOptions } from './DataStoreIncrementOptions';
import { RBXScriptConnection } from './RBXScriptConnection';

import events from 'events';
import { ExectionHelper } from '../Helpers/ExecutionHelper';
import { InputHelper } from '../Helpers/InputHelper';
import { ApiDataStoresUrlConstruction } from '../Constructors/ApiDataStoresUrlConstruction';
import { RequestType } from './Services/DataStoreService';

LOGVARIABLE('DataStore', 0);

DYNAMIC_FASTINTVARIABLE('DataStoreMaxValueSize', 64 * 1024);

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
		this.serviceUrl = ApiDataStoresUrlConstruction.BuildGenericPersistenceUrl(this.urlApiPath());
		FASTLOGS(FLog['DataStore'], '[FLog::DataStore] Initialized Data Store, url: %s', this.serviceUrl);
	}

	/**
	 * @internal
	 */
	protected callbacks: Map<string, <Variant extends any>(newValue: Variant) => Variant> = new Map<
		string,
		<Variant extends any>(newValue: Variant) => Variant
	>();

	/**
	 * @internal
	 */
	protected CachedKeys: Map<string, any> = new Map<string, any>();

	/**
	 * @internal
	 */
	private readonly isLegacy: boolean = false;

	/**
	 * @internal
	 */
	private constructPostDataForKey(key: string, index: number = 0): string {
		return this.isLegacy
			? `&qkeys[${index}].scope=${this.scopeUrlEncodedIfNeeded.toString()}&qkeys[${index}].target=&qkeys[${index}].key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}`
			: `&qkeys[${index}].scope=${this.scopeUrlEncodedIfNeeded.toString()}&qkeys[${index}].target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&qkeys[${index}].key=${this.nameUrlEncodedIfNeeded.toString()}`;
	}

	/**
	 * @internal
	 */
	private constructGetUrl(): string {
		const placeId = Globals.PlaceID;
		return `${
			this.serviceUrl
		}getV2?placeId=${placeId}&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}`;
	}

	/**
	 * @internal
	 */
	private constructSetUrl(key: string, valueLength: number): string {
		const placeId = Globals.PlaceID;
		return this.isLegacy
			? `${this.serviceUrl}set?placeId=${placeId}&key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=&valueLength=${valueLength}`
			: `${this.serviceUrl.toString()}set?placeId=${placeId}&key=${this.nameUrlEncodedIfNeeded.toString()}&&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&valueLength=${valueLength}`;
	}

	/**
	 * @internal
	 */
	private constructSetIfUrl(key: string, valueLength: number, expectedValueLength: number): string {
		const placeId = Globals.PlaceID;
		return this.isLegacy
			? `${this.serviceUrl}set?placeId=${placeId}&key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=&valueLength=${valueLength}&expectedValueLength=${expectedValueLength}`
			: `${this.serviceUrl.toString()}set?placeId=${placeId}&key=${this.nameUrlEncodedIfNeeded.toString()}&&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&valueLength=${valueLength}&expectedValueLength=${expectedValueLength}`;
	}

	/**
	 * @internal
	 */
	private constructIncrementUrl(key: string, delta: number): string {
		const placeId = Globals.PlaceID;
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

	/**
	 * @internal
	 */
	private constructRemoveUrl(key: string): string {
		const placeId = Globals.PlaceID;
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

	/**
	 * @internal
	 */
	private createFetchNewKeyRequest(key: string, request: HttpRequest): void {
		request.url = this.constructGetUrl();
		request.postData = this.constructPostDataForKey(key);
		request.owner = this;
	}

	static serializeVariant<Variant extends any>(variant: Variant): [boolean, string] {
		let hasJsonType = true;
		let result: string;
		try {
			result = JSON.stringify(variant);
		} catch {
			hasJsonType = false;
		}
		return [hasJsonType, result];
	}

	/**
	 * @internal
	 */
	protected logLongValue(value: string) {
		FASTLOGS(FLog['DataStore'], '[FLog::DataStore] Value: %s', value.substring(0, 200));
		if (value.length > 200) {
			const tail = value.substring(value.length - 200);
			FASTLOGS(FLog['DataStore'], '[FLog::DataStore] Value end: %s', tail);
			FASTLOG1(FLog['DataStore'], '[FLog::DataStore] Value length: %u', value.length);
		}
	}

	static deserializeVariant<Variant extends any>(webValue: string): [boolean, Variant | unknown] {
		if (<unknown>webValue instanceof Object) return [true, webValue];
		let result = '';
		if (webValue && webValue.length === 0) return [true, result];
		try {
			result = JSON.parse(webValue);
		} catch {
			return [false, result];
		}
		return [true, result];
	}

	/**
	 * @internal
	 */
	private runTransformFunction<Variant extends any>(
		key: string,
		transformFunc: (previousValue: Variant) => Variant,
	): Promise<Variant> {
		return new Promise<Variant>(
			(
				resumeFunction: (value: PromiseLike<Variant> | Variant) => void,
				errorFunction: (reason?: any) => void,
			) => {
				const request = new HttpRequest();
				this.createFetchNewKeyRequest(key, request);
				request.requestType = RequestType.GET_ASYNC;
				ExectionHelper.ExecuteGet(request).then((r) => {
					const [success, res] = DataStore.deserializeVariant(r.data);
					if (!success) return errorFunction("Can't parse response");
					let result: Variant;
					FASTLOGS(
						FLog['DataStore'],
						'[FLog::DataStore] Running transform function, input: %s',
						<number>res['data'].length === 0
							? undefined
							: (DataStore.deserializeVariant(res['data'][0]['Value'])[1] as Variant).toString(),
					);
					try {
						result = transformFunc(
							res['data'].length === 0
								? undefined
								: (DataStore.deserializeVariant(res['data'][0]['Value'])[1] as Variant),
						);
					} catch (e) {
						errorFunction(e);
					}
					if (result === undefined || (result as Map<string, unknown>).size === 0 || result === null) {
						FASTLOG(
							FLog['DataStore'],
							'[FLog::DataStore] Transform function returned nil, update is cancelled',
						);
						return errorFunction('Transform function returned nil, update is cancelled');
					}
					// console.log(result);
					if (!this.checkValueIsAllowed(result))
						return errorFunction(
							`${typeof result} is not allowed in ${
								this.getDataStoreTypeString() === 'standard' ? 'DataStore' : 'OrderedDataStore'
							}`,
						);

					const [success2, newValue] = DataStore.serializeVariant(result);
					if (!success2)
						return errorFunction(
							`${typeof result} is not allowed in ${
								this.getDataStoreTypeString() === 'standard' ? 'DataStore' : 'OrderedDataStore'
							}`,
						);
					if (newValue.length > DFInt('DataStoreMaxValueSize')) return errorFunction('Value is too large');
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
					FASTLOGS(FLog['DataStore'], '[FLog::DataStore] SetIf on key: %s', key);
					this.logLongValue(newValue);
					FASTLOG(FLog['DataStore'], '[FLog::DataStore] Url encoded:');
					this.logLongValue(request.postData);
					ExectionHelper.ExecuteSet(request)
						.then((r2) => {
							const [success, res] = DataStore.deserializeVariant(r2.data);
							if (!success) return errorFunction("Can't parse response");
							if (!res['data'])
								return errorFunction(
									"The response didn't contain the data, therefore a shallow fail was performed",
								);
							const final = DataStore.deserializeVariant<Variant>(res['data'])[1];
							if (this.callbacks.has(key)) {
								this.callbacks.get(key)(final);
							}
							resumeFunction(final as Variant);
						})
						.catch((reason) => {
							return errorFunction(reason);
						});
				});
			},
		);
	}

	/**
	 * @internal
	 */
	protected serviceUrl: string;
	/**
	 * @internal
	 */
	protected name: string;
	/**
	 * @internal
	 */
	protected scope: string;
	/**
	 * @internal
	 */
	protected scopeUrlEncodedIfNeeded: string;
	/**
	 * @internal
	 */
	protected nameUrlEncodedIfNeeded: string;

	/**
	 * @internal
	 */
	protected checkValueIsAllowed<Variant extends any>(v?: Variant): boolean {
		const [success] = DataStore.serializeVariant(v);
		return success;
	}

	/**
	 * @internal
	 */
	protected getDataStoreTypeString(): string {
		return 'standard';
	}

	/**
	 * @internal
	 */
	protected urlEncodeIfNeeded(input: string): string {
		return encodeURIComponent(input);
	}

	/**
	 * @internal
	 */
	protected urlApiPath(): string {
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
				resumeFunction: (value: Variant | PromiseLike<Variant | unknown> | unknown) => void,
				errorFunction: (reason?: any) => void,
			) => {
				FASTLOGS(FLog['DataStore'], `[FLog::DataStore] GetAsync on key %s`, key);
				const [success, message] = InputHelper.CheckAccess(key);
				if (!success) return errorFunction(message);

				const request = new HttpRequest();
				this.createFetchNewKeyRequest(key, request);
				request.requestType = RequestType.GET_ASYNC;
				ExectionHelper.ExecuteGet(request)
					.then((r) => {
						const [success, result] = DataStore.deserializeVariant(r.data);
						if (!success) return errorFunction("Can't parse response");

						const [success2, deserialized] = DataStore.deserializeVariant(
							result['data'].length === 0 ? '{"d":true}' : result['data'][0]['Value'],
						);
						if (!success2) return errorFunction("Can't parse value");
						this.CachedKeys.set(key, deserialized['d'] ? undefined : deserialized);
						return resumeFunction(deserialized['d'] ? undefined : deserialized);
					})
					.catch((reason) => {
						return errorFunction(reason);
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
	public async SetAsync<Variant extends any>(
		key: string,
		value: Variant,
		userIds: Array<number> = [],
		options: DataStoreSetOptions = undefined,
	): Promise<void> {
		return new Promise<void>(
			(resumeFunction: (value: PromiseLike<void> | void) => void, errorFunction: (reason?: any) => void) => {
				if (userIds.length > 0) return errorFunction('Additional parameter UserIds not allowed');
				if (options) return errorFunction('Additional parameter Options not allowed');
				const [success, message] = InputHelper.CheckAccess(key);
				if (!success) return errorFunction(message);
				if (value === undefined) return errorFunction("The value can't be nil, null, undefined or void");
				if (!this.checkValueIsAllowed(value))
					return errorFunction(
						`${typeof value} is not allowed in ${
							this.getDataStoreTypeString() === 'standard' ? 'DataStore' : 'OrderedDataStore'
						}`,
					);
				const [success2, v] = DataStore.serializeVariant(value);
				if (!success2)
					return errorFunction(
						`${typeof value} is not allowed in ${
							this.getDataStoreTypeString() === 'standard' ? 'DataStore' : 'OrderedDataStore'
						}`,
					);
				if (v.length > DFInt('DataStoreMaxValueSize')) return errorFunction('Value is too large');
				const request = new HttpRequest();
				request.url = this.constructSetUrl(key, v.length);
				request.owner = this;
				request.key = key;
				request.requestType = RequestType.SET_ASYNC;
				request.postData = `value=${this.urlEncodeIfNeeded(v.toString())}`.toString();
				FASTLOGS(FLog['DataStore'], `[FLog::DataStore] SetAsync on key: %s`, key);
				this.logLongValue(v);
				FASTLOG(FLog['DataStore'], '[FLog::DataStore] Url encoded:');
				this.logLongValue(request.postData);
				ExectionHelper.ExecuteSet(request)
					.then((r) => {
						const [success, res] = DataStore.deserializeVariant(r.data);
						if (!success) return errorFunction("Can't parse response");
						if (!res['data'])
							return errorFunction(
								"The response didn't contain the data, therefore a shallow fail was performed",
							);
						if (this.callbacks.has(key)) {
							this.callbacks.get(key)(value);
						}
						resumeFunction();
					})
					.catch((reason) => {
						return errorFunction(reason);
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
	public async IncrementAsync(
		key: string,
		delta: number = 1,
		userIds: Array<number> = [],
		options: DataStoreIncrementOptions = undefined,
	): Promise<number> {
		return new Promise<number>(
			(resumeFunction: (value: PromiseLike<number> | number) => void, errorFunction: (reason?: any) => void) => {
				if (userIds.length > 0) return errorFunction('Additional parameter UserIds not allowed');
				if (options) return errorFunction('Additional parameter Options not allowed');
				const [success, message] = InputHelper.CheckAccess(key);
				if (!success) return errorFunction(message);
				const request = new HttpRequest();
				request.url = this.constructIncrementUrl(key, delta);
				request.owner = this;
				request.key = key;
				request.requestType = RequestType.INCREMENT_ASYNC;
				ExectionHelper.ExecuteSet(request)
					.then((r) => {
						const [success, res] = DataStore.deserializeVariant(r.data);
						if (!success) return errorFunction("Can't parse response");
						if (!res['data'])
							return errorFunction('Unable to increment key as it may be anything other than a number');
						if (this.callbacks.has(key)) {
							this.callbacks.get(key)(parseFloat(res['data']) || 0);
						}
						resumeFunction(parseFloat(res['data']) || 0);
					})
					.catch((reason) => {
						return errorFunction(reason);
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
			async (
				resumeFunction: (value: PromiseLike<Variant> | Variant) => void,
				errorFunction: (reason?: any) => void,
			) => {
				const [success, message] = InputHelper.CheckAccess(key);
				if (!success) return errorFunction(message);
				FASTLOGS(FLog['DataStore'], '[FLog::DataStore] Updating key %s', key);
				const result = await this.runTransformFunction(key, transformFunc);
				resumeFunction(result);
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
		return new Promise<Variant>((resumeFunction, errorFunction) => {
			const [success, message] = InputHelper.CheckAccess(key);
			if (!success) return errorFunction(message);
			const request = new HttpRequest();
			request.url = this.constructRemoveUrl(key);
			request.owner = this;
			request.key = key;
			request.requestType = RequestType.SET_ASYNC;
			ExectionHelper.ExecuteSet(request)
				.then((value) => {
					const [success, res] = DataStore.deserializeVariant(value.data);
					if (!success) return errorFunction("Can't parse response");
					resumeFunction(DataStore.deserializeVariant(res['data'])[1] as Variant);
				})
				.catch((e) => {
					return errorFunction(e);
				});
		});
	}

	/**
	 * This function sets **callback** as the function to be run any time the value associated with the data store's key changes.
	 * Once every minute,
	 * OnUpdate polls for changes by other servers.
	 * Changes made on the same server will run the function immediately.
	 * In other words,
	 * functions like IncrementAsync(),
	 * SetAsync(),
	 * and UpdateAsync() change the key’s value in the data store and will cause the function to run.
	 * See the Data Stores article for an in-depth guide on data structure,
	 * management,
	 * error handling, etc.
	 * @param key The key identifying the entry being retrieved from the data store
	 * @param callback The function to be executed any time the value associated with **key** is changed
	 * @returns {RBXScriptConnection} The connection to the key being tracked for updates
	 * @deprecated This function has been deprecated and should not be used in new work. You can use the {@link https://www.npmjs.com/package/@mfd/rbxmessagingservice|Cross Server Messaging Service} to publish and subscribe to topics to receive near real-time updates, completely replacing the need for this function.
	 */
	public OnUpdate(key: string, callback: <Variant extends any>(newValue: Variant) => any): RBXScriptConnection {
		FASTLOGS(FLog['DataStore'], '[FLog::DataStore] Legacy on update callback set for the key %s', key);
		this.callbacks.set(key, callback);
		// const interval = setInterval(async () => {
		// 	const v = await this.GetAsync(key);
		// 	if (v !== this.CachedKeys.get(key)) callback(await this.GetAsync(key));
		// }, 60000);
		const event = new events.EventEmitter();
		event.on('close', () => {
			this.callbacks.delete(key);
			// interval.unref();
		});
		return new RBXScriptConnection(event);
	}
}
