import { OrderedDataStore } from './OrderedDataStore';
import { HttpRequest } from './HttpRequest';
import { RequestType } from './Services/DataStoreService';
import { Pages } from './Pages';
import { ExectionHelper } from '../Helpers/ExecutionHelper';
import { DFFlag, DYNAMIC_FASTFLAGVARIABLE } from '../Tools/FastLogTool';
import { ErrorHelper } from '../Helpers/ErrorHelper';
import { ErrorType } from '../Enumeration/ErrorType';
import { KeyValueMapping } from '../Util/KeyValueMapping';

DYNAMIC_FASTFLAGVARIABLE('DataStoreUseNewEndpoints', true);

/**
 * A special type of [Pages](https://developer.roblox.com/en-us/api-reference/class/Pages) object whose pages contain key/value pairs from an [OrderedDataStore](https://developer.roblox.com/en-us/api-reference/class/OrderedDataStore).
 * For this object, [GetCurrentPage()](https://developer.roblox.com/en-us/api-reference/function/Pages/GetCurrentPage) returns an array of tables, each containing keys named **key** and **value**; these reflect the key/value pair data.
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
		return new Promise((resumeFunction, errorFunction) => {
			const request = new HttpRequest();
			const ods = this.ds;
			if (!ods) {
				return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.ORDERERD_DATATORE_DELETED));
			}
			request.url =
				this.exclusiveStartKey.length === 0
					? this.requestUrl
					: `${this.requestUrl.toString()}&exclusiveStartKey=${this.exclusiveStartKey.toString()}`;
			request.requestType = RequestType.GET_SORTED_ASYNC_PAGE;
			if (DFFlag('DataStoreUseNewEndpoints')) request.method = 'GET';
			request.owner = ods;
			ExectionHelper.ExecuteGetSorted(request)
				.then((r) => {
					const [success, result] = OrderedDataStore.deserializeVariant(r.data);
					if (!success) return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.CANNOT_PARSE_RESPONSE));
					let entries: any[];

					if (DFFlag('DataStoreUseNewEndpoints')) {
						entries = result['entries'];
					} else {
						entries = result['data']['Entries'];
					}

					if (!Array.isArray(entries))
						return errorFunction(
							ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_ORDERED_DATASTORE_RESPONSE),
						);

					const newValue: { Value: number; Key: string }[] = [];
					for (let i = 0; i < entries.length; i++) {
						const valueAsStr = KeyValueMapping.FetchKeyFromObjectCaseInsensitive(entries[i], 'Value');
						if (valueAsStr === undefined)
							return errorFunction(
								ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_ORDERED_DATASTORE_RESPONSE),
							);

						const [didDeserialize, value] = OrderedDataStore.deserializeVariant<number>(valueAsStr);

						if (!didDeserialize)
							return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.CANNOT_PARSE_RESPONSE));

						const target = KeyValueMapping.FetchKeyFromObjectCaseInsensitive(entries[i], 'Target');
						if (target === undefined)
							return errorFunction(
								ErrorHelper.GetErrorMessage(ErrorType.MALFORMED_ORDERED_DATASTORE_RESPONSE),
							);

						newValue.push({
							Value: value as number,
							Key: target,
						});
					}
					this.currentPage = newValue;
					if (DFFlag('DataStoreUseNewEndpoints')) {
						this.exclusiveStartKey = result['lastEvaluatedKey'] || '';
					} else {
						this.exclusiveStartKey = result['data']['ExclusiveStartKey'] || '';
					}
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
