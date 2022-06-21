/*
   Copyright 2022 Nikita Petko <petko@vmminfra.net>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/*
    File Name: roblox_url_constructor.spec.ts
    Description: Roblox URL Constructor Test Specification
    Written by: Nikita Petko
*/

import robloxUrlConstructor, { RobloxEnvironmentType, RobloxPlatformType } from '../lib/roblox_url_constructor';

describe('Roblox URL Constructor', () => {
  beforeAll(() => {
    process.env.DEFAULT_PRODUCTION_BASE_URL = 'https://www.foo.com';
    process.env.DEFAULT_STAGING_BASE_URL = 'https://www.bar.com';
    process.env.DEFAULT_DEVELOPMENT_BASE_URL = 'https://www.baz.com';
    process.env.DEFAULT_INTEGRATION_BASE_URL = 'https://www.qux.com';
  });

  afterAll(() => {
    delete process.env.DEFAULT_PRODUCTION_BASE_URL;
    delete process.env.DEFAULT_STAGING_BASE_URL;
    delete process.env.DEFAULT_DEVELOPMENT_BASE_URL;
    delete process.env.DEFAULT_INTEGRATION_BASE_URL;
  });

  describe('getBaseServiceUrl', () => {
    it('should throw if the platform is not specified', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrl(undefined as unknown as RobloxPlatformType, 'foo-service'),
      ).toThrow();
    });

    it('should throw if the service name is not specified', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, undefined as unknown as string),
      ).toThrow();
    });

    it('should throw if the service name is not a string', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, {} as unknown as string),
      ).toThrow();
    });

    it('should throw if the service name is empty', () => {
      expect(() => robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, '')).toThrow();
    });

    it('should throw if the service name is longer than 255 characters', () => {
      expect(() => robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, 'a'.repeat(256))).toThrow();
    });

    it('should throw if the insecure flag is not undefined or null', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', null as unknown as boolean),
      ).toThrow();
    });

    it('should throw if the insecure flag is not a boolean', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', 'foo' as unknown as boolean),
      ).toThrow();
    });

    it('should throw if the hostname is specified but is not a string', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          false,
          123 as unknown as string,
        ),
      ).toThrow();
    });

    it('should throw if the hostname is specified but is empty', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', false, ''),
      ).toThrow();
    });

    it('should throw if the platform is an unknown platform', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrl('foo-platform' as unknown as RobloxPlatformType, 'foo-service', false),
      ).toThrow();
    });

    it('should throw if the service name does not match /^[a-zA-Z0-9-_]+$/', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service-with-a-dash_#####'),
      ).toThrow();
    });

    it('should return the production base URL as a BEDEV1 ApiSite if it is specified as BEDEV1', () => {
      expect(robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', false)).toEqual(
        'https://foo-service.foo.com/',
      );

      expect(robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', true)).toEqual(
        'http://foo-service.foo.com/',
      );
    });

    it('should return the other base URL as a BEDEV1 ApiSite if it is specified as BEDEV1 and hostname is specified', () => {
      expect(
        robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', false, 'bar.com'),
      ).toEqual('https://foo-service.bar.com/');

      expect(robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', true, 'bar.com')).toEqual(
        'http://foo-service.bar.com/',
      );
    });

    it('should return the production base URL as a BEDEV2 Service if it is specified as BEDEV2', () => {
      expect(robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV2, 'foo-service', false)).toEqual(
        'https://apis.foo.com/foo-service/',
      );

      expect(robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV2, 'foo-service', true)).toEqual(
        'http://apis.foo.com/foo-service/',
      );
    });

    it('should return the production base URL as a BEDEV2 Service if it is specified as BEDEV2 and hostname is specified', () => {
      expect(
        robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV2, 'foo-service', false, 'apis.bar.com'),
      ).toEqual('https://apis.bar.com/foo-service/');

      expect(robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV2, 'foo-service', true, 'apis.bar.com')).toEqual(
        'http://apis.bar.com/foo-service/',
      );
    });

    it('should use secure protocol by default if the insecure flag is not specified', () => {
      expect(robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service')).toEqual(
        'https://foo-service.foo.com/',
      );

      expect(robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV2, 'foo-service')).toEqual(
        'https://apis.foo.com/foo-service/',
      );
    });

    it('should use use normal hostname if it is just 2 segments', () => {
      process.env.DEFAULT_PRODUCTION_BASE_URL = 'https://foo.com';

      expect(robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', false)).toEqual(
        'https://foo-service.foo.com/',
      );

      expect(robloxUrlConstructor.getBaseServiceUrl(RobloxPlatformType.BEDEV2, 'foo-service', false)).toEqual(
        'https://apis.foo.com/foo-service/',
      );

      process.env.DEFAULT_PRODUCTION_BASE_URL = 'https://www.foo.com';
    });
  });

  describe('getBaseServiceUrlByEnvironment', () => {
    it('should throw if the platform is not specified', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(undefined as unknown as RobloxPlatformType, 'foo-service'),
      ).toThrow();
    });

    it('should throw if the service name is not specified', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(RobloxPlatformType.BEDEV1, undefined as unknown as string),
      ).toThrow();
    });

    it('should throw if the service name is not a string', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(RobloxPlatformType.BEDEV1, {} as unknown as string),
      ).toThrow();
    });

    it('should throw if the service name is empty', () => {
      expect(() => robloxUrlConstructor.getBaseServiceUrlByEnvironment(RobloxPlatformType.BEDEV1, '')).toThrow();
    });

    it('should throw if the service name is longer than 255 characters', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(RobloxPlatformType.BEDEV1, 'a'.repeat(256)),
      ).toThrow();
    });

    it('should throw if the rblxEnvironment is not specified', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          null as unknown as RobloxEnvironmentType,
        ),
      ).toThrow();
    });

    it('should throw if the insecure flag is not undefined or null', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          null as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if the insecure flag is not a boolean', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          'foo' as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if the hostname is specified but is not a string', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          false,
          123 as unknown as string,
        ),
      ).toThrow();
    });

    it('should throw if the hostname is specified but is empty', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          false,
          '',
        ),
      ).toThrow();
    });

    it('should throw if the platform is an unknown platform', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          'foo-platform' as unknown as RobloxPlatformType,
          'foo-service',
          RobloxEnvironmentType.Production,
          false,
        ),
      ).toThrow();
    });

    it('should throw if the service name does not match /^[a-zA-Z0-9-_]+$/', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(RobloxPlatformType.BEDEV1, 'foo-service-with-a-dash_#####'),
      ).toThrow();
    });

    it('should throw if the rblxEnvironment is an unknown environment', () => {
      expect(() =>
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          'foo-environment' as unknown as RobloxEnvironmentType,
          false,
        ),
      ).toThrow();
    });

    it('should return the production base URL as a BEDEV1 ApiSite if it is specified as BEDEV1', () => {
      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          false,
        ),
      ).toEqual('https://foo-service.foo.com/');

      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          true,
        ),
      ).toEqual('http://foo-service.foo.com/');
    });

    it('should return the staging base URL as a BEDEV1 ApiSite if it is specified as BEDEV1 and staging environment is specified', () => {
      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Staging,
          false,
        ),
      ).toEqual('https://foo-service.bar.com/');

      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Staging,
          true,
        ),
      ).toEqual('http://foo-service.bar.com/');
    });

    it('should return the other base URL as a BEDEV1 ApiSite if it is specified as BEDEV1 and hostname is specified', () => {
      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          false,
          'baz.com',
        ),
      ).toEqual('https://foo-service.baz.com/');

      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          true,
          'baz.com',
        ),
      ).toEqual('http://foo-service.baz.com/');
    });

    it('should return the production base URL as a BEDEV2 Service if it is specified as BEDEV2', () => {
      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV2,
          'foo-service',
          RobloxEnvironmentType.Production,
          false,
        ),
      ).toEqual('https://apis.foo.com/foo-service/');

      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV2,
          'foo-service',
          RobloxEnvironmentType.Production,
          true,
        ),
      ).toEqual('http://apis.foo.com/foo-service/');
    });

    it('should return the staging base URL as a BEDEV2 Service if it is specified as BEDEV2 and staging environment is specified', () => {
      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV2,
          'foo-service',
          RobloxEnvironmentType.Staging,
          false,
        ),
      ).toEqual('https://apis.bar.com/foo-service/');

      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV2,
          'foo-service',
          RobloxEnvironmentType.Staging,
          true,
        ),
      ).toEqual('http://apis.bar.com/foo-service/');
    });

    it('should return the production base URL as a BEDEV2 Service if it is specified as BEDEV2 and hostname is specified', () => {
      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV2,
          'foo-service',
          RobloxEnvironmentType.Production,
          false,
          'apis.baz.com',
        ),
      ).toEqual('https://apis.baz.com/foo-service/');

      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV2,
          'foo-service',
          RobloxEnvironmentType.Production,
          true,
          'apis.baz.com',
        ),
      ).toEqual('http://apis.baz.com/foo-service/');
    });

    it('should use a secure protocol by default if the insecure flag is not specified', () => {
      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
        ),
      ).toEqual('https://foo-service.foo.com/');

      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Staging,
        ),
      ).toEqual('https://foo-service.bar.com/');
    });

    it('should get a base URL for the other environments', () => {
      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Development,
        ),
      ).toEqual('https://foo-service.baz.com/');

      expect(
        robloxUrlConstructor.getBaseServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Integration,
        ),
      ).toEqual('https://foo-service.qux.com/');
    });
  });

  describe('constructServiceUrl', () => {
    it('should throw if the platform is not specified', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(undefined as unknown as RobloxPlatformType, 'foo-service', '/blah'),
      ).toThrow();
    });

    it('should throw if the service name is not specified', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(RobloxPlatformType.BEDEV1, undefined as unknown as string, '/blah'),
      ).toThrow();
    });

    it('should throw if the service name is not a string', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(RobloxPlatformType.BEDEV1, {} as unknown as string, '/blah'),
      ).toThrow();
    });

    it('should throw if the service name is empty', () => {
      expect(() => robloxUrlConstructor.constructServiceUrl(RobloxPlatformType.BEDEV1, '', '/blah')).toThrow();
    });

    it('should throw if the service name is longer than 255 characters', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(RobloxPlatformType.BEDEV1, 'a'.repeat(256), '/blah'),
      ).toThrow();
    });

    it('should throw if the service name does not match /^[a-zA-Z0-9-_]+$/', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service+#####', '/blah'),
      ).toThrow();
    });

    it('should throw if the hostname is specified and not a string', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          true,
          true,
          false,
          {},
          123 as unknown as string,
        ),
      ).toThrow();
    });

    it('should throw if the hostname is specified and empty', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          true,
          true,
          false,
          {},
          '',
        ),
      ).toThrow();
    });

    it('should throw if trimLeadingSlash is null or undefined', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          null as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if trimLeadingSlash is not a boolean', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          'foo' as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if addTrailingSlash is null or undefined', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          true,
          null as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if addTrailingSlash is not a boolean', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          true,
          'foo' as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if insecure is null or undefined', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          true,
          true,
          null as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if insecure is not a boolean', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          true,
          true,
          'foo' as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if the path is not a string', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          {} as unknown as string,
          true,
          true,
          false,
          {},
        ),
      ).toThrow();
    });

    it('should not throw if the path is undefined, empty, or null', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          undefined as unknown as string,
          true,
          true,
          false,
          {},
        ),
      ).not.toThrow();

      expect(() =>
        robloxUrlConstructor.constructServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', '', true, true, false, {}),
      ).not.toThrow();

      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          null as unknown as string,
          true,
          true,
          false,
          {},
        ),
      ).not.toThrow();
    });

    it('should throw if the query string is not a Map or object', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          true,
          true,
          false,
          'foo' as unknown as Map<string, string>,
        ),
      ).toThrow();
    });

    it('should throw if the query string contains any values that are not strings, numbers, booleans or arrays', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', '/blah', true, true, false, {
          foo: {
            bar: 'baz',
          } as unknown as any,
        }),
      ).toThrow();

      expect(() =>
        robloxUrlConstructor.constructServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', '/blah', true, true, false, {
          foo: ['baz', {} as unknown as any],
        }),
      ).toThrow();
    });

    it('should not throw if the query string is a Map', () => {
      const map = new Map<string, string>();
      map.set('foo', 'bar');

      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          true,
          true,
          false,
          map,
        ),
      ).not.toThrow();
    });

    it('should throw if the args contains anything other than a string, number, or boolean', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          true,
          true,
          false,
          {},
          undefined,
          /abc/g as unknown as string,
        ),
      ).toThrow();
    });

    it('should throw if the platform specified is an unknown platform', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrl(
          'foo-platform' as unknown as RobloxPlatformType,
          'foo-service',
          '/blah',
          true,
          true,
          false,
          {},
        ),
      ).toThrow();
    });

    it('should trim leading slashes if trimLeadingSlash is true', () => {
      expect(
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '//blah',
          true,
          true,
          false,
          {},
        ),
      ).toEqual('https://foo-service.foo.com/blah/');
    });

    it('should not trim leading slashes if trimLeadingSlash is false', () => {
      expect(
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '//blah',
          false,
          true,
          false,
          {},
        ),
      ).toEqual('https://foo-service.foo.com///blah/');
    });

    it('should append a trailing slash if addTrailingSlash is true', () => {
      expect(
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          true,
          true,
          false,
          {},
        ),
      ).toEqual('https://foo-service.foo.com/blah/');
    });

    it('should not append a trailing slash if addTrailingSlash is false', () => {
      expect(
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah',
          true,
          false,
          false,
          {},
        ),
      ).toEqual('https://foo-service.foo.com/blah');
    });

    it('should add query string parameters if they are provided', () => {
      expect(
        robloxUrlConstructor.constructServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', '/blah', true, true, false, {
          baz: 'qux',
          foo: 'bar',
        }),
      ).toEqual('https://foo-service.foo.com/blah/?baz=qux&foo=bar');
    });

    it('should return a base url without a trailing slash if the path is empty and addTrailingSlash is false', () => {
      expect(
        robloxUrlConstructor.constructServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', '', true, false, false, {}),
      ).toEqual('https://foo-service.foo.com');
    });

    it('should replace url parameter format strings with their respected arguments', () => {
      expect(
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah/{{foo}}/{{bar}}',
          true,
          true,
          false,
          {},
          undefined,
          'baz',
          'qux',
        ),
      ).toEqual('https://foo-service.foo.com/blah/baz/qux/');
    });

    it('should replace url parameter format strings with an empty string if the argument is undefined', () => {
      expect(
        robloxUrlConstructor.constructServiceUrl(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          '/blah/{{foo}}/{{bar}}',
          true,
          true,
          false,
          {},
          undefined,
        ),
      ).toEqual('https://foo-service.foo.com/blah///');
    });

    it('should apply multiple query parameters if the query value is an array', () => {
      expect(
        robloxUrlConstructor.constructServiceUrl(RobloxPlatformType.BEDEV1, 'foo-service', '/blah', true, true, false, {
          foo: ['bar', 'baz'],
        }),
      ).toEqual('https://foo-service.foo.com/blah/?foo=bar&foo=baz');
    });
  });

  describe('constructServiceUrlByEnvironment', () => {
    it('should throw if the platform is not specified', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          undefined as unknown as RobloxPlatformType,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
        ),
      ).toThrow();
    });

    it('should throw if the service name is not specified', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          undefined as unknown as string,
          RobloxEnvironmentType.Production,
          '/blah',
        ),
      ).toThrow();
    });

    it('should throw if the service name is not a string', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          {} as unknown as string,
          RobloxEnvironmentType.Production,
          '/blah',
        ),
      ).toThrow();
    });

    it('should throw if the service name is empty', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          '',
          RobloxEnvironmentType.Production,
          '/blah',
        ),
      ).toThrow();
    });

    it('should throw if the service name is longer than 255 characters', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'a'.repeat(256),
          RobloxEnvironmentType.Production,
          '/blah',
        ),
      ).toThrow();
    });

    it('should throw if the service name does not match /^[a-zA-Z0-9-_]+$/', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service+#####',
          RobloxEnvironmentType.Production,
          '/blah',
        ),
      ).toThrow();
    });

    it('should throw if the environment is not specified', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          undefined as unknown as RobloxEnvironmentType,
          '/blah',
        ),
      ).toThrow();
    });

    it('should throw if the hostname is specified and not a string', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          {},
          123 as unknown as string,
        ),
      ).toThrow();
    });

    it('should throw if the hostname is specified and empty', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          {},
          '',
        ),
      ).toThrow();
    });

    it('should throw if trimLeadingSlash is null or undefined', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          null as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if trimLeadingSlash is not a boolean', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          'foo' as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if addTrailingSlash is null or undefined', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          null as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if addTrailingSlash is not a boolean', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          'foo' as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if insecure is null or undefined', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          null as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if insecure is not a boolean', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          'foo' as unknown as boolean,
        ),
      ).toThrow();
    });

    it('should throw if the path is not a string', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          {} as unknown as string,
          true,
          true,
          false,
          {},
        ),
      ).toThrow();
    });

    it('should not throw if the path is undefined, empty, or null', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          undefined as unknown as string,
          true,
          true,
          false,
          {},
        ),
      ).not.toThrow();

      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '',
          true,
          true,
          false,
          {},
        ),
      ).not.toThrow();

      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          null as unknown as string,
          true,
          true,
          false,
          {},
        ),
      ).not.toThrow();
    });

    it('should throw if the query string is not a Map or object', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          'foo' as unknown as Map<string, string>,
        ),
      ).toThrow();
    });

    it('should throw if the query string contains any values that are not strings, numbers, booleans or arrays', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          {
            foo: {
              bar: 'baz',
            } as unknown as any,
          },
        ),
      ).toThrow();

      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          {
            foo: ['baz', {} as unknown as any],
          },
        ),
      ).toThrow();
    });

    it('should not throw if the query string is a Map', () => {
      const map = new Map<string, string>();
      map.set('foo', 'bar');

      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          map,
        ),
      ).not.toThrow();
    });

    it('should throw if the args contains anything other than a string, number, or boolean', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          {},
          undefined,
          /abc/g as unknown as string,
        ),
      ).toThrow();
    });

    it('should throw if the platform specified is an unknown platform', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          'foo-platform' as unknown as RobloxPlatformType,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          {},
        ),
      ).toThrow();
    });

    it('should trim leading slashes if trimLeadingSlash is true', () => {
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '//blah',
          true,
          true,
          false,
          {},
        ),
      ).toEqual('https://foo-service.foo.com/blah/');
    });

    it('should not trim leading slashes if trimLeadingSlash is false', () => {
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '//blah',
          false,
          true,
          false,
          {},
        ),
      ).toEqual('https://foo-service.foo.com///blah/');
    });

    it('should append a trailing slash if addTrailingSlash is true', () => {
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          {},
        ),
      ).toEqual('https://foo-service.foo.com/blah/');
    });

    it('should not append a trailing slash if addTrailingSlash is false', () => {
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          false,
          false,
          {},
        ),
      ).toEqual('https://foo-service.foo.com/blah');
    });

    it('should add query string parameters if they are provided', () => {
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          {
            baz: 'qux',
            foo: 'bar',
          },
        ),
      ).toEqual('https://foo-service.foo.com/blah/?baz=qux&foo=bar');
    });

    it('should return a base url without a trailing slash if the path is empty and addTrailingSlash is false', () => {
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '',
          true,
          false,
          false,
          {},
        ),
      ).toEqual('https://foo-service.foo.com');
    });

    it('should replace url parameter format strings with their respected arguments', () => {
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah/{{foo}}/{{bar}}',
          true,
          true,
          false,
          {},
          undefined,
          'baz',
          'qux',
        ),
      ).toEqual('https://foo-service.foo.com/blah/baz/qux/');
    });

    it('should replace url parameter format strings with an empty string if the argument is undefined', () => {
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah/{{foo}}/{{bar}}',
          true,
          true,
          false,
          {},
          undefined,
        ),
      ).toEqual('https://foo-service.foo.com/blah///');
    });

    it('should apply multiple query parameters if the query value is an array', () => {
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          {
            foo: ['bar', 'baz'],
          },
        ),
      ).toEqual('https://foo-service.foo.com/blah/?foo=bar&foo=baz');
    });

    it('should construct environment-specific urls', () => {
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Production,
          '/blah',
          true,
          true,
          false,
          {},
        ),
      ).toEqual('https://foo-service.foo.com/blah/');
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Staging,
          '/blah',
          true,
          true,
          false,
          {},
        ),
      ).toEqual('https://foo-service.bar.com/blah/');
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Development,
          '/blah',
          true,
          true,
          false,
          {},
        ),
      ).toEqual('https://foo-service.baz.com/blah/');
      expect(
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          RobloxEnvironmentType.Integration,
          '/blah',
          true,
          true,
          false,
          {},
        ),
      ).toEqual('https://foo-service.qux.com/blah/');
    });

    it('should throw if the environment specified is an unknown environment', () => {
      expect(() =>
        robloxUrlConstructor.constructServiceUrlByEnvironment(
          RobloxPlatformType.BEDEV1,
          'foo-service',
          'foo-environment' as RobloxEnvironmentType,
          '/blah',
          true,
          true,
          false,
          {},
        ),
      ).toThrow();
    });
  });

  describe('smartConstruct', () => {
    it('should throw if the smartUrl is not specified', () => {
      expect(() => robloxUrlConstructor.smartConstruct(undefined as unknown as string)).toThrow();
    });

    it('should throw if the smartUrl is not a string', () => {
      expect(() => robloxUrlConstructor.smartConstruct(123 as unknown as string)).toThrow();
    });

    it('should throw if the smartUrl is empty', () => {
      expect(() => robloxUrlConstructor.smartConstruct('')).toThrow();
    });

    it('should throw if the smartUrl does not start with an opening curly brace', () => {
      expect(() => robloxUrlConstructor.smartConstruct('/blah')).toThrow();
    });

    it('should throw if the smartUrl does not include at least one closing curly brace', () => {
      expect(() => robloxUrlConstructor.smartConstruct('{arrrrr')).toThrow();
    });

    it('should throw if the query string is not a Map or object', () => {
      expect(() =>
        robloxUrlConstructor.smartConstruct('{bedev1:foo-service}', 'foo' as unknown as Map<string, string>),
      ).toThrow();
    });

    it('should throw if the query string contains any values that are not strings, numbers, booleans or arrays', () => {
      expect(() =>
        robloxUrlConstructor.smartConstruct('{bedev1:foo-service}', {
          foo: {
            bar: 'baz',
          },
        }),
      ).toThrow();

      expect(() =>
        robloxUrlConstructor.smartConstruct('{bedev1:foo-service}', {
          foo: ['baz', {} as unknown as any],
        }),
      ).toThrow();
    });

    it('should not throw if the query string is a Map', () => {
      const map = new Map<string, string>();
      map.set('foo', 'bar');

      expect(() => robloxUrlConstructor.smartConstruct('{bedev1:foo-service}', map)).not.toThrow();
    });

    it('should throw if the args contains anything other than a string, number, or boolean', () => {
      expect(() =>
        robloxUrlConstructor.smartConstruct('{bedev1:foo-service}', {}, /abc/g as unknown as string),
      ).toThrow();
    });

    it('should throw if there is not at least 2 splits in the initial smartUrl', () => {
      expect(() => robloxUrlConstructor.smartConstruct('{bedev1}')).toThrow();
    });

    it('should throw if the first split is empty', () => {
      expect(() => robloxUrlConstructor.smartConstruct('{:foo-service}')).toThrow();
    });

    it('should throw if the first split is not a valid platform', () => {
      expect(() => robloxUrlConstructor.smartConstruct('{foo-platform:foo-service}')).toThrow();
    });

    it('should throw if the second split is empty', () => {
      expect(() => robloxUrlConstructor.smartConstruct('{bedev1:}')).toThrow();
    });

    it('should throw if the second split is greater than 255 characters', () => {
      expect(() => robloxUrlConstructor.smartConstruct(`{bedev1:${'a'.repeat(256)}}`)).toThrow();
    });

    it('should throw if the second split is not a valid service name', () => {
      expect(() => robloxUrlConstructor.smartConstruct('{bedev1:service_Blah####}')).toThrow();
    });

    it('should throw if the fourth split is specified but is not a valid environment', () => {
      expect(() => robloxUrlConstructor.smartConstruct('{bedev1:foo-service::foo-environment}')).toThrow();
    });

    it('should trim leading slashes if it is asked to', () => {
      expect(robloxUrlConstructor.smartConstruct('{bedev1:foo-service:::true}///blah', {})).toEqual(
        'https://foo-service.foo.com/blah',
      );
    });

    it('should add a trailing slash if it is asked to', () => {
      expect(robloxUrlConstructor.smartConstruct('{bedev1:foo-service::::true}/blah', {})).toEqual(
        'https://foo-service.foo.com/blah/',
      );
    });

    it('should add query string parameters if they are specified', () => {
      expect(
        robloxUrlConstructor.smartConstruct('{bedev1:foo-service}/blah', {
          foo: 'bar',
        }),
      ).toEqual('https://foo-service.foo.com/blah?foo=bar');
    });

    it('should return the base url if the path is empty', () => {
      expect(robloxUrlConstructor.smartConstruct('{bedev1:foo-service}', {})).toEqual('https://foo-service.foo.com');

      expect(robloxUrlConstructor.smartConstruct('{bedev1:foo-service::::true}', {})).toEqual(
        'https://foo-service.foo.com/',
      );
    });

    it('should return the an environment specific url if the environment is specified', () => {
      expect(robloxUrlConstructor.smartConstruct('{bedev1:foo-service::staging}/blah', {})).toEqual(
        'https://foo-service.bar.com/blah',
      );

      expect(robloxUrlConstructor.smartConstruct('{bedev1:foo-service::development}/blah', {})).toEqual(
        'https://foo-service.baz.com/blah',
      );
    });

    it('should use a hostname if the specified environment is a hostname', () => {
      expect(robloxUrlConstructor.smartConstruct('{bedev1:foo-service::foo.dev}/blah', {})).toEqual(
        'https://foo-service.foo.dev/blah',
      );
    });

    it('should use add a version if the specified smartUrl has a version', () => {
      expect(robloxUrlConstructor.smartConstruct('{bedev1:foo-service:v1}/blah', {})).toEqual(
        'https://foo-service.foo.com/v1/blah',
      );
    });

    it('should still compute each side if the path includes closing braces', () => {
      expect(robloxUrlConstructor.smartConstruct('{bedev1:foo-service}/blah/{}', {})).toEqual(
        'https://foo-service.foo.com/blah/{}',
      );
    });

    it('should fill in path parameters if they are specified', () => {
      expect(robloxUrlConstructor.smartConstruct('{bedev1:foo-service}/blah/{{foo}}', {}, 'bar')).toEqual(
        'https://foo-service.foo.com/blah/bar',
      );
    });
  });
});
