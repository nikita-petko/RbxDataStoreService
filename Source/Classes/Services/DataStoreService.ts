// NOTICE Tag internal members as @internal or pull them out.

import { GlobalDataStore } from '../GlobalDataStore';
import { Globals } from '../../Util/Globals';
import { OrderedDataStore } from '../OrderedDataStore';
import { DataStoreOptions } from '../DataStoreOptions';
import {
	DYNAMIC_FASTFLAGVARIABLE,
	FASTLOG,
	FLog,
	DFFlag,
	LOGGROUP,
	FASTLOGS,
	DFInt,
	DYNAMIC_FASTINT,
} from '../../Tools/FastLogTool';
import { DataStore } from '../DataStore';
import { LuaWebService } from '../LuaWebService';
import { DataStoreListingPages as DataStoreListingPages } from '../DataStoreListingPages';
import { ApiDataStoresUrlConstruction } from '../../Constructors/ApiDataStoresUrlConstruction';
import { InputHelper } from '../../Helpers/InputHelper';
import { ErrorHelper } from '../../Helpers/ErrorHelper';
import { ErrorType } from '../../Enumeration/ErrorType';
import { Analytics } from '../../Helpers/AnalyticsHelper';

LOGGROUP('DataStore');
DYNAMIC_FASTFLAGVARIABLE('GetGlobalDataStorePcallFix', false);
DYNAMIC_FASTFLAGVARIABLE('DataStoreLostDataFixEnable', false);
DYNAMIC_FASTFLAGVARIABLE('DataStoresV2Enabled', true);
DYNAMIC_FASTFLAGVARIABLE('DataStoresV2Force', true);

DYNAMIC_FASTINT('DataStoreKeyLengthLimit');

/**
 * @internal
 */
export enum RequestType {
	GET_ASYNC = 5,
	UPDATE_ASYNC = 6,
	SET_ASYNC = 7,
	INCREMENT_ASYNC = 8,
	GET_SORTED_ASYNC_PAGE = 9,
}

type DataStores = Map<string, GlobalDataStore>;

/**
 * **DataStoreService** exposes methods for getting [GlobalDataStore](https://developer.roblox.com/en-us/api-reference/class/GlobalDataStore) and [OrderedDataStore](https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore) objects.
 * See the [Data Stores](https://developer.roblox.com/en-us/articles/Data-store) article for an in-depth guide on data structure, management, error handling, etc.
 */
export abstract class DataStoreService {
	/**
	 * @internal
	 */
	private static readonly dataStores: DataStores = new Map<string, GlobalDataStore>();
	/**
	 * @internal
	 */
	private static readonly orderedDataStores: DataStores = new Map<string, GlobalDataStore>();

	/**
	 * @internal
	 */
	public static async checkStudioApiAccess(errorFunction: (e: string) => void) {
		let lws: LuaWebService;
		if ((lws = new LuaWebService()))
			if (!(await lws.IsApiAccessEnabled())) {
				if (errorFunction) errorFunction(ErrorHelper.GetErrorMessage(ErrorType.NO_API_ACCESS_ALLOWED));
				return false;
			}
		return true;
	}

	/**
	 * @internal
	 */
	private static useNewApi(options: DataStoreOptions) {
		if (DFFlag('DataStoresV2Enabled')) {
			if (DFFlag('DataStoresV2Force')) {
				FASTLOG(FLog['DataStore'], '[FLog::DataStore] DataStoresV2Force is set, forcing new API');
				return true;
			}

			if (options instanceof DataStoreOptions) {
				const eF = options.GetExperimentalFeatures();
				const it = eF.get('v2');

				if (it && typeof it === 'boolean')
					if (it === true) {
						Analytics.GoogleAnalytics.trackEvent(
							'DataStores',
							'DataStoreRequestsThatWereOptinNewAPI',
							'',
							0,
						);
						return true;
					}
				throw new ReferenceError(`Options instance of type ${options.constructor.name} did not request v2 API`);
			} else {
				if (options !== undefined && options !== null)
					throw TypeError('Options instance not of type DataStoreOptions');
			}
		}

		return false;
	}

