import { globals } from '../../util/globals';

export const isUrlEncodingDisabled = (): boolean => {
	return globals.disableUrlEncoding;
};
