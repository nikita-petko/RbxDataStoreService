import {
	DFFlag,
	DFInt,
	DYNAMIC_FASTFLAGVARIABLE,
	DYNAMIC_FASTINT,
	FASTLOG,
	FASTLOGS,
	FLog,
	LOGGROUP,
	LOGVARIABLE,
} from '../Tools/FastLogTool';
import { Globals } from '../Util/Globals';
import { DataStoreSetOptions } from './DataStoreSetOptions';
import { DataStore } from './DataStore';
import { HttpRequest } from './HttpRequest';
import Crypto from 'crypto-js';
import Base64 from 'crypto-js/enc-base64';
import { DataStoreIncrementOptions } from './DataStoreIncrementOptions';
import { SortDirection } from '../Enumeration/SortDirection';
import { ExectionHelper } from '../Helpers/ExecutionHelper';
import { InputHelper } from '../Helpers/InputHelper';
import { RequestType } from './Services/DataStoreService';
import { ApiDataStoresUrlConstruction } from '../Constructors/ApiDataStoresUrlConstruction';
import { DataStoreKeyInfo } from './DataStoreKeyInfo';
import { DataStoreKeyPages } from './DataStoreKeyPages';
import { DataStoreVersionPages } from './DataStoreVersionPages';

LOGGROUP('DataStore');
LOGVARIABLE('Debug', 0);
DYNAMIC_FASTINT('DataStoreMaxValueSize');
DYNAMIC_FASTFLAGVARIABLE('DataStore2CheckObjectKeyForScope', false);

export class DataStore2 extends DataStore {
	/**
	 * @internal
	 */
	constructor(name: string, scope: string, legacy: boolean, allScopes: boolean) {
		super(name, scope, legacy, allScopes);
	}

	/**
	 * @internal
	 */
	protected urlApiPath(): string {
		return 'v2/persistence';
	}

