import { GlobalDataStore } from './GlobalDataStore';
import { DataStorePages } from './DataStorePages';
import { Globals } from '../Util/Globals';
import { DFFlag, DFInt, DYNAMIC_FASTFLAGVARIABLE, DYNAMIC_FASTINTVARIABLE } from '../Tools/FastLogTool';
import { ErrorHelper } from '../Helpers/ErrorHelper';
import { ErrorType } from '../Enumeration/ErrorType';

DYNAMIC_FASTINTVARIABLE('DataStoreMaxPageSize', 100);
DYNAMIC_FASTFLAGVARIABLE('DataStoreUseNewEndpoints', true);

/**
 * A **OrderedDataStore** is essentially a [GlobalDataStore](https://developer.roblox.com/en-us/api-reference/class/GlobalDataStore) with the exception that stored values must be **positive integers**.
 * It exposes a method [GetSortedAsync()](https://developer.roblox.com/en-us/api-reference/function/OrderedDataStore/GetSortedAsync) which allows inspection of the entries in sorted order using a [DataStorePages](https://developer.roblox.com/en-us/api-reference/class/DataStorePages) object.
 * See the [Data Stores](https://developer.roblox.com/en-us/articles/Data-store) article for an in-depth guide on data structure, management, error handling, etc.
 */
export class OrderedDataStore extends GlobalDataStore {
	/**
	 * @internal
	 */
	constructor(name: string, scope: string) {
		super(name, scope, false, false);
	}

	/**
	 * @internal
	 */
	private constructGetSortedUrl<Variant extends any>(
		isAscending: boolean,
		pagesize: number,
		minValue?: Variant,
		maxValue?: Variant,
	): string {
		const placeId = Globals.PlaceID;
		let url = `${
			this.serviceUrl
		}getSortedValues?placeId=${placeId}&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&key=${this.nameUrlEncodedIfNeeded.toString()}&pageSize=${pagesize}&ascending=${
			isAscending ? 'True' : 'False'
		}`;
		if (minValue && typeof minValue === 'number') url += '&inclusiveMinValue=' + Math.floor(minValue).toString();
		if (maxValue && typeof maxValue === 'number') url += '&inclusiveMaxValue=' + Math.floor(maxValue).toString();
		return url.toString();
	}

	/**
	 * @internal
	 */
	private constructGetSortedV2Url<Variant extends any>(
		isAscending: boolean,
		pagesize: number,
		minValue?: Variant,
		maxValue?: Variant,
	) {
		let url = `${
			this.serviceUrl
		}${this.getDataStoreTypeString()}/list?&scope=${this.scopeUrlEncodedIfNeeded.toString()}&key=${this.nameUrlEncodedIfNeeded.toString()}&pageSize=${pagesize}&direction=${
			isAscending ? 'asc' : 'desc'
		}`;

		if (minValue && typeof minValue === 'number') url += '&minValue=' + Math.floor(minValue).toString();
		if (maxValue && typeof maxValue === 'number') url += '&maxValue=' + Math.floor(maxValue).toString();

		return url.toString();
	}

	/**
	 * @internal
	 */
	protected checkValueIsAllowed<Variant extends any>(v?: Variant): boolean {
		return typeof v === 'number';
	}

	/**
	 * @internal
	 */
	protected getDataStoreTypeString(): string {
		return 'sorted';
	}

	/**
	 * Returns a [DataStorePages](https://developer.roblox.com/en-us/api-reference/class/DataStorePages) object.
	 * The sort order is determined by **ascending**, the length of each page by **pageSize**, and **minValue**\/**maxValue** are optional parameters which filter the results.
	 *
	 * If this function throws an error, the [error message](https://developer.roblox.com/en-us/articles/Datastore-Errors) will describe the problem.
	 * @param {boolean} ascending A boolean indicating whether the returned data pages are in ascending order.
	 * @param {number} pagesize The length of each page.
	 * @param {number?} minValue Optional parameter. If set, data pages with a value less than than **minValue** will be excluded.
	 * @param {number?} maxValue Optional parameter. If set, data pages with a value greater than **maxValue** will be excluded.
	 * @returns {DataStorePages} A sorted [DataStorePages](https://developer.roblox.com/en-us/api-reference/class/DataStorePages) object based on the provided arguments.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async GetSortedAsync<Variant extends any>(
		ascending: boolean,
		pagesize: number,
		minValue?: Variant,
		maxValue?: Variant,
	): Promise<DataStorePages> {
		return new Promise(async (resumeFunction, errorFunction) => {
			if (!(minValue === undefined) && !this.checkValueIsAllowed(minValue))
				return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MAX_VAL_AND_MIN_VAL_NOT_INTEGERS));
			if (!(maxValue === undefined) && !this.checkValueIsAllowed(maxValue))
				return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.MAX_VAL_AND_MIN_VAL_NOT_INTEGERS));
			if (pagesize < 0) return errorFunction('PageSize has to be more or equal to zero');
			if (pagesize > DFInt('DataStoreMaxPageSize'))
				return errorFunction(ErrorHelper.GetErrorMessage(ErrorType.PAGE_SIZE_MUST_BE_IN_RANGE));
			const pagination: DataStorePages = new DataStorePages(
				this,
				DFFlag('DataStoreUseNewEndpoints')
					? this.constructGetSortedV2Url(ascending, pagesize, minValue, maxValue)
					: this.constructGetSortedUrl(ascending, pagesize, minValue, maxValue),
			);
			await pagination
				.AdvanceToNextPageAsync()
				.then(() => resumeFunction(pagination))
				.catch(errorFunction);
		});
	}
}
