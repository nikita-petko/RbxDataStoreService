/* 
	FileName: index.ts
	Written By: Nikita Nikolaevich Petko, - nikita-mfd
	File Type: Module
	Description: The main file to implement DataStoreService as a NodeJS.
	
	***

	Copyright 2015-2020 MFD

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.

	***
*/
import { IncomingMessage as Response } from 'http';
import r from 'request-promise';
// NOTICE Of removing backendProcessing,
// throttleCounterGets,
// throttleCounterGetSorted,
// throttleCounterSets,
// throttleCounterOrderedSets,
// throttledGets,
// throttledGetSorted,
// throttledSets,
// throttledOrderedSets

const globals = {
	cookie: '',
	placeId: 0,
};
const cookieWarningCapture: RegExp = /_\|WARNING:-DO-NOT-SHARE-THIS\.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items\.\|_/;

const checkNameAndScope = (name: string, scope: string) => {
	if (scope.length == 0) throw new Error("DataStore scope can't be empty string");

	if (scope.length > 50) throw new Error('DataStore scope is too long');

	if (name.length == 0) throw new Error("DataStore name can't be empty string");

	if (name.length > 50) throw new Error('DataStore name is too long');
};

const checkCookieAndPlaceIdInternalAsync = (cookie: string, placeId: number): Promise<void> => {
	return new Promise((resolve: (value: PromiseLike<void> | void) => void, reject: (reason?: any) => void) => {
		if (cookie.length === 0) return reject("Cookie name can't be empty");
		if (placeId < 1) return reject('The placeId is required to at least be >1');
		if (!cookie.match(cookieWarningCapture))
			return reject("Cookie isn't valid, it requires the warning text to persistent");
		r('https://users.roblox.com/v1/users/authenticated', {
			method: 'GET',
			headers: { Cookie: '.ROBLOSECURITY=' + cookie },
			resolveWithFullResponse: true,
		})
			.catch((err) => {
				if (err.statusCode === 401) return reject("Cookie isn't valid, it threw a 401");
				else return reject(err.message);
			})
			.then(() => resolve());
	});
};

export const init = async (cookie: string, placeId: number) => {
	await checkCookieAndPlaceIdInternalAsync(cookie, placeId);
	globals.cookie = cookie;
	globals.placeId = placeId;
	// console.log(globals);
};

enum RequestType {
	GET_ASYNC = 5,
	UPDATE_ASYNC = 6,
	SET_ASYNC = 7,
	INCREMENT_ASYNC = 8,
	GET_SORTED_ASYNC_PAGE = 9,
}
enum RefetchState {
	RefetchOnUpdateKeys,
	RefetchCachedKeys,
	RefetchDone,
}
type DataStores = Map<string, DataStore>;
type CachedKeys = Map<string, CachedRecord>;
type KeyTimestamps = Map<string, number>;
export abstract class DataStoreService {
	public static readonly HttpRequest = class {
		public key: string;
		public url: string;
		public postData: string;
		public owner: DataStore;
		public execute(dataStoreService: DataStoreService): void {
			const http = {
				Headers: {
					'Cache-Control': 'no-cache',
					Cookie: '.ROBLOSECURITY=' + globals.cookie,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				resolveWithFullResponse: true,
				method: 'POST',
				body: this.postData.length === 0 ? ' ' : this.postData,
			};
			r.post(this.url, http).then((res: Response) => {});
		}
		public requestType: RequestType;
	};
	private static readonly dataStores: DataStores;
	private static readonly orderedDataStores: DataStores;
	private static getDataStoreInternal(name: string, scope: string, legacy: boolean, ordered: boolean): DataStore {
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

	private static legacyDataStore: DataStore;
	// private static disableUrlEncoding: boolean;

	// private static dataStoreJob: DataStoreJob;

	public static GetDataStore(name: string, scope: string = 'global'): DataStore {
		checkNameAndScope(name, scope);
		return this.getDataStoreInternal(name, scope, false, false);
	}
	public static GetOrderedDataStore(name: string, scope: string = 'global'): DataStore {
		checkNameAndScope(name, scope);
		return this.getDataStoreInternal(name, scope, false, true);
	}
}
class DataStore {
	constructor(name: string, scope: string /*= 'global'*/, legacy: boolean) {}
	// private readonly EventSlot = class {
	// 	public callback: (...args: any[]) => any;
	// 	public constructor(callback: (...args: any[]) => any) {
	// 		this.callback = callback;
	// 	}
	// 	public fire<Variant extends any>(value: Variant): void {
	// 		if (typeof value === 'undefined') return;
	// 		try {
	// 			this.callback(value);
	// 		} catch (error) {
	// 			// TODO: Disconnect?
	// 			process.stderr.write(error.message);
	// 		}
	// 	}
	// };
	private isLegacy: boolean = false;
	private cachedKeys: CachedKeys;
	private lastSetByKey: KeyTimestamps;
	private refetchState: RefetchState;
	private nextKeyToRefetch: string;
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

	protected serviceUrl: string;
	protected name: string;
	protected scope: string;
	protected scopeUrlEncodedIfNeeded: string;
	protected nameUrlEncodedIfNeeded: string;
	protected checkValueIsAllowed<T>(v?: T): boolean {
		return true;
	}
	protected getDataStoreTypeString(): string {
		return 'standard';
	}

	protected urlEncodeIfNeeded(input: string): string {
		return encodeURIComponent(input);
	}
}
class OrderedDataStore extends DataStore {
	constructor(name: string, scope: string) {
		super(name, scope, false);
	}
}
class CachedRecord {
	private variant: unknown;
	private serialized: string;
	private accessTimeStamp: number;
	public constructor() {}
	public getVariant<Variant extends any>(touch: boolean /*= true*/): Variant {
		if (touch) this.accessTimeStamp = Date.now();
		return this.variant as Variant;
	}
	public getSerialized(): string {
		return this.serialized;
	}
	public getTime(): number {
		return this.accessTimeStamp;
	}
	public update<Variant extends any>(variant: Variant, serialized: string): void {
		this.variant = variant as Variant;
		this.serialized = serialized;
	}
}
// class DataStoreJob {}
