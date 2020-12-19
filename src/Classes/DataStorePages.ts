import { OrderedDataStore } from './OrderedDataStore';
import { HttpRequest } from './HttpRequest';
import { RequestType } from '../util/constants';
import { DataStoreService } from '../Services/DataStoreService';
import { Pages } from './Pages';

export class DataStorePages extends Pages {
	constructor(ds: OrderedDataStore, requestUrl: string) {
		super();
		this.ds = ds;
		this.requestUrl = requestUrl;
		this.exclusiveStartKey = '';
	}
	private readonly ds: OrderedDataStore;
	private readonly requestUrl: string;
	private exclusiveStartKey: string;
	public async FetchNextChunk(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const request = new HttpRequest();
			const ods = this.ds;
			if (!ods) {
				return reject('OrderedDataStore no longer exists');
			}
			request.url =
				this.exclusiveStartKey.length === 0
					? this.requestUrl
					: `${this.requestUrl.toString()}&exclusiveStartKey=${this.exclusiveStartKey.toString()}`;
			request.requestType = RequestType.GET_SORTED_ASYNC_PAGE;
			request.owner = ods;
			DataStoreService.executeGetSorted(request).then((r) => {
				const [success, result] = OrderedDataStore.deserializeVariant(r.body);
				if (!success) return reject("Can't parse response");
				const [success2, deserialized] = OrderedDataStore.deserializeVariant(
					result['data']['Entries'].length !== 0 ? result['data'][0]['Value'] : '{}',
				);
				if (!success2) return reject("Can't parse value");
				this.currentPage = deserialized;
				return resolve();
			});
		});
	}
}
