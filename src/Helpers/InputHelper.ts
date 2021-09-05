import { DFInt, DYNAMIC_FASTINTVARIABLE } from '../Tools/FastLogTool';

DYNAMIC_FASTINTVARIABLE('DataStoreKeyLengthLimit', 50);

/**
 * @internal
 */
export class InputHelper {
	public static CheckNameAndScope(name: string, scope: string) {
		if (scope.length == 0) throw new Error("DataStore scope can't be empty string");
		if (scope.length > DFInt('DataStoreKeyLengthLimit')) throw new Error('DataStore scope is too long');
		if (name.length == 0) throw new Error("DataStore name can't be empty string");
		if (name.length > DFInt('DataStoreKeyLengthLimit')) throw new Error('DataStore name is too long');
	}

	public static CheckKey(key: string): [boolean, string] {
		if (key.length === 0) return [false, "Key name can't be empty"];
		if (key.length > DFInt('DataStoreKeyLengthLimit')) return [false, 'Key name is too long'];
		return [true, ''];
	}
}
