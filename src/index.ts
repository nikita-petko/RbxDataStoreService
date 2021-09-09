export { SortDirection } from './Enumeration/SortDirection';
import { AuthenticationHelper } from './Helpers/AuthenticationHelper';

export { DataStoreService } from './Classes/Services/DataStoreService';
export { DataStoreOptions } from './Classes/DataStoreOptions';
export { GlobalDataStore as DataStore } from './Classes/GlobalDataStore';
export { DataStore as DataStore2 } from './Classes/DataStore';
export { OrderedDataStore } from './Classes/OrderedDataStore';

/**
 * Initializes the global cookie and place id, and tries to validate:
 * 1. The validity of the cookie.
 * 2. The ownership of the user to the place.
 * @param {string} cookie The cookie to use, must include the warning text.
 * @param {number} placeID The place ID to use, the user that is dependent on the cookie must have edit permissions for this place.
 */
export const InitializeAsync = AuthenticationHelper.InitAuthenticatedUser;
