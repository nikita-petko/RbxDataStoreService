import Http from 'axios';
import { AxiosResponse } from 'axios';
import { GlobalDataStore } from './GlobalDataStore';
import { RequestType } from '../util/constants';
import { globals } from '../util/globals';
import { _DataStoreService } from '../Services/DataStoreService';

export class HttpRequest {
	public key: string;
	public url: string;
	public postData: string;
	public owner: GlobalDataStore;

	public async execute(_dataStoreService: _DataStoreService): Promise<AxiosResponse<any>> {
		return new Promise((resolve, reject) => {
			const http = {
				headers: {
					'Cache-Control': 'no-cache',
					Cookie: '.ROBLOSECURITY=' + globals.cookie,
					'Content-Type': 'application/x-www-form-urlencoded',
					'Roblox-Place-Id': globals.placeId.toString(),
				},
				resolveWithFullResponse: true,
				method: 'POST',
				body: this.postData === undefined || this.postData.length === 0 ? ' ' : this.postData,
			};
			Http.post(this.url, http)
				.then((res) => {
					resolve(res);
				})
				.catch((e) => {
					reject(e);
				});
		});
	}

	public requestType: RequestType;
}
