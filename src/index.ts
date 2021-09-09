export { SortDirection } from './Enumeration/SortDirection';
import { AuthenticationHelper } from './Helpers/AuthenticationHelper';

export { DataStoreService } from './Classes/Services/DataStoreService';
export { DataStoreOptions } from './Classes/DataStoreOptions';
export { GlobalDataStore as DataStore } from './Classes/GlobalDataStore';
export { DataStore as DataStore2 } from './Classes/DataStore';
export { OrderedDataStore } from './Classes/OrderedDataStore';

export const InitializeAsync = AuthenticationHelper.InitAuthenticatedUser;
