import { RequestType, DataStoreService } from './Services/DataStoreService';
import { HttpRequest } from './HttpRequest';
import { Pages } from './Pages';
import { ExectionHelper } from '../Helpers/ExecutionHelper';
import { DataStoreInfo } from './DataStoreInfo';
import { DataStore } from './DataStore';

/**
 * A special type of [Pages](https://developer.roblox.com/en-us/api-reference/class/Pages) object whose pages contain [DataStoreInfo](https://developer.roblox.com/en-us/api-reference/class/DataStoreInfo) instances.
 * [Pages:GetCurrentPage](https://developer.roblox.com/en-us/api-reference/function/Pages/GetCurrentPage) can be used to retrieve an array of the [DataStoreInfo](https://developer.roblox.com/en-us/api-reference/class/DataStoreInfo) instances.
 *
 * ---
 * SEE ALSO
 * --------
 * - [Data Stores](https://developer.roblox.com/en-us/articles/Data-store), an in-depth guide on data structure, management, error handling, etc.
 *
 * ---
 */
export class DataStoreListingPages extends Pages {
	/**
	 * @internal
	 */
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
	protected currentPage: DataStoreInfo[];

	public GetCurrentPage(): DataStoreInfo[] {
		return this.currentPage;
	}

	/**
	 * @internal
	 */
	protected async FetchNextChunk(): Promise<void> {
		return new Promise((resumeFunction, errorFunction) => {
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
			request.method = 'GET';
			ExectionHelper.ExecuteGetSorted(request)
				.then((r) => {
					const [success, result] = DataStore.deserializeVariant(r.data);

					if (!success) return errorFunction("Can't parse response");
					const deserialized = result['datastores'].length !== 0 ? result['datastores'] : [];
					const newValue: DataStoreInfo[] = [];
					for (let i = 0; i < deserialized.length; i++) {
						newValue.push(
							new DataStoreInfo(
								new Date(deserialized[i]['createdTime']).getTime(),
								new Date(deserialized[i]['updatedTime']).getTime(),
								deserialized[i]['name'],
							),
						);
					}
					this.exclusiveStartKey = result['lastReturnedKey'] || '';
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
