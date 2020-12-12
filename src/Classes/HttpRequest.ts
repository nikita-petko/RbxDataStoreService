import { Response } from 'request';
import r from 'request-promise';
import { DataStore } from './DataStore';
import { RequestType } from '../util/constants';
import { globals } from '../util/globals';
import { DataStoreService } from '../Services/DataStoreService';

export class HttpRequest {
	public key: string;
	public url: string;
	public postData: string;
	public owner: DataStore;

	public async execute(_dataStoreService: DataStoreService): Promise<Response> {
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
			r.post(this.url, http)
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
