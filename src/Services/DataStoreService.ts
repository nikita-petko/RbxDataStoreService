// NOTICE Tag internal members as @internal or pull them out.

import { DataStores } from '../util/customTypes';
import { DataStore } from '../Classes/DataStore';
import { globals } from '../util/globals';
import { DFFlag } from '../util/constants';
import { OrderedDataStore } from '../Classes/OrderedDataStore';
import { HttpRequest } from '../Classes/HttpRequest';
import { Response } from 'request';
import { checkNameAndScope } from '../Helpers/Internal/checkNameAndScope';

// TODO: Convert this to a namespace?

export abstract class _DataStoreService {
	private static readonly dataStores: DataStores = new Map<string, DataStore>();
	private static readonly orderedDataStores: DataStores = new Map<string, DataStore>();

	private static getDataStoreInternal(
		name: string,
		scope: string,
		legacy: boolean,
		ordered: boolean,
	): DataStore | OrderedDataStore {
		if (globals.placeId === 0) {
			if (DFFlag['GetGlobalDataStorePcallFix']) {
				throw new Error('Place has to be opened with Edit button to access DataStores');
			}
			console.error('Place has to be opened with Edit button to access DataStores');
			return process.exit(1);
		}
		if (legacy) {
			if (!this.legacyDataStore) {
				this.legacyDataStore = new DataStore(name, scope, true);
			}
			return this.legacyDataStore;
		} else if (ordered) {
			const key = `${name}-${scope}`;
			const it = this.orderedDataStores.has(key);
			if (it === false) {
				const ds = new OrderedDataStore(name, scope);
				this.orderedDataStores[key] = ds;
				return ds;
			}
			return this.orderedDataStores[key];
		} else {
			const key = `${name}-${scope}`;
			const it = this.dataStores.has(key);
			if (it === false) {
				const ds = new DataStore(name, scope, false);
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

	private static legacyDataStore: DataStore;
	private static disableUrlEncoding: boolean = false;

	private static async executeRequest(request: HttpRequest): Promise<Response> {
		return await request.execute(this);
	}

	public static async executeGet(request: HttpRequest): Promise<Response> {
		return await this.executeRequest(request);
	}

	public static async executeGetSorted(request: HttpRequest): Promise<Response> {
		return await this.executeRequest(request);
	}

	public static async executeSet(request: HttpRequest): Promise<Response> {
		return await this.executeRequest(request);
	}

	public static async executeOrderedSet(request: HttpRequest): Promise<Response> {
		return await this.executeRequest(request);
	}

	// private static dataStoreJob: DataStoreJob;

	/**
	 * Returns the default data store.
	 * This function returns the default GlobalDataStore.
	 * If you want to access a specific named data store instead,
	 * you should use the GetDataStore() function.
	 */
	public static GetGlobalDataStore(): DataStore {
		return this.getDataStoreInternal('', 'u', true, false);
	}

	/**
	 * Get a GlobalDataStore given a name and optional scope.
	 * This method returns a GlobalDataStore by name/scope.
	 * Subsequent calls to this method with the same name/scope will return the same object.
	 * @param name The name of the DataStore you wish to get.
	 * @param scope The scope of the DataStore you wish to get, global by default
	 */
	public static GetDataStore(name: string, scope: string = 'global'): DataStore {
		checkNameAndScope(name, scope);
		return this.getDataStoreInternal(name, scope, false, false);
	}

	/**
	 * Get an OrderedDataStore given a name and optional scope.
	 * This method returns an OrderedDataStore,
	 * similar to the way GetDataStore() does with GlobalDataStores.
	 * Subsequent calls to this method with the same name/scope will return the same object.
	 * @param name The name of the OrderedDataStore you wish to get.
	 * @param scope The scope of the OrderedDataStore you wish to get, global by default
	 */
	public static GetOrderedDataStore(name: string, scope: string = 'global'): OrderedDataStore {
		checkNameAndScope(name, scope);
		return this.getDataStoreInternal(name, scope, false, true) as OrderedDataStore;
	}

	/**
	 * @internal
	 */
	public static isUrlEncodingDisabled(): boolean {
		return this.disableUrlEncoding;
	}

	public static setUrlEncodingDisabled(disabled: boolean): void {
		this.disableUrlEncoding = disabled;
	}
}
