import { OrderedDataStore } from './OrderedDataStore';
import { HttpRequest } from './HttpRequest';
import { RequestType } from '../util/constants';
import { _DataStoreService } from '../Services/DataStoreService';
import { Pages } from './Pages';

/**
 * A special type of Pages object whose pages contain key/value pairs from an OrderedDataStore.
 * For this object,
 * GetCurrentPage() returns an array of tables,
 * each containing keys named key and value;
 * these reflect the key/value pair data.
 */
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
	protected async FetchNextChunk(): Promise<void> {
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
			_DataStoreService.executeGetSorted(request).then((r) => {
				const [success, result] = OrderedDataStore.deserializeVariant(r.body);
				if (!success) return reject("Can't parse response");
				const deserialized = result['data']['Entries'].length !== 0 ? result['data']['Entries'] : '[]';
				const newValue: { Value: number; Key: string }[] = [];
				for (let i = 0; i < deserialized.length; i++) {
					newValue.push({
						Value: OrderedDataStore.deserializeVariant(deserialized[i]['Value'])[1] as number,
						Key: deserialized[i]['Target'],
					});
				}
				this.currentPage = newValue;
				return resolve();
			});
		});
	}

	/**
	 * Iterates to the next page in the pages object,
	 * if possible.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async AdvanceToNextPageAsync(): Promise<void> {
		return new Promise<void>(async (resolve: (value: PromiseLike<void> | void) => void) => {
			if (this.finished) {
				console.error('No pages to advance to');
				return resolve();
			}
			await this.FetchNextChunk();
			resolve();
		});
	}
}
