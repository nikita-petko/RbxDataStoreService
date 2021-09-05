import { HttpRequest } from './HttpRequest';
import { Globals } from '../Util/Globals';
import {
	DFFlag,
	DFInt,
	DYNAMIC_FASTFLAGVARIABLE,
	DYNAMIC_FASTINTVARIABLE,
	FASTLOG,
	FASTLOG1,
	FASTLOGS,
	FLog,
	LOGVARIABLE,
} from '../Tools/FastLogTool';
import { DataStoreSetOptions } from './DataStoreSetOptions';
import { DataStoreIncrementOptions } from './DataStoreIncrementOptions';
import { RBXScriptConnection } from './RBXScriptConnection';

import events from 'events';
import { ExectionHelper } from '../Helpers/ExecutionHelper';
import { InputHelper } from '../Helpers/InputHelper';
import { RequestType } from './Services/DataStoreService';
import { UrlHelper } from '../Tools/UrlTool';
import { DataStoreKeyInfo } from './DataStoreKeyInfo';

LOGVARIABLE('DataStore', 0);

DYNAMIC_FASTINTVARIABLE('DataStoreMaxValueSize', 64 * 1024);
DYNAMIC_FASTFLAGVARIABLE('DataStoreUseNewEndpoints', true);
DYNAMIC_FASTFLAGVARIABLE('DataStoreNewEndpointsReturnResultIfFailedToDeserialize', true);

/**
 * A GlobalDataStore exposes functions for saving and loading data for the DataStoreService.
 * See the Data Stores article for an in-depth guide on data structure,
 * management,
 * error handling,
 * etc.
 */
