import { HttpRequest } from './HttpRequest';
import { checkAccess } from '../Helpers/Internal/checkAccess';
import { DFInt, RequestType } from '../util/constants';
import { globals } from '../util/globals';
import { BuildGenericPersistenceUrl } from '../Helpers/Internal/BuildGenericPersistenceUrl';
import { executeGet } from '../Helpers/Internal/executeGetInternal';
import { executeSet } from '../Helpers/Internal/executeSetInternal';

export class DataStore {
	constructor(name: string, scope: string /*= 'global'*/, legacy: boolean) {
		this.isLegacy = legacy;
		this.name = name;
		this.scope = scope;
		this.nameUrlEncodedIfNeeded = this.urlEncodeIfNeeded(name);
		this.scopeUrlEncodedIfNeeded = this.urlEncodeIfNeeded(scope);
		this.serviceUrl = BuildGenericPersistenceUrl(DataStore.urlApiPath());
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
					try {
						console.log(res['data'].length, res['data'], res['data'][0]);
						result = transformFunc(
							res['data'].length === 0
								? undefined
								: (DataStore.deserializeVariant(res['data'][0]['Value'])[1] as Variant),
						);
					} catch (e) {
						reject(e);
					}
					if (result === undefined || (result as Map<string, unknown>).size === 0 || result === null) {
						return reject('Transform function returned nil, update is cancelled');
					}
					// console.log(result);
					if (!this.checkValueIsAllowed(result))
						return reject(`${typeof result} is not allowed in DataStore`);

					const [success2, newValue] = DataStore.serializeVariant(result);
					if (!success2) return reject(`${typeof result} is not allowed in DataStore`);
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
					executeSet(request)
						.then((r2) => {
							const [success, res] = DataStore.deserializeVariant(r2.body);
							if (!success) return reject("Can't parse response");
							if (!res['data'])
								return reject(
									"The response didn't contain the data, therefore a shallow fail was performed",
								);
							const final = DataStore.deserializeVariant<Variant>(res['data'])[1];
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

	public async GetAsync<Variant extends any>(key: string): Promise<Variant | unknown> {
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
				executeGet(request)
					.then((r) => {
						const [success, result] = DataStore.deserializeVariant(r.body);
						if (!success) return reject("Can't parse response");
						const [success2, deserialized] = DataStore.deserializeVariant(result['data'][0]['Value']);
						if (!success2) return reject("Can't parse value");
						return resolve(deserialized);
					})
					.catch((reason) => {
						return reject(reason);
					});
			},
		);
	}

	public async SetAsync<Variant extends any>(key: string, value: Variant): Promise<void> {
		return new Promise<void>(
			(resolve: (value: PromiseLike<void> | void) => void, reject: (reason?: any) => void) => {
				const [success, message] = checkAccess(key);
				if (!success) return reject(message);
				if (!this.checkValueIsAllowed(value)) return reject(`${typeof value} is not allowed in DataStore`);
				const [success2, v] = DataStore.serializeVariant(value);
				if (!success2) return reject(`${typeof value} is not allowed in DataStore`);
				if (v.length > DFInt['DataStoreMaxValueSize']) return reject('Value is too large');
				const request = new HttpRequest();
				request.url = this.constructSetUrl(key, v.length);
				request.owner = this;
				request.key = key;
				request.requestType = RequestType.SET_ASYNC;
				request.postData = `value=${this.urlEncodeIfNeeded(value.toString())}`.toString();
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

	public async IncrementAsync(key: string, delta: number): Promise<void> {
		return new Promise<void>(
			(resolve: (value: PromiseLike<void> | void) => void, reject: (reason?: any) => void) => {
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
						resolve();
					})
					.catch((reason) => {
						return reject(reason);
					});
			},
		);
	}

	public async UpdateAsync<Variant extends any>(
		key: string,
		transformFunc: (previousValue: Variant) => Variant,
	): Promise<Variant> {
		return new Promise<Variant>(
			async (resolve: (value: PromiseLike<Variant> | Variant) => void, reject: (reason?: any) => void) => {
				const [success, message] = checkAccess(key);
				if (!success) return reject(message);
				const result = await this.runTransformFunction(key, transformFunc);
				resolve(result);
			},
		);
	}

	public async RemoveAsync(key: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
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
					console.log(res);
					resolve();
				})
				.catch((e) => {
					return reject(e);
				});
		});
	}
}