	/**
	 * @internal
	 */
	private static getDataStoreInternal(
		name: string,
		scope: string,
		legacy: boolean,
		ordered: boolean,
		useNewApi: boolean,
		allScopes: boolean,
	): GlobalDataStore | OrderedDataStore {
		if (Globals.PlaceID < 1) {
			if (DFFlag('GetGlobalDataStorePcallFix')) {
				throw new Error('Place has to be opened with Edit button to access DataStores');
			}
			console.error('Place has to be opened with Edit button to access DataStores');
			return process.exit(1);
		}
		if (legacy) {
			if (!this.legacyDataStore) {
				FASTLOG(FLog['DataStore'], '[FLog::DataStore] Creating legacy data store');
				this.legacyDataStore = new GlobalDataStore(name, scope, true, allScopes);
			}
			return this.legacyDataStore;
		} else if (ordered) {
			const key = `${name}-${scope}`;
			const it = this.orderedDataStores.has(key);
			if (it === false) {
				FASTLOGS(FLog['DataStore'], '[FLog::DataStore] Creating data store, name: %s', name);
				const ds = new OrderedDataStore(name, scope);
				this.orderedDataStores[key] = ds;
				return ds;
			}
			return this.orderedDataStores[key];
		} else {
			const key = `${name}-${scope}`;
			const it = this.dataStores.has(key);
			if (it === false) {
				FASTLOGS(FLog['DataStore'], '[FLog::DataStore] Creating data store, name: %s', name);
				let ds: GlobalDataStore;
				if (!useNewApi) {
					ds = new GlobalDataStore(name, scope, false, allScopes);
				} else {
					ds = new DataStore(name, scope, false, allScopes);
				}
				this.dataStores[key] = ds;
				return ds;
			}
			return this.dataStores[key];
		}
	}

	// private static msReadSuccessAverageRequestTime: UnsignedIntegerCountAverage;
	// private static msErrorAverageRequestTime: UnsignedIntegerCountAverage;
	// private static msWriteAverageRequestTime: UnsignedIntegerCountAverage;
	// private static msUpdateAverageRequestTime: UnsignedIntegerCountAverage;
	// private static msBatchAverageRequestTime: UnsignedIntegerCountAverage;
	// private static readSuccessCachedCount: number;

	/**
	 * @internal
	 */
	private static legacyDataStore: GlobalDataStore;

	// private static dataStoreJob: DataStoreJob;

	/**
	 * This function returns the default [GlobalDataStore](https://developer.roblox.com/en-us/api-reference/class/GlobalDataStore).
	 * If you want to access a specific **named** data store instead,
	 * you should use the [GetDataStore()](https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore) function.
	 * @returns {GlobalDataStore} Default [GlobalDataStore](https://developer.roblox.com/en-us/api-reference/class/GlobalDataStore) instance
	 * @unsafe For thread safety, this property is not safe to read in an unsynchronized thread.
	 */
	public static GetGlobalDataStore(): GlobalDataStore {
		return this.getDataStoreInternal('', 'u', true, false, false, false);
	}

	/**
	 * This function creates a [GlobalDataStore](https://developer.roblox.com/en-us/api-reference/class/GlobalDataStore) instance with the provided name and scope.
	 * Subsequent calls to this method with the same name/scope will return the same object.
	 *
	 * ---
	 * NOTICE
	 * --------
	 * If v2.0 experimental features are enabled, this function creates and returns a [DataStore](https://developer.roblox.com/en-us/api-reference/class/DataStore) instance instead of a [GlobalDataStore](https://developer.roblox.com/en-us/api-reference/class/GlobalDataStore) instance.
	 *
	 * ---
	 *
	 * Using the `scope` parameter will restrict operations to that scope by automatically prepending the scope to keys in all operations done on the data store. This function also accepts an optional [DataStoreOptions](https://developer.roblox.com/en-us/api-reference/class/DataStoreOptions) instance which includes options for enabling [AllScopes](https://developer.roblox.com/en-us/api-reference/property/DataStoreOptions/AllScopes|AllScopes). See [here](https://developer.roblox.com/en-us/articles/Data-store#scope) for details on scope.
	 * @param {string} name Name of the data store.
	 * @param {string=} scope (Optional) A string specifying the scope.
	 * @param {DataStoreOptions} (Optional) A [DataStoreOptions](https://developer.roblox.com/en-us/api-reference/class/DataStoreOptions) instance to enable experimental features and v2 API features.
	 * @returns {GlobalDataStore} [GlobalDataStore](https://developer.roblox.com/en-us/api-reference/class/GlobalDataStore)
	 * @unsafe For thread safety, this property is not safe to read in an unsynchronized thread.
	 */
	public static GetDataStore(
		name: string,
		scope: string = 'global',
		options: DataStoreOptions = undefined,
	): GlobalDataStore {
		InputHelper.CheckNameAndScope(name, scope, options);
		return this.getDataStoreInternal(
			name,
			scope,
			false,
			false,
			DataStoreService.useNewApi(options),
			options ? options.AllScopes : false,
		);
	}

