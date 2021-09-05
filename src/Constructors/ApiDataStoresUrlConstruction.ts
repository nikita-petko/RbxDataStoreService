import { SortDirection } from '../Enumeration/SortDirection';
import { UrlHelper } from '../Tools/UrlTool';

/**
 * @internal
 */
export class ApiDataStoresUrlConstruction {
	private static setCharAt(str: string, index: number, chr: any) {
		if (index > str.length - 1) return str;
		return str.substring(0, index) + chr + str.substring(index + 1);
	}

	public static constructListKeysUrl(
		datastoreName: string,
		universeId: number,
		prefix: string,
		maxItemsToReturn: number,
	) {
		let result = '';
		let query = '';
		result = UrlHelper.BuildGenericPersistenceUrl(`v2/persistence/${universeId}/datastores`);

		if (datastoreName !== undefined) {
			result += '/objects';
			query = `&datastore=${encodeURIComponent(datastoreName)}`;
		}

		if (prefix.length > 0) {
			query += `&prefix=${encodeURIComponent(prefix)}`;
		}

		if (maxItemsToReturn > 0) {
			query += `&maxItemsToReturn=${encodeURIComponent(maxItemsToReturn)}`;
		}

		if (query.length > 0 && query[0] === '&') query = ApiDataStoresUrlConstruction.setCharAt(query, 0, '');

		result += `${query.length > 0 ? '?' : ''}${query}`;

		return result;
	}

	public static constructListVersionsUrl(
		datastoreName: string,
		universeId: number,
		objectKey: string,
		pageSize: number,
		minDate: number,
		maxDate: number,
		sortDirection: SortDirection,
	) {
		let query = '';

		if (datastoreName.length > 0) {
			query = `&datastore=${encodeURIComponent(datastoreName)}`;
		}

		if (objectKey.length > 0) {
			query += `&objectKey=${encodeURIComponent(objectKey)}`;
		}

		query += `&sortDirection=${encodeURIComponent(SortDirection[sortDirection])}`;

		if (minDate > 1) {
			query += `&startTime=${encodeURIComponent(new Date(minDate).toISOString())}`;
		}

		if (maxDate > 1) {
			query += `&endTime=${encodeURIComponent(new Date(maxDate).toISOString())}`;
		}

		if (pageSize > 0) {
			query += `&maxItemsToReturn=${encodeURIComponent(pageSize)}`;
		}

		if (query.length > 0 && query[0] === '&') query = ApiDataStoresUrlConstruction.setCharAt(query, 0, '');

		return `${UrlHelper.BuildGenericPersistenceUrl(
			`v2/persistence/${universeId}/datastores/objects/object/versions`,
		)}${query.length > 0 ? '?' : ''}${query}`;
	}

	public static constructObjectOpUrl(datastore: string, objectKey: string, universeId: number) {
		let result = '';

		result = UrlHelper.BuildGenericPersistenceUrl(`v2/persistence/${universeId}/datastores/objects/object`);

		result += `?datastore=${encodeURIComponent(datastore)}&objectKey=${encodeURIComponent(objectKey)}`;

		return result;
	}

	public static constructIncrementOpUrl(datastore: string, objectKey: string, universeId: number, delta: number) {
		let result = '';

		result = UrlHelper.BuildGenericPersistenceUrl(
			`v2/persistence/${universeId}/datastores/objects/object/increment`,
		);

		result += `?datastore=${encodeURIComponent(datastore)}&objectKey=${encodeURIComponent(
			objectKey,
		)}&incrementBy=${delta}`;

		return result;
	}

	public static constructVersionOpUrl(datastore: string, objectKey: string, universeId: number, version: string) {
		let result = ApiDataStoresUrlConstruction.constructObjectOpUrl(datastore, objectKey, universeId);

		result += `&version=${encodeURIComponent(version)}`;

		return result;
	}
}
