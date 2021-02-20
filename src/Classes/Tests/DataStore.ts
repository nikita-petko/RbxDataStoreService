import { GlobalDataStore } from '../GlobalDataStore';

export class DataStore extends GlobalDataStore {
	constructor(name: string, scope: string, legacy: boolean) {
		super(name, scope, legacy);
	}
}
