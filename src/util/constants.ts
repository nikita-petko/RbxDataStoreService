export const cookieWarningCapture: RegExp = /_\|WARNING:-DO-NOT-SHARE-THIS\.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items\.\|_/;

export enum RequestType {
	GET_ASYNC = 5,
	UPDATE_ASYNC = 6,
	SET_ASYNC = 7,
	INCREMENT_ASYNC = 8,
	GET_SORTED_ASYNC_PAGE = 9,
}

export const DFFlag = {
	UseNewDataStoreRequestSetTimestampBehaviour: false,
	GetGlobalDataStorePcallFix: false,
	UseUnstableDevGetAsyncUrl: false,
};
export const DFInt = {
	DataStoreMaxValueSize: 64 * 1024,
	DataStoreMaxPageSize: 100,
	DataStoreKeyLengthLimit: 50,
};
