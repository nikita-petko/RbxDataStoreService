import { DataStoreService, InitializeAsync, DataStoreOptions, DataStore2 } from '.';
import { DFLog, DYNAMIC_LOGVARIABLE, FASTLOG, FASTLOGS } from './Tools/FastLogTool';

if (process.env.SSLKEYLOGFILE) {
	const ssl = require('sslkeylog');
	ssl.hookAll();
}

// Allow DFLog::Debug to be 7 because this is a test file.
DYNAMIC_LOGVARIABLE('Debug', 7);

(async () => {
	try {
		try {
			FASTLOG(DFLog('Debug'), '[DFLog::Debug] Try authenticate the user.');
			await InitializeAsync(process.argv[2], parseInt(process.argv[3]));
		} catch (e) {
			FASTLOGS(DFLog('Debug'), '[DFLog::Debug] Authentication failed because %s, aborting.', e);
			return process.exit(1);
		}
		FASTLOG(
			DFLog('Debug'),
			'[DFLog::Debug] Attempt to DataStoreService::getDataStore(string, string) with the name of Test.',
		);

		const opts = new DataStoreOptions();
		opts.AllScopes = true;
		opts.SetExperimentalFeatures({ v2: true });

		const ds = <DataStore2>DataStoreService.GetDataStore('Test', '', opts);
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Bind a GlobalDataStore::onUpdate for the key TestKey');
		ds.OnUpdate('TestKey', (newValue) => {
			console.log(newValue);
		});

		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Get the latest version for the object global/TestKey.');
		console.log(await ds.GetVersionAsync('global/TestKey', ''));
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] List all the keys in the datastore Test/global');
		console.log((await ds.ListKeysAsync()).GetCurrentPage());
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] List all the versions for the object global/TeskKey');
		console.log((await ds.ListVersionsAsync('global/O')).GetCurrentPage());
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] List all datastores in the current experience.');
		console.log((await DataStoreService.ListDataStoresAsync()).GetCurrentPage());
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Try write a JSON object to the objectKey TestKey.');
		await ds.SetAsync('global/TestKey', { lol: 123, fuck: [1, 2, 3] });
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Try get the data in Object TestKey');
		console.log(await ds.GetAsync('global/TestKey'));
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Update the TestKey using DataStore UpdateAsync');
		await ds.UpdateAsync('global/TestKey', () => ['10', {}, []]);
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Try remove the key TestKey from the DataStore');
		await ds.RemoveAsync('global/TestKey');
		FASTLOG(DFLog('Debug'), '[DFLog::Debug] Try create the Key TT2 and increment it by 213');
		await ds.IncrementAsync('TT2', 213);
		return process.exit(0);
	} catch (e) {
		FASTLOGS(DFLog('Debug'), '[DFLog::Debug] Failed because %s, aborting.', e);
		process.exit(1);
	}
})();
