import { DFInt } from '../../util/constants';

export const checkNameAndScope = (name: string, scope: string) => {
	if (scope.length == 0) throw new Error("DataStore scope can't be empty string");
	if (scope.length > DFInt['DataStoreKeyLengthLimit']) throw new Error('DataStore scope is too long');
	if (name.length == 0) throw new Error("DataStore name can't be empty string");
	if (name.length > DFInt['DataStoreKeyLengthLimit']) throw new Error('DataStore name is too long');
};
