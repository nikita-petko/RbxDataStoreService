import { _DataStoreService } from './src/Services/DataStoreService';

declare const _default: {
	InitializeAsync: (cookie: string, placeId: number) => Promise<void>;
	DataStoreService: typeof _DataStoreService;
};
