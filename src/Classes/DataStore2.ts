import {
	DFInt,
	DYNAMIC_FASTINT,
	FASTFLAGVARIABLE,
	FASTLOGS,
	FFlag,
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

LOGGROUP('DataStore');
LOGVARIABLE('Debug', 0);
DYNAMIC_FASTINT('DataStoreMaxValueSize');
FASTFLAGVARIABLE('UseTestUniverse', false);

export class DataStore2 extends DataStore {
	constructor(name: string, scope: string, legacy: boolean) {
		super(name, scope, legacy);
	}

	/**
	 * @internal
	 */
	private static async getUniverseID() {
		return Globals.UniverseID;
	}

	/**
	 * @internal
	 */
	private constuctQueriesForPersistenceObjectV2Url(key: string) {
		return `?dataStore=${this.nameUrlEncodedIfNeeded.toString()}&objectKey=${this.scopeUrlEncodedIfNeeded.toString()}/${this.urlEncodeIfNeeded(
			key,
		)}`;
	}

	/**
	 * @internal
	 */
	private async constructPersistenceObjectV2Url(key: string) {
		const universeId = await DataStore2.getUniverseID();
		return `${this.serviceUrl}${
			FFlag['UseTestUniverse'] ? 2342098878 : universeId
		}/datastores/objects/object${this.constuctQueriesForPersistenceObjectV2Url(key)}`;
	}

	/**
	 * @internal
	 */
	private async constructIncrementPersistenceObjectV2Url(key: string, delta: number) {
		const universeId = await DataStore2.getUniverseID();
		return `${this.serviceUrl}${
			FFlag['UseTestUniverse'] ? 2342098878 : universeId
		}/datastores/objects/object/increment${this.constuctQueriesForPersistenceObjectV2Url(
			key,
		)}&incrementBy=${delta}`;
	}
	/**
	 * @internal
	 */
	private async constructVersionPersistenceObjectV2Url(key: string, version: string) {
		const universeId = await DataStore2.getUniverseID();
		return `${this.serviceUrl}${
			FFlag['UseTestUniverse'] ? 2342098878 : universeId
		}/datastores/objects/object${this.constuctQueriesForPersistenceObjectV2Url(key)}&version=${version}`;
	}

	/**
	 * @internal
	 */
	protected urlApiPath(): string {
		return 'v2/persistence';
	}

	/////////////// LEGACY MEMBERS ///////////////

	public async GetAsync<Variant extends any>(key: string): Promise<Variant | unknown> {
		return new Promise<Variant | unknown>(async (resumeFunction, errorFunction) => {
			FASTLOGS(FLog['DataStore'], `[FLog::DataStore] GetAsync on key %s`, key);
			const [success, message] = InputHelper.CheckAccess(key);
			if (!success) return errorFunction(message);

			const request = new HttpRequest();
			request.key = key;
			request.owner = this;
			request.method = 'GET';
			request.url = await this.constructPersistenceObjectV2Url(key); // This is an await because Typescript says it is.
			request.requestType = RequestType.GET_ASYNC;
			ExectionHelper.ExecuteGet(request)
				.then((r) => {
					return resumeFunction(r.data instanceof Object || r.data.length > 0 ? r.data : undefined);
				})
				.catch((reason) => {
					if (reason.response) {
						if (reason.response.data['errors'][0]['code'] === 11) return resumeFunction(undefined);
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
	): Promise<void> {
		return new Promise<void>(async (resumeFunction, errorFunction) => {
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
			request.url = await this.constructPersistenceObjectV2Url(key);
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
					const [success] = DataStore.deserializeVariant(r.data);
					if (!success) return errorFunction("Can't parse response");
					if (this.callbacks.has(key)) {
						this.callbacks.get(key)(value);
					}
					resumeFunction();
				})
				.catch((reason) => {
					return errorFunction(reason);
				});
		});
	}

	public async RemoveAsync<Variant extends any>(key: string): Promise<Variant> {
		return new Promise<Variant>(async (resumeFunction, errorFunction) => {
			const [success, message] = InputHelper.CheckAccess(key);
			if (!success) return errorFunction(message);
			const request = new HttpRequest();
			request.url = await this.constructPersistenceObjectV2Url(key);
			request.owner = this;
			request.key = key;
			request.method = 'DELETE';
			request.requestType = RequestType.SET_ASYNC;
			ExectionHelper.ExecuteSet(request)
				.then((value) => {
					if (!success) return errorFunction("Can't parse response");
					resumeFunction(DataStore.deserializeVariant(value.data)[1] as Variant);
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
	): Promise<number> {
		return new Promise<number>(async (resumeFunction, errorFunction) => {
			if (userIds.length > 0) return errorFunction('Additional parameter UserIds not allowed');
			if (options) return errorFunction('Additional parameter Options not allowed');
			const [success, message] = InputHelper.CheckAccess(key);
			if (!success) return errorFunction(message);
			const request = new HttpRequest();
			request.url = await this.constructIncrementPersistenceObjectV2Url(key, delta);
			request.owner = this;
			request.additionalHeaders['Roblox-Object-Attributes'] = JSON.stringify(
				options ? options.GetMetadata() : {},
			);
			request.additionalHeaders['Roblox-Object-UserIds'] = JSON.stringify(userIds);
			request.key = key;
			request.requestType = RequestType.INCREMENT_ASYNC;
			ExectionHelper.ExecuteSet(request)
				.then((r) => {
					if (this.callbacks.has(key)) {
						this.callbacks.get(key)(parseFloat(r.data) || 0);
					}
					resumeFunction(parseFloat(r.data) || 0);
				})
				.catch((reason) => {
					return errorFunction(reason);
				});
		});
	}

	/////////////// NEW MEMBERS ///////////////

	/**
	 * Returns the value of the entry in the data store with the given key and version.
	 * This function returns the value of the entry in the GlobalDataStore with the given key.
	 * If the key does not exist,
	 * returns undefined.
	 * This function used to cache for about 4 seconds,
	 * so you couldn't be sure that it returns the current value saved on the Roblox servers.
	 * If this function throws an error,
	 * the error message will describe the problem.
	 * Note that there are also limits that will soon apply to this function.
	 * @param {string} key The key identifying the entry being retrieved from the data store.
	 * @param {string} version The version identifying the entry version being retrieved from the data store.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 * @returns {Variant} The value of the entry in the data store with the given key
	 */
	public async GetVersionAsync<Variant extends any>(key: string, version: string): Promise<Variant | unknown> {
		return new Promise<Variant | unknown>(async (resumeFunction, errorFunction) => {
			FASTLOGS(FLog['DataStore'], `[FLog::DataStore] GetVersionAsync on key %s`, key);
			const [success, message] = InputHelper.CheckAccess(key);
			if (!success) return errorFunction(message);

			const request = new HttpRequest();
			request.key = key;
			request.owner = this;
			request.method = 'GET';
			request.url = await this.constructVersionPersistenceObjectV2Url(key, version); // This is an await because Typescript says it is.
			request.requestType = RequestType.GET_ASYNC;
			ExectionHelper.ExecuteGet(request)
				.then((r) => {
					return resumeFunction(r.data instanceof Object || r.data.length > 0 ? r.data : undefined);
				})
				.catch((reason) => {
					if (reason.response) {
						if (reason.response.data['errors'][0]['code'] === 11) return resumeFunction(undefined);
						return errorFunction(reason.response.data['errors'][0]['message']);
					}
					return errorFunction(reason);
				});
		});
	}

	public async ListKeysAsync(prefix: string = '', pageSize: number = 0) {}
	public async ListVersionsAsync(
		key: string,
		sortDirection: SortDirection = SortDirection.Ascending,
		minDate: number = 0,
		maxDate: number = 0,
		pageSize: number = 0,
	) {}
	public async RemoveVersionAsync(key: string, version: string) {}
}
