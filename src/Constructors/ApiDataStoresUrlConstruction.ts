import { BaseURL, UrlHelper } from '../Tools/UrlTool';

export class ApiDataStoresUrlConstruction {
	public static constructListKeysUrl(
		datastoreName: string,
		universeId: number,
		prefix: string,
		maxItemsToReturn: number,
	) {
		let result = '';
		let query = '';
		if (prefix.length >= 0) {
			query = `&prefix=${prefix}`;
		}

		if (maxItemsToReturn >= 1) {
			query += `&maxItemsToReturn=${maxItemsToReturn}`;
		}

		result = ApiDataStoresUrlConstruction.BuildGenericPersistenceUrl(`v2/persistence/${universeId}/datastores`);

		if (datastoreName !== undefined) {
			result += '/objects';
		}

		result += `?${query}${datastoreName !== undefined ? `&datastore=${datastoreName}` : ''}`;

		return result;
	}

	public static BuildGenericPersistenceUrl(servicePath: string) {
		return BaseURL.ConstructServicePathFromHost(
			UrlHelper.GetRobloxGamePersistenceHost(),
			servicePath + '/',
			null,
			true,
			false,
		);
	}
}