	/**
	 * @internal
	 */
	protected runTransformFunction<Variant extends any>(
		key: string,
		transformFunc: (previousValue: Variant, keyInfo: DataStoreKeyInfo) => Variant,
	): Promise<[Variant, DataStoreKeyInfo]> {
		return new Promise(async (resumeFunction, errorFunction) => {
			let result: Variant;
			let metadata: object;
			let userIds: number[];
			const [data, keyInfo] = await this.GetAsync(key);

			FASTLOGS(
				FLog['DataStore'],
				'[FLog::DataStore] Running transform function, input: %s',
				JSON.stringify(data),
			);

			try {
				let transformResult = <any>transformFunc(data as Variant, keyInfo);

				// going on a stretch here because the user may return an array
				// will have to document it for them, because tuples suck!
				if (Array.isArray(transformResult)) {
					result = transformResult[0];
					metadata = transformResult[1];
					userIds = transformResult[2];
				} else {
					result = transformResult;
				}
			} catch (e) {
				return errorFunction(e);
			}

			if (result === undefined || (result as Map<string, unknown>).size === 0 || result === null) {
				FASTLOG(FLog['DataStore'], '[FLog::DataStore] Transform function returned nil, update is cancelled');
				return errorFunction('Transform function returned nil, update is cancelled');
			}

			if (userIds !== undefined) {
				if (!Array.isArray(userIds)) return errorFunction('Attribute userId format is invalid');
			}

			if (metadata !== undefined) {
				if (typeof metadata !== 'object') return errorFunction('Attribute metadata format is invalid');
			}

			if (!this.checkValueIsAllowed(result))
				return errorFunction(
					`${typeof result} is not allowed in ${
						this.getDataStoreTypeString() === 'standard' ? 'DataStore' : 'OrderedDataStore'
					}`,
				);

			const [serialized, v] = DataStore.serializeVariant(result);
			if (!serialized)
				return errorFunction(
					`${typeof result} is not allowed in ${
						this.getDataStoreTypeString() === 'standard' ? 'DataStore' : 'OrderedDataStore'
					}`,
				);
			if (v.length > DFInt('DataStoreMaxValueSize')) return errorFunction('Value is too large');
			const request = new HttpRequest();
			request.url = ApiDataStoresUrlConstruction.constructObjectOpUrl(
				this.nameUrlEncodedIfNeeded,
				this.allScopes ? key : `${this.scopeUrlEncodedIfNeeded}/${key}`,
				Globals.UniverseID,
			);
			request.owner = this;
			request.key = key;
			request.requestType = RequestType.SET_ASYNC;
			request.postData = v.toString();
			request.additionalHeaders['Content-MD5'] = Base64.stringify(Crypto.MD5(request.postData));
			request.additionalHeaders['Content-Type'] = '*/*';
			request.additionalHeaders['If-Match'] = keyInfo.Version;
			if (metadata) request.additionalHeaders['Roblox-Object-Attributes'] = JSON.stringify(metadata || {});
			if (userIds) request.additionalHeaders['Roblox-Object-UserIds'] = JSON.stringify(userIds);
			FASTLOGS(FLog['DataStore'], `[FLog::DataStore] SetIf on key: %s`, key);
			this.logLongValue(v);
			/*
				Expected response:
				{
					  "version": "OBJECT_VERSION_HERE", // The version of the object
					  "deleted": false, // Was the key deleted, only works if DELETE on endpoint
					  "contentLength": 0, // The absolute content length
					  "createdTime": "VERSION_CREATED_DATE_HERE", // The date that this version was created in an ISO string
					  "objectCreatedTime": "OBJECT_CREATED_DATE" // The date thet the key was created.
				}
				*/
			ExectionHelper.ExecuteSet(request)
				.then((r) => {
					const [success, res] = DataStore.deserializeVariant(r.data);
					if (!success) return errorFunction("Can't parse response");
					if (this.callbacks.has(key)) {
						this.callbacks.get(key)(result);
					}
					resumeFunction([
						result,
						new DataStoreKeyInfo(
							new Date(res['objectCreatedTime']).getTime(),
							new Date(res['createdTime']).getTime(),
							res['version'],
							metadata as Map<string, any>,
							userIds,
						),
					]);
				})
				.catch((reason) => {
					return errorFunction(reason);
				});
		});
	}

	/////////////// LEGACY MEMBERS ///////////////

