import { GlobalDataStore } from '../../Classes/GlobalDataStore';
import { checkNameAndScope } from '../../Helpers/Internal/checkNameAndScope';
import { getDataStoreInternal } from '../../Helpers/Internal/getDataStoreInternal';

export namespace DataStoreService {
	export const GetDataStore = (name: string, scope: string = 'global'): GlobalDataStore => {
		checkNameAndScope(name, scope);
		return getDataStoreInternal(name, scope, false, false);
	};
	export const GetGlobalDataStore = (): GlobalDataStore => {
		return getDataStoreInternal('', 'u', true, false);
	};
	export const GetOrderedDataStore = (name: string, scope: string = 'global'): GlobalDataStore => {
		checkNameAndScope(name, scope);
		return getDataStoreInternal(name, scope, false, true);
	};
}
