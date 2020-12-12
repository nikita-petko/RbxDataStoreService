// Why is this called `checkAccess`?
import { DFInt } from '../../util/constants';

export const checkAccess = (key: string): [boolean, string] => {
	if (key.length === 0) return [false, "Key name can't be empty"];
	if (key.length > DFInt['DataStoreKeyLengthLimit']) return [false, 'Key name is too long'];
	return [true, ''];
};
