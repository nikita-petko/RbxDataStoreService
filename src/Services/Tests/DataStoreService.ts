import { DataStore } from '../../Classes/DataStore';
import { checkNameAndScope } from '../../Helpers/Internal/checkNameAndScope';
import { getDataStoreInternal } from '../../Helpers/Internal/getDataStoreInternal';

export namespace DataStoreService {
	export const GetDataStore = (name: string, scope: string = 'global'): DataStore => {
		checkNameAndScope(name, scope);
		return getDataStoreInternal(name, scope, false, false);
	};
	export const GetGlobalDataStore = (): DataStore => {
		return getDataStoreInternal('', 'u', true, false);
	};
	export const GetOrderedDataStore = (name: string, scope: string = 'global'): DataStore => {
		checkNameAndScope(name, scope);
		return getDataStoreInternal(name, scope, false, true);
	};
}
