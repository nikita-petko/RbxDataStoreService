import Http, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { GlobalDataStore } from './GlobalDataStore';
import { Globals } from '../Util/Globals';
import { RequestType, DataStoreService } from './Services/DataStoreService';
import { Agent } from 'https';
import {
	DFInt,
	DFString,
	DYNAMIC_FASTINTVARIABLE,
	DYNAMIC_FASTSTRINGVARIABLE,
	FASTFLAG,
	FFlag,
} from '../Tools/FastLogTool';

FASTFLAG('Debug');
DYNAMIC_FASTINTVARIABLE('HttpRequestTimeoutMs', 2500);
DYNAMIC_FASTSTRINGVARIABLE('HttpRequestTimedOutErrorMessage', 'The request failed because it timed out.');

/**
 * @internal
 */
export class HttpRequest {
	private static _lastCsrfToken: string;

	public key: string;
	public url: string;
	public postData: string;
	public owner: GlobalDataStore;
	public method: string;
	public additionalHeaders: Record<string, string> = {};

	public doNotParse: boolean = false;

	public async execute(_dataStoreService: DataStoreService): Promise<AxiosResponse<any>> {
		return new Promise((resumeFunction, errorFunction) => {
			const http = <AxiosRequestConfig>{
				headers: {
					...Globals.GlobalHeaders(),
					...this.additionalHeaders,
				},
				transformResponse: (resp, headers) => {
					if (this.doNotParse) return resp;

					if (headers && headers['content-type'] && headers['content-type'].includes('json'))
						try {
							return JSON.parse(resp);
						} catch {
							return resp; // TODO Report an error here.
						}
					return resp;
				},
				httpsAgent: new Agent({ rejectUnauthorized: !FFlag['Debug'] }),
				timeout: DFInt('HttpRequestTimeoutMs'),
				timeoutErrorMessage: DFString('HttpRequestTimedOutErrorMessage'),
			};
			if (HttpRequest._lastCsrfToken && HttpRequest._lastCsrfToken.length > 0 && !http.headers['x-csrf-token'])
				http.headers['x-csrf-token'] = HttpRequest._lastCsrfToken;
			if (!this.method)
				Http.post(
					this.url,
					this.postData === undefined || this.postData.length === 0 ? ' ' : this.postData,
					http,
				)
					.then((res) => {
						resumeFunction(res);
					})
					.catch((e) => {
						if (e.response !== undefined) {
							if (e.response.status === 403) {
								const token = e.response.headers['x-csrf-token'];
								if (token !== undefined) {
									this.additionalHeaders['x-csrf-token'] = token;
									HttpRequest._lastCsrfToken = token;
									return resumeFunction(this.execute(_dataStoreService));
								}
							}
						}
						errorFunction(e);
					});
			else if (this.method === 'GET')
				Http.get(this.url, http)
					.then((res) => {
						resumeFunction(res);
					})
					.catch((e) => {
						errorFunction(e);
					});
			else if (this.method === 'DELETE')
				Http.delete(this.url, http)
					.then((res) => {
						resumeFunction(res);
					})
					.catch((e) => {
						errorFunction(e);
					});
		});
	}

	public requestType: RequestType;
}
