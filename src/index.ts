/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-namespace */
import r from 'request-promise';
import dns from 'dns';
const baseUrl = 'https://{subDomain}.roblox.com/{resource}';
const apis = {
	gamepersistence: baseUrl.replace('{subDomain}', 'gamepersistence'),
};
const endpoints = {
	get: apis.gamepersistence.replace('{resource}', 'persistence/getV2'),
	set: apis.gamepersistence.replace('{resource}', 'persistence/set'),
};

const getIPFromDnsAsync = (DomainName: string): Promise<string> => {
	return new Promise((resolve, reject) => {
		dns.lookup(DomainName, 0, (err, result) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(result);
		});
	});
};

const initConnectionWithGP = async (domain: string) => {
	console.warn('* Verbose flag set');
	console.log(`* Trying ${await getIPFromDnsAsync(domain.replace('https://', ''))} at port (442)...`);
	r({ url: domain })
		.then(async () => {
			console.info(
				`* Connected to ${domain.replace('https://', '')} (${await getIPFromDnsAsync(
					domain.replace('https://', ''),
				)}) port 443 (#0)`,
			);
			console.info('* ALPN, offering http/1.1');
			console.info(
				'* successfully set certificate verify locations:\n*   CAfile: C:/Program Files/Git/mingw64/ssl/certs/ca-bundle.crt\n CApath: none',
			);
			console.info(
				`* TLSv1.3 (OUT), TLS handshake, Client hello (1):\n* TLSv1.3 (IN), TLS handshake, Server hello (2):\n* TLSv1.3 (IN), TLS handshake, Encrypted Extensions (8):\n* TLSv1.3 (IN), TLS handshake, Certificate (11):\n* TLSv1.3 (IN), TLS handshake, CERT verify (15):\n* TLSv1.3 (IN), TLS handshake, Finished (20):n* TLSv1.3 (OUT), TLS change cipher, Change cipher spec (1):\n* TLSv1.3 (OUT), TLS handshake, Finished (20):\n* SSL connection using TLSv1.3 / TLS_AES_128_GCM_SHA256\n* ALPN, server accepted to use h2\n* Server certificate:\n*  subject: OU=Domain Control Validated; CN=*.roblox.com\n*  start date: Jun 26 19:07:18 2019 GMT\n*  expire date: Jun 26 19:07:18 2021 GMT\n*  subjectAltName: host "gamepersistence.roblox.com" matched cert's "*.roblox.com"\n*  issuer: C=US; ST=Arizona; L=Scottsdale; O=GoDaddy.com, Inc.; OU=http://certs.godaddy.com/repository/; CN=Go Daddy Secure Certificate Authority - G2\n*  SSL certificate verify ok.\n* Using HTTP2, server supports multi-use\n* Connection state changed (HTTP/2 confirmed)\n* Copying HTTP/2 data in stream buffer to connection buffer after upgrade: len=0\n* Using Stream ID: 1 (easy handle 0x25801d0)`,
			);
		})
		.catch((v) => {
			console.warn('* ' + v);
			console.warn('* Closing connection 0');
			throw '';
		});
};

