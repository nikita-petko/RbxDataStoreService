import { DataStore } from './DataStore';
import { DataStorePages } from './DataStorePages';
import { globals } from '../util/globals';
import { DFInt } from '../util/constants';

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
				await pagination.FetchNextChunk();
				return resolve(pagination);
			},
		);
	}
}
