import { ErrorType } from '../Enumeration/ErrorType';
import { DFInt, DYNAMIC_FASTINT } from '../Tools/FastLogTool';
import { format } from 'util';
import { AxiosResponse } from 'axios';

DYNAMIC_FASTINT('DataStoreKeyLengthLimit');
DYNAMIC_FASTINT('DataStoreMaxMetadataSize');
DYNAMIC_FASTINT('DataStoreMaxUserIdsLimit');

/**
 * @internal
 */
export class ErrorHelper {
	public static GetErrorMessage(type: ErrorType, arg: any = undefined) {
		switch (type) {
			case ErrorType.NO_EMPTY_KEYNAME:
				return "101: Key name can't be empty.";
			case ErrorType.KEYNAME_TOO_LARGE:
				return `102: Key name exceeds the ${DFInt('DataStoreKeyLengthLimit')} character limit.`;
			case ErrorType.DATA_NOT_ALLOWED_IN_DATASTORE:
				return format('103: %s is not allowed in DataStore.', arg);
			case ErrorType.CANNOT_STORE_DATA_IN_DATASTORE:
				return format('104: Cannot store %s in DataStore', arg);
			case ErrorType.VALUE_TOO_LARGE:
				return '105: Serialized value converted byte size exeeds max size 64*1024 bytes.';
			case ErrorType.MAX_VAL_AND_MIN_VAL_NOT_INTEGERS:
				return '106: MaxValue and MinValue must be integers.';
			case ErrorType.PAGE_SIZE_MUST_BE_IN_RANGE:
				return '106: PageSize must be within predefined range.';
			case ErrorType.NO_API_ACCESS_ALLOWED:
				return `403: Cannot write to DataStore from Studio if API access is not enabled.`;
			case ErrorType.ORDERERD_DATATORE_DELETED:
				return '404: OrderedDataStore does not exists.';
			case ErrorType.CANNOT_PARSE_RESPONSE:
				return "501: Can't parse response, data may be corrupted.";
			case ErrorType.API_SERVICES_REJECTED:
				return format('502: API Services rejected request with error. %s', arg);
			case ErrorType.KEY_NOT_FOUND:
				return '503: DataStore Request successful, but key not found.';
			case ErrorType.MALFORMED_DATASTORE_RESPONSE:
				return '504: DataStore Request successful, but the response was not formatted correctly.';
			case ErrorType.MALFORMED_ORDERED_DATASTORE_RESPONSE:
				return '505: OrderedDataStore Request successful, but the response was not formatted correctly.';
			case ErrorType.METADATA_TOO_LARGE:
				return `Metadata attribute size exceeds ${DFInt('DataStoreMaxMetadataSize')} bytes limit.`;
			case ErrorType.USERID_LIMIT_TOO_LARGE:
				return `UserID size exceeds limit of ${DFInt('DataStoreMaxUserIdsLimit')}.`;
			case ErrorType.USERID_ATTRIBUTE_INVALID:
				return `Attribute userId format invalid.`;
			case ErrorType.METATADA_ATTRIBUTE_INVALID:
				return 'Attribute metadata format is invalid.';
		}
	}

	public static GetErrorResponseAndReturnMessage(error: any) {
		if (error.response !== undefined) {
			const response = <AxiosResponse>error.response;
			let data = response.data;
			if (!(data instanceof Object)) data = JSON.parse(data);

			if (data['error'] !== undefined)
				return ErrorHelper.GetErrorMessage(ErrorType.API_SERVICES_REJECTED, `Reason: ${data.error}`);

			const errors = data['errors'];

			if (Array.isArray(errors) && errors.length > 0) {
				return ErrorHelper.GetErrorMessage(
					ErrorType.API_SERVICES_REJECTED,
					`Error code: ${errors[0].code} Reason: ${errors[0].message}`,
				);
			}
		}
		return ErrorHelper.GetErrorMessage(ErrorType.API_SERVICES_REJECTED, 'Unknown response from API Services.');
	}
}
