import {
	DFFlag,
	DFInt,
	DYNAMIC_FASTFLAGVARIABLE,
	DYNAMIC_FASTINT,
	DYNAMIC_FASTINTVARIABLE,
	FASTLOG,
	FASTLOGS,
	FLog,
	LOGGROUP,
	LOGVARIABLE,
} from '../Tools/FastLogTool';
import { Globals } from '../Util/Globals';
import { DataStoreSetOptions } from './DataStoreSetOptions';
import { GlobalDataStore } from './GlobalDataStore';
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
import { ErrorHelper } from '../Helpers/ErrorHelper';
import { ErrorType } from '../Enumeration/ErrorType';

LOGGROUP('DataStore');
LOGVARIABLE('Debug', 0);
DYNAMIC_FASTINT('DataStoreMaxValueSize');
DYNAMIC_FASTFLAGVARIABLE('DataStore2CheckObjectKeyForScope', false);
DYNAMIC_FASTINTVARIABLE('DataStoreMaxMetadataSize', 300);
DYNAMIC_FASTINTVARIABLE('DataStoreMaxUserIdsLimit', 4);

export class DataStore extends GlobalDataStore {
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
				if (!Array.isArray(userIds))
					return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.USERID_ATTRIBUTE_INVALID));
				if (userIds.length > DFInt('DataStoreMaxUserIdsLimit'))
					return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.USERID_LIMIT_TOO_LARGE));
			}

			if (userIds)
				if (metadata !== undefined) {
					if (typeof metadata !== 'object')
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.METATADA_ATTRIBUTE_INVALID));
					if (JSON.stringify(metadata).length > DFInt('DataStoreMaxMetadataSize'))
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.METADATA_TOO_LARGE));
				}

			if (!this.checkValueIsAllowed(result))
				return errorFunction(
					ErrorHelper.GetErrorMessage(ErrorType.DATA_NOT_ALLOWED_IN_DATASTORE, typeof result),
				);

			const [serialized, v] = GlobalDataStore.serializeVariant(result);
			if (!serialized)
				return errorFunction(
					ErrorHelper.GetErrorMessage(ErrorType.DATA_NOT_ALLOWED_IN_DATASTORE, typeof result),
				);
			if (v.length > DFInt('DataStoreMaxValueSize'))
				return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.VALUE_TOO_LARGE));
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
			request.additionalHeaders['If-Match'] = JSON.stringify(keyInfo.Version);
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
					const [success, res] = GlobalDataStore.deserializeVariant(r.data);
					if (!success) return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.CANNOT_PARSE_RESPONSE));
					if (this.callbacks.has(key)) {
						this.callbacks.get(key)(result);
					}

					const objectCreatedTimeIso = res['objectCreatedTime'];
					if (objectCreatedTimeIso === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					const createdTimeIso = res['createdTime'];
					if (createdTimeIso === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					const version = res['version'];
					if (version === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));

					resumeFunction([
						res,
						new DataStoreKeyInfo(
							new Date(objectCreatedTimeIso).getTime(),
							new Date(createdTimeIso).getTime(),
							version,
							metadata as Map<string, any>,
							userIds,
						),
					]);
				})
				.catch((reason) => {
					return errorFunction(ErrorHelper.GetErrorResponseAndReturnMessage(reason));
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
				.then((response) => {
					let [didDeserialize, result] = DataStore.deserializeVariant(response.data);

					if (!didDeserialize) result = response.data;

					const objectCreatedTimeIso = response.headers['roblox-object-created-time'];
					if (objectCreatedTimeIso === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					const objectVersionCreatedTime = response.headers['roblox-object-version-created-time'];
					if (objectVersionCreatedTime === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					const version = response.headers['etag'];
					if (version === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					let objectAttributes = response.headers['roblox-object-attributes'];
					if (objectAttributes === undefined) objectAttributes = '{}';
					let objectUserIds = response.headers['roblox-object-userids'];
					if (objectUserIds === undefined) objectUserIds = '[]';

					return resumeFunction([
						result as Variant,
						new DataStoreKeyInfo(
							new Date(objectCreatedTimeIso).getTime(),
							new Date(objectVersionCreatedTime).getTime(),
							JSON.parse(version),
							new Map(Object.entries(JSON.parse(objectAttributes))),
							JSON.parse(objectUserIds),
						),
					]);
				})
				.catch((reason) => {
					if (reason.response) {
						if (reason.response.data instanceof Object) {
							const errors = reason.response.data['errors'];
							if (Array.isArray(errors) && errors.length > 0) {
								if (errors[0].code === 11) return resumeFunction([undefined, undefined]);
							}
						}
					}
					return errorFunction(ErrorHelper.GetErrorResponseAndReturnMessage(reason));
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
				if (DFFlag('DataStore2CheckObjectKeyForScope')) {
					if (key.split('/').length < 2) return errorFunction('The provided object key is invalid.');
				}
			}

			if (value === undefined)
				return errorFunction(
					ErrorHelper.GetErrorMessage(ErrorType.CANNOT_STORE_DATA_IN_DATASTORE, typeof value),
				);
			if (!this.checkValueIsAllowed(value))
				return errorFunction(
					ErrorHelper.GetErrorMessage(ErrorType.DATA_NOT_ALLOWED_IN_DATASTORE, typeof value),
				);
			const [success2, v] = GlobalDataStore.serializeVariant(value);
			if (!success2)
				return errorFunction(
					ErrorHelper.GetErrorMessage(ErrorType.DATA_NOT_ALLOWED_IN_DATASTORE, typeof value),
				);
			if (v.length > DFInt('DataStoreMaxValueSize'))
				return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.VALUE_TOO_LARGE));

			if (userIds.length > DFInt('DataStoreMaxUserIdsLimit'))
				return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.USERID_LIMIT_TOO_LARGE));

			if (options && JSON.stringify(options.GetMetadata()).length > DFInt('DataStoreMaxMetadataSize'))
				return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.METADATA_TOO_LARGE));

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
					const [success, result] = GlobalDataStore.deserializeVariant(r.data);
					if (!success) return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.CANNOT_PARSE_RESPONSE));
					if (this.callbacks.has(key)) {
						this.callbacks.get(key)(value);
					}

					const version = result['version'];

					if (version === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));

					resumeFunction(version);
				})
				.catch((reason) => {
					return errorFunction(ErrorHelper.GetErrorResponseAndReturnMessage(reason));
				});
		});
	}

	public async RemoveAsync<Variant extends any>(key: string): Promise<[Variant, DataStoreKeyInfo]> {
		return new Promise(async (resumeFunction, errorFunction) => {
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);

			if (this.allScopes) {
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
				.then((response) => {
					let [didDeserialize, result] = DataStore.deserializeVariant(response.data);

					if (!didDeserialize) result = response.data;

					const objectCreatedTimeIso = response.headers['roblox-object-created-time'];
					if (objectCreatedTimeIso === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					const objectVersionCreatedTime = response.headers['roblox-object-version-created-time'];
					if (objectVersionCreatedTime === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					const version = response.headers['etag'];
					if (version === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					let objectAttributes = response.headers['roblox-object-attributes'];
					if (objectAttributes === undefined) objectAttributes = '{}';
					let objectUserIds = response.headers['roblox-object-userids'];
					if (objectUserIds === undefined) objectUserIds = '[]';

					return resumeFunction([
						result as Variant,
						new DataStoreKeyInfo(
							new Date(objectCreatedTimeIso).getTime(),
							new Date(objectVersionCreatedTime).getTime(),
							JSON.parse(version),
							new Map(Object.entries(JSON.parse(objectAttributes))),
							JSON.parse(objectUserIds),
						),
					]);
				})
				.catch((error) => {
					return errorFunction(ErrorHelper.GetErrorResponseAndReturnMessage(error));
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
				if (DFFlag('DataStore2CheckObjectKeyForScope')) {
					if (key.split('/').length < 2) return errorFunction('The provided object key is invalid.');
				}
			}

			if (userIds.length > DFInt('DataStoreMaxUserIdsLimit'))
				return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.USERID_LIMIT_TOO_LARGE));

			if (options && JSON.stringify(options.GetMetadata()).length > DFInt('DataStoreMaxMetadataSize'))
				return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.METADATA_TOO_LARGE));

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
				.then((response) => {
					if (isNaN(parseFloat(response.data)))
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.CANNOT_PARSE_RESPONSE));

					if (this.callbacks.has(key)) {
						this.callbacks.get(key)(parseFloat(response.data) || 0);
					}

					const objectCreatedTimeIso = response.headers['roblox-object-created-time'];
					if (objectCreatedTimeIso === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					const objectVersionCreatedTime = response.headers['roblox-object-version-created-time'];
					if (objectVersionCreatedTime === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					const version = response.headers['etag'];
					if (version === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					let objectAttributes = response.headers['roblox-object-attributes'];
					if (objectAttributes === undefined) objectAttributes = '{}';
					let objectUserIds = response.headers['roblox-object-userids'];
					if (objectUserIds === undefined) objectUserIds = '[]';

					resumeFunction([
						parseFloat(response.data) || 0,
						new DataStoreKeyInfo(
							new Date(objectCreatedTimeIso).getTime(),
							new Date(objectVersionCreatedTime).getTime(),
							version,
							new Map(Object.entries(JSON.parse(objectAttributes))),
							JSON.parse(objectUserIds),
						),
					]);
				})
				.catch((reason) => {
					return errorFunction(ErrorHelper.GetErrorResponseAndReturnMessage(reason));
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
			this.runTransformFunction(key, transformFunction)
			    .then(resumeFunction)
			    .catch(errorFunction);
		});
	}

	/////////////// NEW MEMBERS ///////////////

	/**
	 * This function retrieves the specified key version as well as a [DataStoreKeyInfo](https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyInfo) instance.
	 * A version identifier can be found through [DataStore:ListVersionsAsync](https://developer.roblox.com/en-us/api-reference/function/DataStore/ListVersionsAsync) or alternatively be the identifier returned by [GlobalDataStore:SetAsync](https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/SetAsync).
	 *
	 * ---
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} key Key name for which the value should be updated. If [DataStoreOptions.AllScopes](https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes) was set to true when accessing the data store through [DataStoreService:GetDataStore](https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore), this key name must be prepended with the original scope as in “scope/key”.
	 * @param {string} version Version number of the key for which the version info is requested
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 * @returns {[Variant, DataStoreKeyInfo]} The value of the key at the specified version and a [DataStoreKeyInfo](https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyInfo) instance that includes the version number, date and time the version was created, and functions to retrieve [UserIds](https://developer.roblox.com/en-us/api-reference/property/Player/UserId) and metadata.
	 */
	public async GetVersionAsync<Variant extends any>(
		key: string,
		version: string = undefined,
	): Promise<[Variant, DataStoreKeyInfo]> {
		return new Promise(async (resumeFunction, errorFunction) => {
			FASTLOGS(FLog['DataStore'], `[FLog::DataStore] GetVersionAsync on key %s`, key);
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);

			if (this.allScopes) {
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
				.then((response) => {
					let [didDeserialize, result] = DataStore.deserializeVariant(response.data);

					if (!didDeserialize) result = response.data;

					const objectCreatedTimeIso = response.headers['roblox-object-created-time'];
					if (objectCreatedTimeIso === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					const objectVersionCreatedTime = response.headers['roblox-object-version-created-time'];
					if (objectVersionCreatedTime === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					const version = response.headers['etag'];
					if (version === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));
					let objectAttributes = response.headers['roblox-object-attributes'];
					if (objectAttributes === undefined) objectAttributes = '{}';
					let objectUserIds = response.headers['roblox-object-userids'];
					if (objectUserIds === undefined) objectUserIds = '[]';

					return resumeFunction([
						result as Variant,
						new DataStoreKeyInfo(
							new Date(objectCreatedTimeIso).getTime(),
							new Date(objectVersionCreatedTime).getTime(),
							version,
							new Map(Object.entries(JSON.parse(objectAttributes))),
							JSON.parse(objectUserIds),
						),
					]);
				})
				.catch((reason) => {
					if (reason.response) {
						if (reason.response.data instanceof Object) {
							const errors = reason.response.data['errors'];
							if (Array.isArray(errors) && errors.length > 0) {
								if (errors[0].code === 11) return resumeFunction([undefined, undefined]);
							}
						}
					}
					return errorFunction(ErrorHelper.GetErrorResponseAndReturnMessage(reason));
				});
		});
	}

	/**
	 * This function returns a [DataStoreKeyPages](https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyPages) object for enumerating through keys of a data store.
	 * It accepts an optional `prefix` parameter to only locate data stores whose names start with the provided prefix.
	 * If [DataStoreOptions.AllScopes](https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes) was set to true when accessing the data store through [DataStoreService:GetDataStore](https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore), keys will be returned with all scopes as prefixes.
	 *
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} prefix (Optional) Prefix to use for locating keys.
	 * @param {number} pageSize (Optional) Number of items to be returned in each page.
	 * @returns {DataStoreKeyPages} A [DataStoreKeyPages](https://developer.roblox.com/en-us/api-reference/class/DataStoreKeyPages) instance that enumerates the keys as [DataStoreKey](https://developer.roblox.com/en-us/api-reference/class/DataStoreKey) instances.
	 * @yields This is a yielding function. When called, it will pause the Javascript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 * @unsafe For thread safety, this property is not safe to read in an unsynchronized thread.
	 */
	public async ListKeysAsync(prefix: string = '', pageSize: number = 0): Promise<DataStoreKeyPages> {
		return new Promise(async (resumeFunction, errorFunction) => {
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
			await page
				.AdvanceToNextPageAsync()
				.then(() => resumeFunction(page))
				.catch(errorFunction);
		});
	}

	/**
	 * This function enumerates versions of the specified key in either ascending or descending order specified by an [SortDirection](https://developer.roblox.com/en-us/api-reference/enum/SortDirection) parameter.
	 * It can optionally filter the returned versions by minimum and maximum timestamp.
	 *
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} key Key name for the versions to list. If [DataStoreOptions.AllScopes](https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes) was set to true when accessing the data store through [DataStoreService:GetDataStore](https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore), this key name must be prepended with the original scope as in “scope/key”.
	 * @param {SortDirection?} sortDirection (Optional) Enum specifying ascending or descending sort order. Default is ascending.
	 * @param {number} minDate (Optional) Date after which the versions should be listed.
	 * @param {number} maxDate (Optional) Date up to which the versions should be listed.
	 * @param {number} pageSize (Optional) Number of items to be returned in each page.
	 * @returns {DataStoreVersionPages} A [DataStoreVersionPages](https://developer.roblox.com/en-us/api-reference/class/DataStoreVersionPages) instance that enumerates all the versions of the key as [DataStoreObjectVersionInfo](https://developer.roblox.com/en-us/api-reference/class/DataStoreObjectVersionInfo) instances.
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
			await page
				.AdvanceToNextPageAsync()
				.then(() => resumeFunction(page))
				.catch(errorFunction);
		});
	}

	/**
	 * This function permanently deletes the specified version of a key. Version identifiers can be found through [DataStore:ListVersionsAsync](https://developer.roblox.com/en-us/api-reference/function/DataStore/ListVersionsAsync).
	 *
	 * Unlike [GlobalDataStore:RemoveAsync](https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/RemoveAsync), this function does not create a new “tombstone” version and the removed value cannot be retrieved later.
	 *
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} key Key name for which a version is to be removed. If [DataStoreOptions.AllScopes](https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes) was set to true when accessing the data store through [DataStoreService:GetDataStore](https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore), this key name must be prepended with the original scope as in “scope/key”.
	 * @param {string} version Version number of the key to remove.
	 * @returns {void} No return.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async RemoveVersionAsync(key: string, version: string): Promise<void> {
		return new Promise(async (resumeFunction, errorFunction) => {
			const [success, message] = InputHelper.CheckKey(key);
			if (!success) return errorFunction(message);

			if (this.allScopes) {
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
					return errorFunction(ErrorHelper.GetErrorResponseAndReturnMessage(e));
				});
		});
	}
}