	/**
	 * This method returns an [OrderedDataStore](https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore),
	 * similar to the way [GetDataStore()](https://developer.roblox.com/en-us/api-reference/function/DataStoreService/GetDataStore) does with [GlobalDataStores](https://developer.roblox.com/en-us/api-reference/class/GlobalDataStore).
	 * Subsequent calls to this method with the same name/scope will return the same object.
	 *
	 * @param {string} name The name of the [OrderedDataStore](https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore) you wish to get.
	 * @param {string="global"} scope The scope of the [OrderedDataStore](https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore) you wish to get, global by default
	 * @returns {OrderedDataStore} [OrderedDataStore](https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore)
	 * @unsafe For thread safety, this property is not safe to read in an unsynchronized thread.
	 */
	public static GetOrderedDataStore(name: string, scope: string = 'global'): OrderedDataStore {
		InputHelper.CheckNameAndScope(name, scope);
		return this.getDataStoreInternal(name, scope, false, true, false, false) as OrderedDataStore;
	}

	/**
	 * @internal
	 */
	public static async GetDataFromEmptyScopeDataStoreAsyncTemporary<Variant extends any>(
		name: string,
		key: string,
	): Promise<Variant | unknown> {
		return new Promise(async (resumeFunction, errorFunction) => {
			if (!DFFlag('DataStoreLostDataFixEnable')) {
				errorFunction('GetDataFromEmptyScopeDataStoreAsyncTemporary is not enabled');
				return;
			}
			if (name.length == 0) {
				errorFunction("DataStore name can't be empty string");
				return;
			}

			if (name.length > DFInt('DataStoreKeyLengthLimit')) {
				errorFunction('DataStore name is too long');
				return;
			}
			const ds = this.getDataStoreInternal(name, '', false, false, false, false);
			const value = await ds.GetAsync(key);
			resumeFunction(value);
		});
	}

	/**
	 * Returns a [DataStoreListingPages](https://developer.roblox.com/en-us/api-reference/class/DataStoreListingPages) object for enumerating through all of the experience’s data stores.
	 * It accepts an optional `prefix` parameter to only locate data stores whose names start with the provided prefix.
	 *
	 * ---
	 * NOTICE
	 * ------
	 * Only data stores containing at least one object will be listed via this function.
	 *
	 * ---
	 *
	 * SEE ALSO
	 * --------
	 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
	 * ---
	 *
	 * @param {string} prefix (Optional) Prefix to enumerate data stores that start with the given prefix.
	 * @param {number} pageSize (Optional) Number of items to be returned in each page.
	 * @returns {DataStoreListingPages} [DataStoreListingPages](https://developer.roblox.com/en-us/api-reference/class/DataStoreListingPages) instance containing (https://developer.roblox.com/en-us/api-reference/class/DataStoreInfo) instances that provide details such as name, creation time, and time last updated.
	 * @yields This is a yielding function. When called, it will pause the Javascript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 * @unsafe For thread safety, this property is not safe to read in an unsynchronized thread.
	 */
	public static async ListDataStoresAsync(prefix: string = '', pageSize: number = 0): Promise<DataStoreListingPages> {
		return new Promise(async (resumeFunction, errorFunction) => {
			if (!DFFlag('DataStoresV2Enabled')) {
				errorFunction('400: API not supported');
				return;
			}

			if (!(await DataStoreService.checkStudioApiAccess(errorFunction))) return;

			const url = ApiDataStoresUrlConstruction.constructListKeysUrl(
				undefined,
				Globals.UniverseID,
				prefix,
				pageSize,
			);

			const page = new DataStoreListingPages(this, url);
			await page
				.AdvanceToNextPageAsync()
				.then(() => resumeFunction(page))
				.catch(async (e) => {
					await Analytics.EphemeralCounter.reportCounter('DataStoreRequestsThatFailed_DataStoreService', 1);
					await Analytics.GoogleAnalytics.trackEvent(
						'DataStores',
						'FailedRequests',
						e !== undefined ? e.toString() : 'unknown',
						0,
					);
					errorFunction(e);
				});
		});
	}
}