export class DataStore {
	/**
	 * @internal
	 */
	constructor(name: string, scope: string /*= 'global'*/, legacy: boolean, allScopes: boolean) {
		this.isLegacy = legacy;
		this.name = name;
		this.scope = scope;
		this.nameUrlEncodedIfNeeded = this.urlEncodeIfNeeded(name);
		this.scopeUrlEncodedIfNeeded = this.urlEncodeIfNeeded(scope);
		this.serviceUrl = UrlHelper.BuildGenericPersistenceUrl(this.urlApiPath());
		this.allScopes = allScopes;
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
	private CachedUsns: Map<string, string> = new Map<string, string>();

	/**
	 * @internal
	 */
	private readonly isLegacy: boolean = false;

	/**
	 * @internal
	 * @todo JSON
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

		if (DFFlag('DataStoreUseNewEndpoints'))
			return `${
				this.serviceUrl
			}${this.getDataStoreTypeString()}?scope=${this.scopeUrlEncodedIfNeeded.toString()}`;

		return `${
			this.serviceUrl
		}getV2?placeId=${placeId}&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}`;
	}

	/**
	 * @internal
	 */
	private constructGetV2Url(key: string): string {
		return this.isLegacy
			? `${
					this.serviceUrl
			  }${this.getDataStoreTypeString()}?scope=${this.scopeUrlEncodedIfNeeded.toString()}&key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&target=`
			: `${
					this.serviceUrl
			  }${this.getDataStoreTypeString()}?scope=${this.scopeUrlEncodedIfNeeded.toString()}&key=${this.nameUrlEncodedIfNeeded.toString()}&target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}`;
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
	private constructSetV2Url(key: string) {
		return this.isLegacy
			? `${this.serviceUrl}${this.getDataStoreTypeString()}?key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=`
			: `${
					this.serviceUrl
			  }${this.getDataStoreTypeString()}?key=${this.nameUrlEncodedIfNeeded.toString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}`;
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
	private constructSetIfV2Url(key: string, usn: string): string {
		return this.isLegacy
			? `${this.serviceUrl}${this.getDataStoreTypeString()}?key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=&usn=${this.urlEncodeIfNeeded(usn)}`
			: `${
					this.serviceUrl
			  }${this.getDataStoreTypeString()}?key=${this.nameUrlEncodedIfNeeded.toString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&usn=${this.urlEncodeIfNeeded(usn)}`;
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
	private constructIncrementV2Url(key: string, delta: number): string {
		return this.isLegacy
			? `${this.serviceUrl}${this.getDataStoreTypeString()}/increment?key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=&by=${delta}`
			: `${
					this.serviceUrl
			  }${this.getDataStoreTypeString()}/increment?key=${this.nameUrlEncodedIfNeeded.toString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&by=${delta}`;
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
	private constructRemoveV2Url(key: string): string {
		return this.isLegacy
			? `${this.serviceUrl}${this.getDataStoreTypeString()}/remove?key=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=`
			: `${
					this.serviceUrl
			  }${this.getDataStoreTypeString()}/remove?key=${this.nameUrlEncodedIfNeeded.toString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&target=${this.urlEncodeIfNeeded(
					key,
			  ).toString()}`;
	}

	/**
	 * @internal
	 */
	private createFetchNewKeyRequest(key: string, request: HttpRequest): void {
		if (DFFlag('DataStoreUseNewEndpoints')) {
			request.url = this.constructGetV2Url(key);
			request.owner = this;
			request.method = 'GET';
			return;
		}

		request.url = this.constructGetUrl();
		request.postData = this.constructPostDataForKey(key);
		request.owner = this;
	}

	/**
	 * @internal
	 */
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

	/**
	 * @internal
	 */
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
	protected runTransformFunction<Variant extends any>(
		key: string,
		transformFunc: (previousValue: Variant, keyInfo: DataStoreKeyInfo) => Variant,
	): Promise<Variant | unknown> {
		return new Promise((resumeFunction, errorFunction) => {
			const request = new HttpRequest();
			this.createFetchNewKeyRequest(key, request);
			request.requestType = RequestType.GET_ASYNC;
			ExectionHelper.ExecuteGet(request).then((r) => {
				if (DFFlag('DataStoreUseNewEndpoints')) {
					let result: Variant;
					let data: any;
					if (r.status === 204) {
						data = undefined;
					} else {
						// the result is the response, no legacy data key.
						const [deserializedResult, res] = DataStore.deserializeVariant(r.data);

						if (!deserializedResult) {
							if (DFFlag('DataStoreNewEndpointsReturnResultIfFailedToDeserialize')) {
								data = r.data;
							} else {
								return errorFunction("Can't parse value");
							}
						} else {
							data = res;
						}
					}

					FASTLOGS(
						FLog['DataStore'],
						'[FLog::DataStore] Running transform function, input: %s',
						JSON.stringify(data),
					);
					try {
						result = transformFunc(data, undefined);
					} catch (e) {
						return errorFunction(e);
					}

					if (result === undefined || (result as Map<string, unknown>).size === 0 || result === null) {
						FASTLOG(
							FLog['DataStore'],
							'[FLog::DataStore] Transform function returned nil, update is cancelled',
						);
						return errorFunction('Transform function returned nil, update is cancelled');
					}

					if (!this.checkValueIsAllowed(result))
						return errorFunction(
							`${typeof result} is not allowed in ${
								this.getDataStoreTypeString() === 'standard' ? 'DataStore' : 'OrderedDataStore'
							}`,
						);

					const value = JSON.parse(JSON.stringify(result));
					if (value.length > DFInt('DataStoreMaxValueSize')) return errorFunction('Value is too large');

					const usn = r.headers['roblox-usn'];

					const request = new HttpRequest();
					request.url = this.constructSetIfV2Url(key, usn);
					request.postData = value;
					request.owner = this;
					request.key = key;
					request.requestType = RequestType.UPDATE_ASYNC;

					FASTLOGS(FLog['DataStore'], '[FLog::DataStore] SetIf on key: %s', key);
					this.logLongValue(JSON.stringify(value));
					ExectionHelper.ExecuteSet(request)
						.then((r2) => {
							const [success, res] = DataStore.deserializeVariant(r.data);
							if (!success) return errorFunction("Can't parse response");

							if (this.callbacks.has(key)) {
								this.callbacks.get(key)(res);
							}

							const usn = res['usn'];

							if (this.CachedUsns.get(key) !== usn) {
								this.CachedUsns.set(key, usn);
							}

							return resumeFunction(res as Variant);
						})
						.catch((reason) => {
							return errorFunction(reason);
						});

					return;
				}

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
						undefined,
					);
				} catch (e) {
					return errorFunction(e);
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
		});
	}

	/**
	 * @internal
	 */
	protected allScopes: boolean;

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
		if (DFFlag('DataStoreUseNewEndpoints')) return 'v1/persistence';
		return 'persistence';
	}

	/**
	 * This function returns the latest value of the provided key and a {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyInfo|DataStoreKeyInfo} instance.
	 * If the key does not exist or if the latest version has been marked as deleted, both return values will be nil.
	 *
	 * ---
	 * WARNING
	 * --------
	 * {@link https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore|OrderedDataStore} does not support v2.0 features such as versioning and metadata,
	 * so {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyInfo|DataStoreKeyInfo} will always be `nil` for keys in an {@link https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore|OrderedDataStore}.
	 * {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyInfo|DataStoreKeyInfo} will also be `nil` if v2.0 experimental features are not enabled.
	 *
	 * Keys are cached locally for 4 seconds after the first read.
	 * A {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/GetAsync|GlobalDataStore:GetAsync} call within these 4 seconds returns a value from the cache.
	 * Modifications to the key by {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/SetAsync|GlobalDataStore:SetAsync} or {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/UpdateAsync|GlobalDataStore:UpdateAsync} apply to the cache immediately and restart the 4 second timer.
	 *
	 * ---
	 * NOTICE
	 * --------
	 * To get a specific version, such as a version before the latest, use {@link https://developer.roblox.com/en-us/api-reference/function/DataStore/GetVersionAsync|DataStore:GetVersionAsync}.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - {@link https://developer.roblox.com/en-us/articles/Data-store|Data Stores}, an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} key The key name for which the value is requested. If {@link https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes|DataStoreOptions.AllScopes} was set to true when accessing the data store through {@link https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore|DataStoreService:GetDataStore}, this key name must be prepended with the original scope as in “scope/key”.
	 * @returns {[Variant, DataStoreKeyInfo]} The value of the entry in the data store with the given key and a {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyInfo|DataStoreKeyInfo} instance that includes the version number, date and time the version was created, and functions to retrieve {@link https://developer.roblox.com/en-us/api-reference/property/Player/UserId|UserIds} and {@link https://developer.roblox.com/en-us/articles/Data-store#metadata|metadata}.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async GetAsync<Variant extends any>(key: string): Promise<Variant | unknown> {
		return new Promise((resumeFunction, errorFunction) => {
			FASTLOGS(FLog['DataStore'], `[FLog::DataStore] GetAsync on key %s`, key);
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);

			const request = new HttpRequest();
			this.createFetchNewKeyRequest(key, request);
			request.requestType = RequestType.GET_ASYNC;
			ExectionHelper.ExecuteGet(request)
				.then((r) => {
					if (DFFlag('DataStoreUseNewEndpoints')) {
						if (r.status === 204) return resumeFunction(undefined); // NO data

						// the result is the response, no legacy data key.
						const [deserializedResult, result] = DataStore.deserializeVariant(r.data); // It should be a string "{DATA}"

						if (!deserializedResult) {
							if (DFFlag('DataStoreNewEndpointsReturnResultIfFailedToDeserialize'))
								return resumeFunction(r.data);
							return errorFunction("Can't parse value");
						}

						const usn = r.headers['roblox-usn'];

						if (this.CachedUsns.get(key) !== usn) {
							this.CachedUsns.set(key, usn);
						}

						return resumeFunction(result);
					}

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
		});
	}

	/**
	 *
	 * This function sets the latest value, {@link https://developer.roblox.com/en-us/api-reference/property/Player/UserId|UserIds}, and metadata for the given key.
	 * Values in data stores are versioned,
	 * meaning {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/SetAsync|GlobalDataStore:SetAsync} will create a new version every time it is called.
	 * Prior versions can be accessed through {@link https://developer.roblox.com/en-us/api-reference/function/DataStore/ListVersionsAsync|DataStore:ListVersionsAsync}/{@link https://developer.roblox.com/en-us/api-reference/function/DataStore/GetVersionAsync|DataStore:GetVersionAsync} for up to 30 days at which point they are permanently deleted.
	 *
	 * ---
	 * WARNING
	 * --------
	 * {@link https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore|OrderedDataStore} does not support v2.0 features such as versioning, so calling this method on an {@link https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore|OrderedDataStore} key will overwrite the current value and make previous versions inaccessible.
	 *
	 * ---
	 * CRITICAL
	 * --------
	 * If the previous value of the key is important,
	 * use UpdateAsync() instead.
	 * Using GetAsync() to retrieve a value and then setting the key with SetAsync() is risky because GetAsync() sometimes returns cached data and other game servers may have modified the key.
	 *
	 * ---
	 * CRITICAL
	 * --------
	 * Metadata definitions must always be updated with a value, even if there are no changes to the current value; otherwise the current value will be lost.
	 *
	 * ---
	 * ---
	 * WARNING
	 * -------
	 * Any string being stored in a data store must be valid UTF-8.
	 * In UTF-8,
	 * values greater than 127 are used exclusively for encoding multi-byte codepoints,
	 * so a single byte greater than 127 will not be valid UTF-8 and the SetAsync() attempt will fail.
	 *
	 * ---
	 * SET VS. UPDATE
	 * ------
	 * {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/SetAsync|GlobalDataStore:SetAsync} is best for a quick update of a specific key,
	 * and it only counts against the write limit.
	 * However, it may cause data inconsistency if two servers attempt to set the same key at the same time.
	 * {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/UpdateAsync|GlobalDataStore:UpdateAsync} is safer for handling multi-server attempts because it reads the current key value (from whatever server last updated it) before making any changes.
	 * However, it's somewhat slower because it reads before it writes, and it also counts against both the read and write limit.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - {@link https://developer.roblox.com/en-us/articles/Data-store|Data Stores}, an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} key Key name for which the value should be set. If {@link https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes|DataStoreOptions.AllScopes} was set to true when accessing the data store through {@link https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore|DataStoreService:GetDataStore}, this key name must be prepended with the original scope as in “scope/key”.
	 * @param {Variant} value The value that the data store key will be set to.
	 * @param {number[]} userIds Table of {@link https://developer.roblox.com/en-us/api-reference/property/Player/UserId|UserIds}, highly recommended to assist with GDPR tracking/removal.
	 * @param {DataStoreSetOptions} options (Optional) {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreSetOptions|DataStoreSetOptions} instance that allows for metadata specification on the key.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 * @returns {Variant} The version identifier of the newly created version. It can be used to retrieve key info using `GlobalDataStore/GetVersionAsync|GetVersionAsync()` or to remove it using `GlobalDataStore/RemoveVersionAsync|RemoveVersionAsync()`.
	 * @unsafe For thread safety, this property is not safe to read in an unsynchronized thread
	 */
	public async SetAsync<Variant extends any>(
		key: string,
		value: Variant,
		userIds: number[] = [],
		options: DataStoreSetOptions = undefined,
	): Promise<Variant | unknown> {
		return new Promise((resumeFunction, errorFunction) => {
			/* 
				If {usn} is not provided at all, the operation is unconditional and the provided value replaces any exiting value of the key. The return status is 200 OK and the result object is a {Roblox.GamePersistence.Api.Models.V1.SetResponse} instance containing the new USN of the key.
				If {usn} is provided and empty, the operation only succeeds if the specified key does not exist. If {usn} is not empty, the operation only succeeds if the current key USN matches the provided USN.
				If the condition is not matched, the response status is 409 conflict and the response body contains the current key value. The current key USN is provided in the Roblox-Usn header. This is exact same response as from a GET operation on this key.
			*/
			if (userIds.length > 0) return errorFunction('Additional parameter UserIds not allowed');
			if (options) return errorFunction('Additional parameter Options not allowed');
			const [success, message] = InputHelper.CheckKey(key);
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

			if (DFFlag('DataStoreUseNewEndpoints')) {
				request.url = this.constructSetV2Url(key);
				request.owner = this;
				request.key = key;
				request.requestType = RequestType.GET_ASYNC;
				request.additionalHeaders['content-type'] = 'application/octet-stream';
				request.postData = JSON.parse(JSON.stringify(v)); // HACK: Unescaping the json encoded string.

				FASTLOGS(FLog['DataStore'], `[FLog::DataStore] SetAsync on key: %s`, key);
				this.logLongValue(v);
				FASTLOG(FLog['DataStore'], '[FLog::DataStore] JSON encoded:');
				this.logLongValue(request.postData);
			} else {
				request.url = this.constructSetUrl(key, v.length);
				request.owner = this;
				request.key = key;
				request.requestType = RequestType.SET_ASYNC;
				request.postData = `value=${this.urlEncodeIfNeeded(v.toString())}`.toString();
				FASTLOGS(FLog['DataStore'], `[FLog::DataStore] SetAsync on key: %s`, key);
				this.logLongValue(v);
				FASTLOG(FLog['DataStore'], '[FLog::DataStore] Url encoded:');
				this.logLongValue(request.postData);
			}

			ExectionHelper.ExecuteSet(request)
				.then((r) => {
					if (DFFlag('DataStoreUseNewEndpoints')) {
						const [success, res] = DataStore.deserializeVariant(r.data);
						if (!success) return errorFunction("Can't parse response");

						if (this.callbacks.has(key)) {
							this.callbacks.get(key)(value);
						}

						const usn = res['usn'];

						if (this.CachedUsns.get(key) !== usn) {
							this.CachedUsns.set(key, usn);
						}

						return resumeFunction(undefined);
					}

					const [success, res] = DataStore.deserializeVariant(r.data);
					if (!success) return errorFunction("Can't parse response");
					if (!res['data'])
						return errorFunction(
							"The response didn't contain the data, therefore a shallow fail was performed",
						);
					if (this.callbacks.has(key)) {
						this.callbacks.get(key)(value);
					}
					resumeFunction(undefined);
				})
				.catch((reason) => {
					return errorFunction(reason);
				});
		});
	}

	/**
	 * This function increments the value of a key by the provided amount (both must be integers).
	 *
	 * ---
	 * WARNING
	 * --------
	 * {@link https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore|OrderedDataStore} does not support v2.0 features such as versioning, so calling this method on an {@link https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore|OrderedDataStore} key will overwrite the current value and make previous versions inaccessible.
	 * ---
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - {@link https://developer.roblox.com/en-us/articles/Data-store|Data Stores}, an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} key Key name for which the value should be updated. If {@link https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes|DataStoreOptions.AllScopes} was set to true when accessing the data store through {@link https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore|DataStoreService:GetDataStore}, this key name must be prepended with the original scope as in “scope/key”.
	 * @param {number=1} delta 	Amount to increment the current value by.
	 * @param {number[]} userIds Table of {@link https://developer.roblox.com/en-us/api-reference/property/Player/UserId|UserIds} to associate with the key.
	 * @param {DataStoreSetOptions} options (Optional) {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreIncrementOptions|DataStoreIncrementOptions} instance that combines multiple additional parameters as custom metadata and allows for future extensibility.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 * @returns {Variant} The updated value of the entry in the data store with the given key.
	 * @unsafe For thread safety, this property is not safe to read in an unsynchronized thread.
	 */
	public async IncrementAsync(
		key: string,
		delta: number = 1,
		userIds: Array<number> = [],
		options: DataStoreIncrementOptions = undefined,
	): Promise<any> {
		return new Promise((resumeFunction, errorFunction) => {
			if (userIds.length > 0) return errorFunction('Additional parameter UserIds not allowed');
			if (options) return errorFunction('Additional parameter Options not allowed');
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);
			const request = new HttpRequest();

			if (DFFlag('DataStoreUseNewEndpoints')) {
				request.url = this.constructIncrementV2Url(key, delta);
			} else {
				request.url = this.constructIncrementUrl(key, delta);
			}

			request.owner = this;
			request.key = key;
			request.requestType = RequestType.INCREMENT_ASYNC;
			ExectionHelper.ExecuteSet(request)
				.then((r) => {
					if (DFFlag('DataStoreUseNewEndpoints')) {
						const [success, result] = DataStore.deserializeVariant(r.data);

						if (!success) return errorFunction("Can't parse response");

						if (!result['value'])
							return errorFunction('Unable to increment key as it may be anything other than a number');

						const value = parseFloat(result['value']) || 0;

						const usn = result['usn'];

						if (this.CachedUsns.get(key) !== usn) {
							this.CachedUsns.set(key, usn);
						}

						if (this.callbacks.has(key)) {
							this.callbacks.get(key)(value);
						}
						return resumeFunction(value);
					}
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
					// TODO: error parsing here.
					return errorFunction(reason);
				});
		});
	}

	/**
	 * This function retrieves the value and metadata of a key from the data store and updates it with a new value determined by the callback function specified through the second parameter.
	 * If the update succeeds, a new version of the value will be created and prior versions will remain accessible through {@link https://developer.roblox.com/en-us/api-reference/function/DataStore/ListVersionsAsync|DataStore:ListVersionsAsync} and {@link https://developer.roblox.com/en-us/api-reference/function/DataStore/GetVersionAsync|DataStore:GetVersionAsync}.
	 *
	 * ---
	 * WARNING
	 * --------
	 * {@link https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore|OrderedDataStore} does not support v2.0 features such as versioning, so calling this method on an {@link https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore|OrderedDataStore} key will overwrite the current value and make previous versions inaccessible.
	 *
	 * ---
	 *
	 * INFO
	 * -----
	 * In cases where another game server updated the key in the short timespan between retrieving the key's current value and setting the key's value,
	 * {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/UpdateAsync|GlobalDataStore:UpdateAsync} will call the function again to ensure that no data is overwritten.
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
	 * SET VS. UPDATE
	 * ------
	 * {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/SetAsync|GlobalDataStore:SetAsync} is best for a quick update of a specific key,
	 * and it only counts against the write limit.
	 * However, it may cause data inconsistency if two servers attempt to set the same key at the same time.
	 * {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/UpdateAsync|GlobalDataStore:UpdateAsync} is safer for handling multi-server attempts because it reads the current key value (from whatever server last updated it) before making any changes.
	 * However, it's somewhat slower because it reads before it writes, and it also counts against both the read and write limit.
	 *
	 * ---
	 * CALLBACK FUNCTION
	 * -------
	 * The callback function accepts two arguments:
	 * - Current value of the key prior to the update.
	 * - {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyInfo|DataStoreKeyInfo} instance that contains the latest version information (this argument can be ignored if metadata is not being used).
	 *
	 * In turn, the callback function returns up to three values:
	 * - The new value to set for the key.
	 * - An array of {@link https://developer.roblox.com/en-us/api-reference/property/Player/UserId|UserIds} to associate with the key. {@link https://developer.roblox.com/en-us/api-reference/function/DataStoreKeyInfo/GetUserIds|DataStoreKeyInfo:GetUserIds} should be returned unless the existing IDs are being changed; otherwise all existing IDs will be cleared.
	 * - A Map containing metadata to associate with the key. {@link https://developer.roblox.com/en-us/api-reference/function/DataStoreKeyInfo/GetMetadata|DataStoreKeyInfo:GetMetadata} should be returned unless the existing metadata is being changed; otherwise all existing metadata will be cleared.
	 *
	 * ---
	 * CRITICAL
	 * -------
	 * The callback function cannot yield, so do not include calls like wait().
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - {@link https://developer.roblox.com/en-us/articles/Data-store|Data Stores}, an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} key Key name for which the value should be updated. If {@link https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes|DataStoreOptions.AllScopes} was set to true when accessing the data store through {@link https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore|DataStoreService:GetDataStore}, this key name must be prepended with the original scope as in “scope/key”.
	 * @param {Function} transformFunction Transform function that takes the current value and {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyInfo|DataStoreKeyInfo} as parameters and returns the new value along with optional {@link https://developer.roblox.com/en-us/api-reference/property/Player/UserId|UserIds} and metadata.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async UpdateAsync<Variant extends any>(
		key: string,
		transformFunction: (previousValue: Variant, keyInfo: DataStoreKeyInfo) => Variant,
	): Promise<Variant | unknown> {
		return new Promise(async (resumeFunction, errorFunction) => {
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);
			FASTLOGS(FLog['DataStore'], '[FLog::DataStore] Updating key %s', key);
			const result = await this.runTransformFunction(key, transformFunction);
			resumeFunction(result);
		});
	}

	/**
	 * This function marks the specified key as deleted by creating a new “tombstone” version of the key.
	 * Prior to this, it returns the latest version prior to the remove call.
	 * After a key is removed via this function, {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/GetAsync|GlobalDataStore:GetAsync} calls for the key will return nil.
	 * Older versions of the key remain accessible through `GlobalDataStore/ListVersionsAsync` and `GlobalDataStore/GetVersionAsync`, assuming they have not expired.
	 *
	 * ---
	 * WARNING
	 * --------
	 * {@link https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore|OrderedDataStore} does not support versioning, so calling {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/RemoveAsync|GlobalDataStore:RemoveAsync} on an {@link https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore|OrderedDataStore} key will permanently delete it.
	 *
	 * Removed objects will be deleted permanently after 30 days.
	 *
	 * ---
	 *
	 * @param {string} key Key name to be removed. If {@link https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes|DataStoreOptions.AllScopes} was set to true when accessing the data store through {@link https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore|DataStoreService:GetDataStore}, this key name must be prepended with the original scope as in “scope/key”.
	 * @returns {Variant} The value of the data store prior to deletion and a {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyInfo|DataStoreKeyInfo} instance that includes the version number, date and time the version was created, and functions to retrieve {@link https://developer.roblox.com/en-us/api-reference/property/Player/UserId|UserIds} and {@link https://developer.roblox.com/en-us/articles/Data-store#metadata|metadata}.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async RemoveAsync<Variant extends any>(key: string): Promise<Variant | unknown> {
		return new Promise((resumeFunction, errorFunction) => {
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);
			const request = new HttpRequest();
			if (DFFlag('DataStoreUseNewEndpoints')) {
				request.url = this.constructRemoveV2Url(key);
			} else {
				request.url = this.constructRemoveUrl(key);
			}
			request.owner = this;
			request.key = key;
			request.requestType = RequestType.SET_ASYNC;
			ExectionHelper.ExecuteSet(request)
				.then((value) => {
					if (DFFlag('DataStoreUseNewEndpoints')) {
						const [success, res] = DataStore.deserializeVariant(value.data);
						if (!success) return errorFunction("Can't parse response");

						const usn = res['usn'];

						if (this.CachedUsns.get(key) !== usn) {
							this.CachedUsns.set(key, usn);
						}

						return resumeFunction(res as Variant);
					}

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
	 * This function sets **callback** as the function to be run any time the value associated with the {@link https://developer.roblox.com/en-us/api-reference/class/GlobalDataStore|data store's} key changes.
	 * Once every minute, OnUpdate polls for changes by other servers.
	 * Changes made on the same server will run the function immediately. In other words,
	 * functions like {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/IncrementAsync|IncrementAsync()}, {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/SetAsync|SetAsync()}, and {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/SetAsync|UpdateAsync()} change the key’s value in the data store and will cause the function to run.
	 * See the {@link https://developer.roblox.com/en-us/articles/Data-store|Data Stores} article for an in-depth guide on data structure, management, error handling, etc.
	 *
	 * ---
	 * CRITICAL
	 * -------
	 * It's recommended that you **disconnect** the connection when the subscription to the key is no longer needed.
	 *
	 * ---
	 *
	 * @param {string} key The key identifying the entry being retrieved from the data store
	 * @param {Function} callback The function to be executed any time the value associated with **key** is changed
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
