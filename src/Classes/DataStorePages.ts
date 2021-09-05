import { OrderedDataStore } from './OrderedDataStore';
import { HttpRequest } from './HttpRequest';
import { RequestType } from './Services/DataStoreService';
import { Pages } from './Pages';
import { ExectionHelper } from '../Helpers/ExecutionHelper';
import { DFFlag, DYNAMIC_FASTFLAGVARIABLE } from '../Tools/FastLogTool';

DYNAMIC_FASTFLAGVARIABLE('DataStoreUseNewEndpoints', true);

/**
 * A special type of Pages object whose pages contain key/value pairs from an OrderedDataStore.
 * For this object,
 * GetCurrentPage() returns an array of tables,
 * each containing keys named key and value;
 * these reflect the key/value pair data.
 */
export class DataStorePages extends Pages {
	/**
	 * @internal
	 */
	constructor(ds: OrderedDataStore, requestUrl: string) {
		super();
		this.ds = ds;
		this.requestUrl = requestUrl;
		this.exclusiveStartKey = '';
	}
	/**
	 * @internal
	 */
	private readonly ds: OrderedDataStore;
	/**
	 * @internal
	 */
	private readonly requestUrl: string;
	/**
	 * @internal
	 */
	private exclusiveStartKey: string;

	/**
	 * @internal
	 */
	protected currentPage: { Value: number; Key: string }[];

	public GetCurrentPage(): { Value: number; Key: string }[] {
		return this.currentPage;
	}

	/**
	 * @internal
	 */
	protected async FetchNextChunk(): Promise<void> {
		return new Promise<void>((resumeFunction, errorFunction) => {
			const request = new HttpRequest();
			const ods = this.ds;
			if (!ods) {
				return errorFunction('OrderedDataStore no longer exists');
			}
			request.url =
				this.exclusiveStartKey.length === 0
					? this.requestUrl
					: `${this.requestUrl.toString()}&exclusiveStartKey=${this.exclusiveStartKey.toString()}`;
			request.requestType = RequestType.GET_SORTED_ASYNC_PAGE;
			request.owner = ods;
			ExectionHelper.ExecuteGetSorted(request)
				.then((r) => {
					const [success, result] = OrderedDataStore.deserializeVariant(r.data);
					if (!success) return errorFunction("Can't parse response");
					let deserialized;

					if (DFFlag('DataStoreUseNewEndpoints')) {
						deserialized = result['entries'].length !== 0 ? result['entries'] : [];
					} else {
						deserialized = result['data']['Entries'].length !== 0 ? result['data']['Entries'] : [];
					}

					const newValue: { Value: number; Key: string }[] = [];
					for (let i = 0; i < deserialized.length; i++) {
						newValue.push({
							Value: OrderedDataStore.deserializeVariant(deserialized[i]['Value'])[1] as number,
							Key: deserialized[i]['Target'],
						});
					}
					this.currentPage = newValue;
					if (DFFlag('DataStoreUseNewEndpoints')) {
						this.exclusiveStartKey = result['lastEvaluatedKey'];
					} else {
						this.exclusiveStartKey = result['data']['ExclusiveStartKey'];
					}
					return resumeFunction();
				})
				.catch((reason) => {
					return errorFunction(reason);
				});
		});
	}

	/**
	 * Iterates to the next page in the pages object,
	 * if possible.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async AdvanceToNextPageAsync(): Promise<void> {
		return new Promise<void>(async (resumeFunction: (value: PromiseLike<void> | void) => void) => {
			if (this.finished) {
				console.error('No pages to advance to');
				return resumeFunction();
			}
			await this.FetchNextChunk();
			resumeFunction();
		});
	}
}
