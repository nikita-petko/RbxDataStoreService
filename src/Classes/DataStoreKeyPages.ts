import { RequestType } from './Services/DataStoreService';
import { HttpRequest } from './HttpRequest';
import { Pages } from './Pages';
import { ExectionHelper } from '../Helpers/ExecutionHelper';
import { DataStore2 } from './DataStore2';
import { DataStoreKey } from './DataStoreKey';

export class DataStoreKeyPages extends Pages {
	/**
	 * @internal
	 */
	constructor(ds: DataStore2, requestUrl: string) {
		super();
		this.ds = ds;
		this.requestUrl = requestUrl;
		this.exclusiveStartKey = '';
	}
	/**
	 * @internal
	 */
	private readonly ds: DataStore2;
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
	protected currentPage: DataStoreKey[];

	public GetCurrentPage(): DataStoreKey[] {
		return this.currentPage;
	}

	/**
	 * @internal
	 */
	protected async FetchNextChunk(): Promise<void> {
		return new Promise<void>((resumeFunction, errorFunction) => {
			const request = new HttpRequest();
			const ds = this.ds;
			if (!ds) {
				return errorFunction('DataStore no longer exists');
			}
			request.url =
				this.exclusiveStartKey.length === 0
					? this.requestUrl
					: `${this.requestUrl.toString()}&exclusiveStartKey=${this.exclusiveStartKey.toString()}`;
			request.requestType = RequestType.GET_SORTED_ASYNC_PAGE;
			request.method = 'GET';
			ExectionHelper.ExecuteGetSorted(request)
				.then((r) => {
					const [success, result] = DataStore2.deserializeVariant(r.data);

					if (!success) return errorFunction("Can't parse response");
					const deserialized = result['keys'].length !== 0 ? result['keys'] : [];
					const newValue: DataStoreKey[] = [];
					for (let i = 0; i < deserialized.length; i++) {
						newValue.push(new DataStoreKey(deserialized[i]));
					}
					this.exclusiveStartKey = result['lastReturnedKey'];
					this.currentPage = newValue;
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