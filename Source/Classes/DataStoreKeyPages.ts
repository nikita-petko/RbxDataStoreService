import { RequestType } from './Services/DataStoreService';
import { HttpRequest } from './HttpRequest';
import { Pages } from './Pages';
import { ExectionHelper } from '../Helpers/ExecutionHelper';
import { DataStore } from './DataStore';
import { DataStoreKey } from './DataStoreKey';
import { ErrorHelper } from '../Helpers/ErrorHelper';
import { ErrorType } from '../Enumeration/ErrorType';

/**
 * A special type of [Pages](https://developer.roblox.com/en-us/api-reference/class/Pages) object whose pages contain [DataStoreKey](https://developer.roblox.com/en-us/api-reference/class/DataStoreKey) instances.
 * [Pages:GetCurrentPage](https://developer.roblox.com/en-us/api-reference/function/Pages/GetCurrentPage) can be used to retrieve an array of the [DataStoreKey](https://developer.roblox.com/en-us/api-reference/class/DataStoreKey) instances.
 *
 * ---
 * SEE ALSO
 * --------
 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
 *
 * ---
 */
export class DataStoreKeyPages extends Pages {
	/**
	 * @internal
	 */
	constructor(ds: DataStore, requestUrl: string) {
		super();
		this.ds = ds;
		this.requestUrl = requestUrl;
		this.exclusiveStartKey = '';
	}
	/**
	 * @internal
	 */
	private readonly ds: DataStore;
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
		return new Promise((resumeFunction, errorFunction) => {
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
					const [success, result] = DataStore.deserializeVariant(r.data);

					if (!success) return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.CANNOT_PARSE_RESPONSE));

					const keys = result['keys'];
					if (keys === undefined)
						return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_DATASTORE_RESPONSE));

					const newValue: DataStoreKey[] = [];
					for (let i = 0; i < keys.length; i++) {
						newValue.push(new DataStoreKey(keys[i]));
					}
					this.exclusiveStartKey = result['lastReturnedKey'] || '';
					this.currentPage = newValue;
					return resumeFunction();
				})
				.catch((reason) => {
					return errorFunction(ErrorHelper.GetErrorResponseAndReturnMessage(reason));
				});
		});
	}

	/**
	 * Iterates to the next page in the pages object,
	 * if possible.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async AdvanceToNextPageAsync(): Promise<void> {
		return new Promise(async (resumeFunction, errorFunction) => {
			if (this.finished) {
				console.error('No pages to advance to');
				return resumeFunction();
			}
			await this.FetchNextChunk()
				.then(() => resumeFunction())
				.catch((ex) => errorFunction(ex));
		});
	}
}
