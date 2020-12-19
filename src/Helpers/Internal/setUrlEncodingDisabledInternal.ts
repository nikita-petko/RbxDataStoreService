import { globals } from '../../util/globals';

export const setUrlEncodingDisabled = (disabled: boolean): void => {
	globals.disableUrlEncoding = disabled;
};