	public async GetAsync<Variant extends any>(key: string): Promise<[Variant, DataStoreKeyInfo]> {
		return new Promise(async (resumeFunction, errorFunction) => {
			FASTLOGS(FLog['DataStore'], `[FLog::DataStore] GetAsync on key %s`, key);
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);

			if (this.allScopes) {
				if (this.scope.length > 0)
					return errorFunction('DataStore scope should be an empty string allScopes is set to true');

				if (DFFlag('DataStore2CheckObjectKeyForScope')) {
					if (key.split('/').length < 2) return errorFunction('The provided object key is invalid.');
				}
			}

			const request = new HttpRequest();
			request.key = key;
			request.owner = this;
			request.method = 'GET';
			request.url = ApiDataStoresUrlConstruction.constructObjectOpUrl(
				this.nameUrlEncodedIfNeeded,
				this.allScopes ? key : `${this.scopeUrlEncodedIfNeeded}/${key}`,
				Globals.UniverseID,
			);
			request.requestType = RequestType.GET_ASYNC;
			ExectionHelper.ExecuteGet(request)
				.then((r) => {
					let [didDeserialize, result] = DataStore2.deserializeVariant(r.data);

					if (!didDeserialize) result = r.data;

					return resumeFunction([
						result as Variant,
						new DataStoreKeyInfo(
							new Date(r.headers['roblox-object-created-time']).getTime(),
							new Date(r.headers['roblox-object-version-created-time']).getTime(),
							r.headers['etag'],
							new Map(Object.entries(JSON.parse(r.headers['roblox-object-attributes'] || '{}'))),
							JSON.parse(r.headers['roblox-Object-userids'] || '[]'),
						),
					]);
				})
				.catch((reason) => {
					if (reason.response) {
						if (reason.response.data['errors'][0]['code'] === 11)
							return resumeFunction([undefined, undefined]);
						return errorFunction(reason.response.data['errors'][0]['message']);
					}
					return errorFunction(reason);
				});
		});
	}

	public async SetAsync<Variant extends any>(
		key: string,
		value: Variant,
		userIds: Array<number> = [],
		options: DataStoreSetOptions = undefined,
	): Promise<Variant> {
		return new Promise(async (resumeFunction, errorFunction) => {
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);

			if (this.allScopes) {
				if (this.scope.length > 0)
					return errorFunction('DataStore scope should be an empty string allScopes is set to true');

				if (DFFlag('DataStore2CheckObjectKeyForScope')) {
					if (key.split('/').length < 2) return errorFunction('The provided object key is invalid.');
				}
			}

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
			request.url = ApiDataStoresUrlConstruction.constructObjectOpUrl(
				this.nameUrlEncodedIfNeeded,
				this.allScopes ? key : `${this.scopeUrlEncodedIfNeeded}/${key}`,
				Globals.UniverseID,
			);
			request.owner = this;
			request.key = key;
			request.requestType = RequestType.SET_ASYNC;
			request.postData = v.toString();
			request.additionalHeaders['Content-MD5'] = Base64.stringify(Crypto.MD5(request.postData));
			request.additionalHeaders['Content-Type'] = '*/*';
			request.additionalHeaders['Roblox-Object-Attributes'] = JSON.stringify(
				options ? options.GetMetadata() : {},
			);
			request.additionalHeaders['Roblox-Object-UserIds'] = JSON.stringify(userIds);
			FASTLOGS(FLog['DataStore'], `[FLog::DataStore] SetAsync on key: %s`, key);
			this.logLongValue(v);
			/*
			Expected response:
			{
  				"version": "OBJECT_VERSION_HERE", // The version of the object
  				"deleted": false, // Was the key deleted, only works if DELETE on endpoint
  				"contentLength": 0, // The absolute content length
  				"createdTime": "VERSION_CREATED_DATE_HERE", // The date that this version was created in an ISO string
  				"objectCreatedTime": "OBJECT_CREATED_DATE" // The date thet the key was created.
			}
			*/
			ExectionHelper.ExecuteSet(request)
				.then((r) => {
					const [success, result] = DataStore.deserializeVariant(r.data);
					if (!success) return errorFunction("Can't parse response");
					if (this.callbacks.has(key)) {
						this.callbacks.get(key)(value);
					}
					resumeFunction(result['version']);
				})
				.catch((reason) => {
					return errorFunction(reason);
				});
		});
	}

	public async RemoveAsync<Variant extends any>(key: string): Promise<[Variant, DataStoreKeyInfo]> {
		return new Promise(async (resumeFunction, errorFunction) => {
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);

			if (this.allScopes) {
				if (this.scope.length > 0)
					return errorFunction('DataStore scope should be an empty string allScopes is set to true');

				if (DFFlag('DataStore2CheckObjectKeyForScope')) {
					if (key.split('/').length < 2) return errorFunction('The provided object key is invalid.');
				}
			}

			const request = new HttpRequest();
			request.url = ApiDataStoresUrlConstruction.constructObjectOpUrl(
				this.nameUrlEncodedIfNeeded,
				this.allScopes ? key : `${this.scopeUrlEncodedIfNeeded}/${key}`,
				Globals.UniverseID,
			);
			request.owner = this;
			request.key = key;
			request.method = 'DELETE';
			request.requestType = RequestType.SET_ASYNC;
			ExectionHelper.ExecuteSet(request)
				.then((value) => {
					let [didDeserialize, result] = DataStore2.deserializeVariant(value.data);

					if (!didDeserialize) result = value.data;
					resumeFunction([
						result as Variant,
						new DataStoreKeyInfo(
							new Date(value.headers['roblox-object-created-time']).getTime(),
							new Date(value.headers['roblox-object-version-created-time']).getTime(),
							value.headers['etag'],
							new Map(Object.entries(JSON.parse(value.headers['roblox-object-attributes'] || '{}'))),
							JSON.parse(value.headers['roblox-Object-userids'] || '[]'),
						),
					]);
				})
				.catch((e) => {
					return errorFunction(e);
				});
		});
	}

	public async IncrementAsync(
		key: string,
		delta: number = 1,
		userIds: Array<number> = [],
		options: DataStoreIncrementOptions = undefined,
	): Promise<[number, DataStoreKeyInfo]> {
		return new Promise(async (resumeFunction, errorFunction) => {
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);

			if (this.allScopes) {
				if (this.scope.length > 0)
					return errorFunction('DataStore scope should be an empty string allScopes is set to true');

				if (DFFlag('DataStore2CheckObjectKeyForScope')) {
					if (key.split('/').length < 2) return errorFunction('The provided object key is invalid.');
				}
			}

			const request = new HttpRequest();
			request.url = ApiDataStoresUrlConstruction.constructIncrementOpUrl(
				this.nameUrlEncodedIfNeeded,
				this.allScopes ? key : `${this.scopeUrlEncodedIfNeeded}/${key}`,
				Globals.UniverseID,
				delta,
			);
			request.owner = this;
			request.additionalHeaders['Roblox-Object-Attributes'] = JSON.stringify(
				options ? options.GetMetadata() : {},
			);
			request.additionalHeaders['Roblox-Object-UserIds'] = JSON.stringify(userIds);
			request.key = key;
			request.requestType = RequestType.INCREMENT_ASYNC;
			ExectionHelper.ExecuteSet(request)
				.then((value) => {
					if (this.callbacks.has(key)) {
						this.callbacks.get(key)(parseFloat(value.data) || 0);
					}
					resumeFunction([
						parseFloat(value.data) || 0,
						new DataStoreKeyInfo(
							new Date(value.headers['roblox-object-created-time']).getTime(),
							new Date(value.headers['roblox-object-version-created-time']).getTime(),
							value.headers['etag'],
							new Map(Object.entries(JSON.parse(value.headers['roblox-object-attributes'] || '{}'))),
							JSON.parse(value.headers['roblox-Object-userids'] || '[]'),
						),
					]);
				})
				.catch((reason) => {
					return errorFunction(reason);
				});
		});
	}

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

	/////////////// NEW MEMBERS ///////////////

	/**
	 * This function retrieves the specified key version as well as a {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyInfo|DataStoreKeyInfo} instance.
	 * A version identifier can be found through {@link https://developer.roblox.com/en-us/api-reference/function/DataStore/ListVersionsAsync|DataStore:ListVersionsAsync} or alternatively be the identifier returned by {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/SetAsync|GlobalDataStore:SetAsync}.
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - {@link https://developer.roblox.com/en-us/articles/Data-store|Data Stores}, an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} key Key name for which the value should be updated. If {@link https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes|DataStoreOptions.AllScopes} was set to true when accessing the data store through {@link https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore|DataStoreService:GetDataStore}, this key name must be prepended with the original scope as in “scope/key”.
	 * @param {string} version Version number of the key for which the version info is requested
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 * @returns {[Variant, DataStoreKeyInfo]} The value of the key at the specified version and a {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyInfo|DataStoreKeyInfo} instance that includes the version number, date and time the version was created, and functions to retrieve {@link https://developer.roblox.com/en-us/api-reference/property/Player/UserId|UserIds} and metadata.
	 */
	public async GetVersionAsync<Variant extends any>(
		key: string,
		version: string,
	): Promise<[Variant, DataStoreKeyInfo]> {
		return new Promise(async (resumeFunction, errorFunction) => {
			FASTLOGS(FLog['DataStore'], `[FLog::DataStore] GetVersionAsync on key %s`, key);
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);

			if (this.allScopes) {
				if (this.scope.length > 0)
					return errorFunction('DataStore scope should be an empty string allScopes is set to true');

				if (DFFlag('DataStore2CheckObjectKeyForScope')) {
					if (key.split('/').length < 2) return errorFunction('The provided object key is invalid.');
				}
			}

			const request = new HttpRequest();
			request.key = key;
			request.owner = this;
			request.method = 'GET';
			request.url = ApiDataStoresUrlConstruction.constructVersionOpUrl(
				this.nameUrlEncodedIfNeeded,
				this.allScopes ? key : `${this.scopeUrlEncodedIfNeeded}/${key}`,
				Globals.UniverseID,
				version,
			);
			request.requestType = RequestType.GET_ASYNC;
			ExectionHelper.ExecuteGet(request)
				.then((r) => {
					let [didDeserialize, result] = DataStore2.deserializeVariant(r.data);

					if (!didDeserialize) result = r.data;

					return resumeFunction([
						result as Variant,
						new DataStoreKeyInfo(
							new Date(r.headers['roblox-object-created-time']).getTime(),
							new Date(r.headers['roblox-object-version-created-time']).getTime(),
							r.headers['etag'],
							new Map(Object.entries(JSON.parse(r.headers['roblox-object-attributes'] || '{}'))),
							JSON.parse(r.headers['roblox-Object-userids'] || '[]'),
						),
					]);
				})
				.catch((reason) => {
					if (reason.response) {
						if (reason.response.data['errors'][0]['code'] === 11)
							return resumeFunction([undefined, undefined]);
						return errorFunction(reason.response.data['errors'][0]['message']);
					}
					return errorFunction(reason);
				});
		});
	}

	/**
	 * This function returns a {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyPages|DataStoreKeyPages} object for enumerating through keys of a data store.
	 * It accepts an optional `prefix` parameter to only locate data stores whose names start with the provided prefix.
	 * If {@link https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes|DataStoreOptions.AllScopes} was set to true when accessing the data store through {@link https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore|DataStoreService:GetDataStore}, keys will be returned with all scopes as prefixes.
	 *
	 * SEE ALSO
	 * --------
	 * - {@link https://developer.roblox.com/en-us/articles/Data-store|Data Stores}, an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} prefix (Optional) Prefix to use for locating keys.
	 * @param {number} pageSize (Optional) Number of items to be returned in each page.
	 * @returns {DataStoreKeyPages} A {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyPages|DataStoreKeyPages} instance that enumerates the keys as {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreKey|DataStoreKey} instances.
	 * @yields This is a yielding function. When called, it will pause the Javascript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 * @unsafe For thread safety, this property is not safe to read in an unsynchronized thread.
	 */
	public async ListKeysAsync(prefix: string = '', pageSize: number = 0): Promise<DataStoreKeyPages> {
		return new Promise(async (resumeFunction) => {
			if (!this.allScopes) {
				prefix = `${this.scopeUrlEncodedIfNeeded}/${prefix}`;
			}

			const url = ApiDataStoresUrlConstruction.constructListKeysUrl(
				this.nameUrlEncodedIfNeeded,
				Globals.UniverseID,
				prefix,
				pageSize,
			);

			const page = new DataStoreKeyPages(this, url);
			await page.AdvanceToNextPageAsync();
			return resumeFunction(page);
		});
	}

	/**
	 * This function enumerates versions of the specified key in either ascending or descending order specified by an {@link https://developer.roblox.com/en-us/api-reference/enum/SortDirection|SortDirection} parameter.
	 * It can optionally filter the returned versions by minimum and maximum timestamp.
	 *
	 * SEE ALSO
	 * --------
	 * - {@link https://developer.roblox.com/en-us/articles/Data-store|Data Stores}, an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} key Key name for the versions to list. If {@link https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes|DataStoreOptions.AllScopes} was set to true when accessing the data store through {@link https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore|DataStoreService:GetDataStore}, this key name must be prepended with the original scope as in “scope/key”.
	 * @param {SortDirection?} sortDirection (Optional) Enum specifying ascending or descending sort order. Default is ascending.
	 * @param {number} minDate (Optional) Date after which the versions should be listed.
	 * @param {number} maxDate (Optional) Date up to which the versions should be listed.
	 * @param {number} pageSize (Optional) Number of items to be returned in each page.
	 * @returns {DataStoreVersionPages} A {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreVersionPages|DataStoreVersionPages} instance that enumerates all the versions of the key as {@link https://developer.roblox.com/en-us/api-reference/class/DataStoreObjectVersionInfo|DataStoreObjectVersionInfo} instances.
	 * @yields This is a yielding function. When called, it will pause the Javascript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 * @unsafe For thread safety, this property is not safe to read in an unsynchronized thread.
	 */
	public async ListVersionsAsync(
		key: string,
		sortDirection: SortDirection = SortDirection.Ascending,
		minDate: number = 0,
		maxDate: number = 0,
		pageSize: number = 0,
	): Promise<DataStoreVersionPages> {
		return new Promise(async (resumeFunction, errorFunction) => {
			if (this.allScopes) {
				if (this.scope.length > 0)
					return errorFunction('DataStore scope should be an empty string allScopes is set to true');

				if (DFFlag('DataStore2CheckObjectKeyForScope')) {
					if (key.split('/').length < 2) return errorFunction('The provided object key is invalid.');
				}
			}

			const url = ApiDataStoresUrlConstruction.constructListVersionsUrl(
				this.nameUrlEncodedIfNeeded,
				Globals.UniverseID,
				this.allScopes ? key : `${this.scopeUrlEncodedIfNeeded}/${key}`,
				pageSize,
				minDate,
				maxDate,
				sortDirection,
			);

			const page = new DataStoreVersionPages(this, url);
			await page.AdvanceToNextPageAsync();
			return resumeFunction(page);
		});
	}

	/**
	 * This function permanently deletes the specified version of a key. Version identifiers can be found through {@link https://developer.roblox.com/en-us/api-reference/function/DataStore/ListVersionsAsync|DataStore:ListVersionsAsync}.
	 *
	 * Unlike {@link https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/RemoveAsync|GlobalDataStore:RemoveAsync}, this function does not create a new “tombstone” version and the removed value cannot be retrieved later.
	 *
	 * SEE ALSO
	 * --------
	 * - {@link https://developer.roblox.com/en-us/articles/Data-store|Data Stores}, an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} key Key name for which a version is to be removed. If {@link https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes|DataStoreOptions.AllScopes} was set to true when accessing the data store through {@link https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore|DataStoreService:GetDataStore}, this key name must be prepended with the original scope as in “scope/key”.
	 * @param {string} version Version number of the key to remove.
	 * @returns {void} No return.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async RemoveVersionAsync(key: string, version: string): Promise<void> {
		return new Promise(async (resumeFunction, errorFunction) => {
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);

			if (this.allScopes) {
				if (this.scope.length > 0)
					return errorFunction('DataStore scope should be an empty string allScopes is set to true');

				if (DFFlag('DataStore2CheckObjectKeyForScope')) {
					if (key.split('/').length < 2) return errorFunction('The provided object key is invalid.');
				}
			}

			const request = new HttpRequest();
			request.url = ApiDataStoresUrlConstruction.constructVersionOpUrl(
				this.nameUrlEncodedIfNeeded,
				this.allScopes ? key : `${this.scopeUrlEncodedIfNeeded}/${key}`,
				Globals.UniverseID,
				version,
			);
			request.owner = this;
			request.key = key;
			request.method = 'DELETE';
			request.requestType = RequestType.SET_ASYNC;
			ExectionHelper.ExecuteSet(request)
				.then(() => {
					resumeFunction();
				})
				.catch((e) => {
					return errorFunction(e);
				});
		});
	}
}