export namespace DataStoreService {
	export class DataStore {
		private _key = '';
		private _cookie = '';
		private _placeId = -1;
		private _verb = false;
		private _scope = '';
		/**
		 *
		 * @param {number=} DataStoreName The name of youe datastore, like the `Key` of `DataStoreService::GetDataStore(string Key)`
		 * @param opts Options to use, if verboseSession is set, then you'll have a very
		 * @suppress {opts} because {opts} is not sufficiently constrained.
		 * @closurePrimitive {asserts.truthy}
		 */
		public constructor(
			DataStoreName: string,
			opts: { cookie: string; placeId: number; verboseSession?: boolean; Scope?: string },
		) {
			this._key = DataStoreName;
			this._cookie = opts.cookie;
			this._placeId = opts.placeId;
			this._verb = opts.verboseSession;
			this._scope = opts.Scope;
		}
		public GetAsync = async (Target: string): Promise<never> => {
			return new Promise(async (resolve, reject) => {
				if (this._verb) {
					await initConnectionWithGP(apis.gamepersistence.replace('/{resource}', ''));
					r({
						uri: endpoints.get + `?type=standard`,
						method: 'POST',
						form: `&qkeys[0].scope=${this._scope || 'global'}&qkeys[0].target=${Target}&&qkeys[0].key=${
							this._key
						}`,
						headers: { 'Roblox-Place-Id': this._placeId, Cookie: '.ROBLOSECURITY=_||_' + this._cookie },
						resolveWithFullResponse: true,
						withCredentials: true,
					})
						.then((v) => {
							console.info(
								`> POST /persistence/getV2?type=standard HTTP/2\n> Host: gamepersistence.roblox.com\n> User-Agent: mfd\n> Accept: */*\n> Content-Type: application/x-www-form-urlencoded\n> Connection: keep-alive\n> \n> &qkeys[0].scope=${
									this._scope || 'global'
								}&qkeys[0].target=${Target}&&qkeys[0].key=${this._key}`,
							);
							const x = JSON.parse(v.body);

							if (x.data) if ((x.data as []).length === 0) return reject('The key requested is null.');
							console.info(`< HTTP/2 ${v.statusCode}`);
							Object.keys(v.headers).forEach((value) => console.info(`< ${value}: ${v.headers[value]}`));
							console.info(`${v.body}* Connection #0 to host gamepersistence.roblox.com left intact`);
							return resolve(x.data[0].Value);
						})
						.catch((v) => reject(JSON.parse(v.error).errors[0].message));
				} else {
					r({
						uri: endpoints.get + `?type=standard`,
						method: 'POST',
						form: `&qkeys[0].scope=${this._scope || 'global'}&qkeys[0].target=${Target}&&qkeys[0].key=${
							this._key
						}`,
						headers: { 'Roblox-Place-Id': this._placeId, Cookie: '.ROBLOSECURITY=_||_' + this._cookie },
						resolveWithFullResponse: true,
					})
						.then((v) => {
							const x = JSON.parse(v.body);
							return resolve(x.data[0] ? x.data[0].Value : undefined);
						})
						.catch((v) => {
							reject(JSON.parse(v.error).errors[0].message);
						});
				}
			});
		};
		public SetAsync = async (Target: string, Value: unknown): Promise<never> => {
			return new Promise(async (resolve, reject) => {
				if (this._verb) {
					await initConnectionWithGP(apis.gamepersistence.replace('/{resource}', ''));
					r({
						uri:
							endpoints.set +
							`?type=standard&scope=${this._scope || 'global'}&key=${
								this._key
							}&target=${Target}&valueLength=${(Value as string).toString().length}`,
						method: 'POST',
						form: `&value=${Value}`,
						headers: { 'Roblox-Place-Id': this._placeId, Cookie: '.ROBLOSECURITY=_||_' + this._cookie },
						resolveWithFullResponse: true,
					})
						.then((v) => {
							console.info(
								`> POST /persistence/set?type=standard&scope=${this._scope || 'global'}&key=${
									this._key
								}&target=${Target}&valueLength=${
									(Value as string).toString().length
								} HTTP/2\n> Host: gamepersistence.roblox.com\n> User-Agent: mfd\n> Accept: */*\n> Content-Type: application/x-www-form-urlencoded\n> Connection: keep-alive\n> \n> &value=${Value}`,
							);
							const x = JSON.parse(v.body);
							console.info(
								`* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):\n* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):\n* old SSL session ID is stale, removing\n* Connection state changed (MAX_CONCURRENT_STREAMS == 100)!`,
							);
							console.info(`< HTTP/2 ${v.statusCode}`);
							Object.keys(v.headers).forEach((value) => console.info(`< ${value}: ${v.headers[value]}`));
							console.info(`${v.body}* Connection #0 to host gamepersistence.roblox.com left intact`);
							return resolve(x.data);
						})
						.catch((v) => {
							console.log(v);
							setTimeout(() => {}, 10000);
							reject(JSON.parse(v.error).errors[0].message);
						});
				} else {
					r({
						uri:
							endpoints.set +
							`?type=standard&scope=${this._scope || 'global'}&key=${
								this._key
							}&target=${Target}&valueLength=${(Value as string).toString().length}`,
						method: 'POST',
						form: `&value=${Value}`,
						headers: { 'Roblox-Place-Id': this._placeId, Cookie: '.ROBLOSECURITY=_||_' + this._cookie },
						resolveWithFullResponse: true,
					})
						.then((v) => {
							const x = JSON.parse(v.body);
							return resolve(x.data);
						})
						.catch((v) => {
							reject(JSON.parse(v.error).errors[0].message);
						});
				}
			});
		};
	}
}
