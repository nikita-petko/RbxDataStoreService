import { RequestType, DataStoreService } from './Services/DataStoreService';
import { HttpRequest } from './HttpRequest';
import { Pages } from './Pages';
import { ExectionHelper } from '../Helpers/ExecutionHelper';

export class DataStoreEnumerationPages extends Pages {
	constructor(dss: DataStoreService, requestUrl: string) {
		super();
		this.dss = dss;
		this.requestUrl = requestUrl;
		this.exclusiveStartKey = '';
	}
	/**
	 * @internal
	 */
	private readonly dss: DataStoreService;
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
	protected async FetchNextChunk(): Promise<void> {
		return new Promise<void>((resumeFunction, errorFunction) => {
			const request = new HttpRequest();
			const dss = this.dss;
			if (!dss) {
				return errorFunction('DataStoreService no longer exists');
			}
			request.url =
				this.exclusiveStartKey.length === 0
					? this.requestUrl
					: `${this.requestUrl.toString()}&exclusiveStartKey=${this.exclusiveStartKey.toString()}`;
			request.requestType = RequestType.GET_SORTED_ASYNC_PAGE;
			ExectionHelper.ExecuteGetSorted(request).then((r) => {});
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
