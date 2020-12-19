import { DataStore } from '../../Classes/DataStore';
import { globals } from '../../util/globals';
import { DFFlag } from '../../util/constants';
import { OrderedDataStore } from '../../Classes/OrderedDataStore';
import { DataStores } from '../../util/customTypes';

let legacyDataStore: DataStore;
const dataStores: DataStores = new Map<string, DataStore>();
const orderedDataStores: DataStores = new Map<string, DataStore>();

export const getDataStoreInternal = (name: string, scope: string, legacy: boolean, ordered: boolean): DataStore => {
	if (globals.placeId === 0) {
		if (DFFlag['GetGlobalDataStorePcallFix']) {
			throw new Error('Place has to be opened with Edit button to access DataStores');
		}
		console.error('Place has to be opened with Edit button to access DataStores');
		return process.exit(1);
	}
	if (legacy) {
		if (!legacyDataStore) {
			legacyDataStore = new DataStore(name, scope, true);
		}
		return legacyDataStore;
	} else if (ordered) {
		const key = `${name}-${scope}`;
		const it = orderedDataStores.has(key);
		if (it === false) {
			const ds = new OrderedDataStore(name, scope);
			orderedDataStores[key] = ds;
			return ds;
		}
		return orderedDataStores[key];
	} else {
		const key = `${name}-${scope}`;
		const it = dataStores.has(key);
		if (it === false) {
			const ds = new DataStore(name, scope, false);
			dataStores[key] = ds;
			return ds;
		}
		return dataStores[key];
	}
};
