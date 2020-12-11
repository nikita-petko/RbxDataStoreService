/* 
	FileName: index.ts
	Written By: Nikita Nikolaevich Petko, - nikita-mfd
	File Type: Module
	Description: The main file to implement DataStoreService as a NodeJS.

	TODO Push each and every one of these to a module.

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
// import { IncomingMessage as Response } from 'http';
import r from 'request-promise';
import { Response } from 'request';
// NOTICE Of removing backendProcessing,
// throttleCounterGets,
// throttleCounterGetSorted,
// throttleCounterSets,
// throttleCounterOrderedSets,
// throttledGets,
// throttledGetSorted,
// throttledSets,
// throttledOrderedSets

// NOTICE The source on execute{METHOD} in the source was merely to get it's ParentDataStoreService,
// but as there is only one DataStoreService we can just use the global.

const DFFlag = {
	UseNewDataStoreRequestSetTimestampBehaviour: false,
	GetGlobalDataStorePcallFix: false,
};
const DFInt = {
	DataStoreMaxValueSize: 64 * 1024,
	DataStoreMaxPageSize: 100,
	DataStoreKeyLengthLimit: 50,
};

const globals = {
	cookie: '',
	placeId: 0,
};
const cookieWarningCapture: RegExp = /_\|WARNING:-DO-NOT-SHARE-THIS\.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items\.\|_/;

const checkNameAndScope = (name: string, scope: string) => {
	if (scope.length == 0) throw new Error("DataStore scope can't be empty string");
	if (scope.length > DFInt['DataStoreKeyLengthLimit']) throw new Error('DataStore scope is too long');
	if (name.length == 0) throw new Error("DataStore name can't be empty string");
	if (name.length > DFInt['DataStoreKeyLengthLimit']) throw new Error('DataStore name is too long');
};

// Why is this called `checkAccess`?
const checkAccess = (key: string): [boolean, string] => {
	if (key.length === 0) return [false, "Key name can't be empty"];
	if (key.length > DFInt['DataStoreKeyLengthLimit']) return [false, 'Key name is too long'];
	return [true, ''];
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
type DataStores = Map<string, DataStore>;
export abstract class DataStoreService {
	private static readonly dataStores: DataStores;
	private static readonly orderedDataStores: DataStores;
	private static getDataStoreInternal(name: string, scope: string, legacy: boolean, ordered: boolean): DataStore {
		if (globals.placeId === 0) {
			if (DFFlag['GetGlobalDataStorePcallFix']) {
				throw new Error('Place has to be opened with Edit button to access DataStores');
			}
			process.stderr.write('Place has to be opened with Edit button to access DataStores');
			return;
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
	private static disableUrlEncoding: boolean;

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

	public static GetGlobalDataStore(): DataStore {
		return this.getDataStoreInternal('', 'u', true, false);
	}
	public static GetDataStore(name: string, scope: string = 'global'): DataStore {
		checkNameAndScope(name, scope);
		return this.getDataStoreInternal(name, scope, false, false);
	}
	public static GetOrderedDataStore(name: string, scope: string = 'global'): DataStore {
		checkNameAndScope(name, scope);
		return this.getDataStoreInternal(name, scope, false, true);
	}
	public static isUrlEncodingDisabled(): boolean {
		return this.disableUrlEncoding;
	}
	public static setUrlEncodingDisabled(disabled: boolean): void {
		this.disableUrlEncoding = disabled;
	}
}
class DataStore {
	constructor(name: string, scope: string /*= 'global'*/, legacy: boolean) {
		this.isLegacy = legacy;
		this.name = name;
		this.scope = scope;
		this.nameUrlEncodedIfNeeded = this.urlEncodeIfNeeded(name);
		this.scopeUrlEncodedIfNeeded = this.urlEncodeIfNeeded(scope);
	}
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
	private createFetchNewKeyRequest(key: string, request: HttpRequest): void {
		request.url = this.constructGetUrl();
		request.postData = this.constructPostDataForKey(key);
		request.owner = this;
	}
	private serializeVariant<Variant extends any>(variant: Variant): [boolean, string] {
		let hasNonJsonType = false;
		let result: string;
		try {
			result = JSON.stringify(variant);
		} catch {
			hasNonJsonType = true;
		}
		return [hasNonJsonType, result];
	}
	private deserializeVariant<Variant extends any>(webValue: string): [boolean, Variant] {
		let result: Variant;
		if (webValue.length === 0) return [true, result];
		try {
			result = JSON.parse(webValue);
		} catch {
			return [false, result];
		}
		if ((result as Map<string, unknown>).has('data')) return [false, result];
		return [true, result];
	}

	// private runTransformFunction(key: string, transformFunc: <Variant>(previousValue: Variant) => Variant): void {}

	protected serviceUrl: string;
	protected name: string;
	protected scope: string;
	protected scopeUrlEncodedIfNeeded: string;
	protected nameUrlEncodedIfNeeded: string;
	protected checkValueIsAllowed<Variant extends any>(v?: Variant): boolean {
		const [success] = this.serializeVariant(v);
		if (!success) return false;
		return true;
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

	public GetAsync<Variant extends any>(key: string): Promise<Variant | unknown> {
		return new Promise<Variant | unknown>(
			(
				resolve: (value: Variant | PromiseLike<Variant | unknown> | unknown) => void,
				reject: (reason?: any) => void,
			) => {
				const [success, message] = checkAccess(key);
				if (!success) return reject(message);

				const request = new HttpRequest();
				this.createFetchNewKeyRequest(key, request);
				request.requestType = RequestType.GET_ASYNC;
				DataStoreService.executeGet(request)
					.then((r) => {
						const [success, result] = this.deserializeVariant(r.body);
						if (!success) return reject("Can't parse response");
						const [success2, deserialized] = this.deserializeVariant(result['data'][0]['Value']);
						if (!success2) return reject("Can't parse value");
						return resolve(deserialized);
					})
					.catch((reason) => {
						return reject(reason);
					});
			},
		);
	}
	public SetAsync<Variant extends any>(key: string, value: Variant): Promise<void> {
		return new Promise<void>(
			(resolve: (value: PromiseLike<void> | void) => void, reject: (reason?: any) => void) => {
				const [success, message] = checkAccess(key);
				if (!success) return reject(message);
				if (!this.checkValueIsAllowed(value)) return reject(`${typeof value} is not allowed in DataStore`);
				const [success2, v] = this.serializeVariant(value);
				if (!success2) return reject(`${typeof value} is not allowed in DataStore`);
				if (v.length > DFInt['DataStoreMaxValueSize']) return reject('Value is too large');
				const request = new HttpRequest();
				request.url = this.constructSetUrl(key, v.length);
				request.owner = this;
				request.key = key;
				request.requestType = RequestType.SET_ASYNC;
				request.postData = `value=${this.urlEncodeIfNeeded(value.toString())}`.toString();
				DataStoreService.executeSet(request)
					.then((r) => {
						const [success, res] = this.deserializeVariant(r.body);
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
	public IncrementAsync(key: string, delta: number): Promise<void> {
		return new Promise<void>(
			(resolve: (value: PromiseLike<void> | void) => void, reject: (reason?: any) => void) => {
				const [success, message] = checkAccess(key);
				if (!success) return reject(message);
				const request = new HttpRequest();
				request.url = this.constructIncrementUrl(key, delta);
				request.owner = this;
				request.key = key;
				request.requestType = RequestType.INCREMENT_ASYNC;
				DataStoreService.executeSet(request)
					.then((r) => {
						const [success, res] = this.deserializeVariant(r.body);
						if (!success) return reject("Can't parse response");
						if (!res['data'])
							return reject('Unable to increment key as it may be anything other than a number');
						resolve();
					})
					.catch((reason) => {
						return reject(reason);
					});
			},
		);
	}
}
class OrderedDataStore extends DataStore {
	constructor(name: string, scope: string) {
		super(name, scope, false);
	}
}

class HttpRequest {
	public key: string;
	public url: string;
	public postData: string;
	public owner: DataStore;
	public async execute(dataStoreService: DataStoreService): Promise<Response> {
		return new Promise((resolve, reject) => {
			const http = {
				Headers: {
					'Cache-Control': 'no-cache',
					Cookie: '.ROBLOSECURITY=' + globals.cookie,
					'Content-Type': 'application/x-www-form-urlencoded',
					'Roblox-Place-Id': globals.placeId,
				},
				resolveWithFullResponse: true,
				method: 'POST',
				body: this.postData.length === 0 ? ' ' : this.postData,
			};
			r.post(this.url, http, (error, response, body) => {})
				.then((res: Response) => {
					resolve(res);
				})
				.catch((e) => {
					reject(e);
				});
		});
	}
	public requestType: RequestType;
}

// class UnsignedIntegerCountAverage {
// 	public constructor() {
// 		this.count = 0;
// 		this.average = 0;
// 	}
// 	public count: number;
// 	public average: number;
// 	public incrementValueAverage(value: number) {
// 		if (this.count === 0) {
// 			this.count = 1;
// 			this.average = value;
// 		} else {
// 			this.average -= (this.average / this.count);
// 			this.average += (value / this.count);
// 			this.count = this.count + 1;
// 		}
// 	}
// }

// 	class EventSlot {
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

// class DataStoreJob {}
