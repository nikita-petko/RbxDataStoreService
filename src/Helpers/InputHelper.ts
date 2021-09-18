import { DataStoreOptions } from '../Classes/DataStoreOptions';
import { ErrorType } from '../Enumeration/ErrorType';
import { DFInt, DYNAMIC_FASTINTVARIABLE } from '../Tools/FastLogTool';
import { ErrorHelper } from './ErrorHelper';

DYNAMIC_FASTINTVARIABLE('DataStoreKeyLengthLimit', 50);

/**
 * @internal
 */
export class InputHelper {
	public static CheckNameAndScope(name: string, scope: string, options?: DataStoreOptions) {
		let allScopes = false;
		if (options) allScopes = options.AllScopes;

		if (allScopes) {
			if (scope.length > 0) throw new Error('DataStore scope should be an empty string allScopes is set to true');
		}

		if (scope.length == 0 && !allScopes) {
			throw new Error("DataStore scope can't be empty string");
		}
		if (scope.length > DFInt('DataStoreKeyLengthLimit') && !allScopes) {
			throw new Error('DataStore scope is too long');
		}
		if (name.length == 0) {
			throw new Error("DataStore name can't be empty string");
		}
		if (name.length > DFInt('DataStoreKeyLengthLimit')) throw new Error('DataStore name is too long');
	}

	public static CheckKey(key: string): [boolean, string] {
		if (key.length === 0) return [false, ErrorHelper.GetErrorMessage(ErrorType.NO_EMPTY_KEYNAME)];
		if (key.length > DFInt('DataStoreKeyLengthLimit'))
			return [false, ErrorHelper.GetErrorMessage(ErrorType.KEYNAME_TOO_LARGE)];
		return [true, ''];
	}
}
