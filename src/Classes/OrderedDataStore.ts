import { DataStore } from './DataStore';
import { DataStorePages } from './DataStorePages';
import { globals } from '../util/globals';
import { DFInt } from '../util/constants';

/**
 * A OrderedDataStore is essentially a GlobalDataStore with the exception that stored values must be positive integers.
 * It exposes a method GetSortedAsync() which allows inspection of the entries in sorted order using a DataStorePages object.
 * See the Data Stores article for an overview on using ordered data stores.
 */
export class OrderedDataStore extends DataStore {
	constructor(name: string, scope: string) {
		super(name, scope, false);
	}

	private constructGetSortedUrl<Variant extends any>(
		isAscending: boolean,
		pagesize: number,
		minValue?: Variant,
		maxValue?: Variant,
	): string {
		const placeId = globals.placeId;
		let url = `${
			this.serviceUrl
		}getSortedValues?placeId=${placeId}&type=${this.getDataStoreTypeString()}&scope=${this.scopeUrlEncodedIfNeeded.toString()}&key=${this.nameUrlEncodedIfNeeded.toString()}&pageSize=${pagesize}&ascending=${
			isAscending ? 'True' : 'False'
		}`;
		if (minValue && typeof minValue === 'number') url += '&inclusiveMinValue=' + Math.floor(minValue).toString();
		if (maxValue && typeof maxValue === 'number') url += '&inclusiveMaxValue=' + Math.floor(maxValue).toString();
		return url.toString();
	}

	protected checkValueIsAllowed<Variant extends any>(v?: Variant): boolean {
		return typeof v === 'number';
	}

	protected getDataStoreTypeString(): string {
		return 'sorted';
	}

	/**
	 * Returns a DataStorePages object.
	 * The sort order is determined by ascending,
	 * the length of each page by pageSize,
	 * and minValue/maxValue are optional parameters which filter the results.
	 * If this function throws an error,
	 * the error message will describe the problem.
	 * @param isAscending A boolean indicating whether the returned data pages are in ascending order.
	 * @param pagesize The length of each page.
	 * @param minValue Optional parameter. If set, data pages with a value less than than minValue will be excluded.
	 * @param maxValue Optional parameter. If set, data pages with a value greater than maxValue will be excluded.
	 * @yields This is a yielding function. When called, it will pause the JavaScript thread that called the function until a result is ready to be returned, without interrupting other scripts.
	 */
	public async GetSortedAsync<Variant extends any>(
		isAscending: boolean,
		pagesize: number,
		minValue?: Variant,
		maxValue?: Variant,
	): Promise<DataStorePages> {
		return new Promise<DataStorePages>(
			async (resolve: (value: PromiseLike<DataStorePages> | DataStorePages) => void, reject) => {
				if (!(minValue === undefined) && !this.checkValueIsAllowed(minValue))
					return reject('MinValue has to be integer or undefined');
				if (!(maxValue === undefined) && !this.checkValueIsAllowed(maxValue))
					return reject('MaxValue has to be integer or undefined');
				if (pagesize < 0) return reject('PageSize has to be more or equal to zero');
				if (pagesize > DFInt['DataStoreMaxPageSize']) return reject('PageSize is too large');
				const url: string = this.constructGetSortedUrl(isAscending, pagesize, minValue, maxValue);
				const pagination: DataStorePages = new DataStorePages(this, url);
				await pagination.AdvanceToNextPageAsync();
				return resolve(pagination);
			},
		);
	}
}
