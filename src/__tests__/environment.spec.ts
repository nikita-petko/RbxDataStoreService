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
    File Name: environment.spec.ts
    Description: Environment Provider Test Specification.
    Written by: Nikita Petko
*/

import environment from '../lib/environment';

import * as fs from 'fs';

jest.mock('fs');

// tslint:disable-next-line: no-string-literal
const _getOrDefault = environment['_getOrDefault'];

describe('Environment Provider', () => {
  describe('_getOrDefault', () => {
    it('should return the default value if the environment variable is not set', () => {
      expect(_getOrDefault('FOO_BAR', 'default')).toEqual('default');
    });

    it('should return the environment variable if it is set, without reloading the environment', () => {
      process.env.FOO_BAR = 'test';
      expect(_getOrDefault('FOO_BAR', 'default', false)).toEqual('test');

      delete process.env.FOO_BAR;
    });

    it('should return the environment variable if it is set, and reload the environment', () => {
      (fs.readFileSync as any).mockReturnValue('FOO_BAR=test');
      (fs.existsSync as any).mockReturnValue(true);

      expect(_getOrDefault('FOO_BAR', 'default', true)).toEqual('test');

      delete process.env.FOO_BAR;

      (fs.readFileSync as any).mockClear();
      (fs.existsSync as any).mockClear();
    });

    it('should return the default value if the environment variable is not set and reload the environment', () => {
      (fs.readFileSync as any).mockReturnValue('FOO_BAR_BIZ=test');
      (fs.existsSync as any).mockReturnValue(true);

      expect(_getOrDefault('FOO_BAR', 'default', true)).toEqual('default');
      expect(process.env.FOO_BAR_BIZ).toEqual('test');

      delete process.env.FOO_BAR_BIZ;

      (fs.readFileSync as any).mockClear();
      (fs.existsSync as any).mockClear();
    });

    it('should throw if the default value is undefined or null', () => {
      expect(() => _getOrDefault('FOO_BAR', undefined)).toThrow();
      expect(() => _getOrDefault('FOO_BAR', null)).toThrow();
    });

    it('should deserialize boolean values from the environment when the default value is a boolean without reloading the environment', () => {
      process.env.FOO_BAR = 'true';
      expect(_getOrDefault('FOO_BAR', false, false)).toEqual(true);

      delete process.env.FOO_BAR;

      process.env.FOO_BAR = 'false';
      expect(_getOrDefault('FOO_BAR', false, false)).toEqual(false);

      delete process.env.FOO_BAR;
    });

    it('should deserialize boolean values from the environment when the default value is a boolean and reload the environment', () => {
      (fs.readFileSync as any).mockReturnValue('FOO_BAR=true');
      (fs.existsSync as any).mockReturnValue(true);

      expect(_getOrDefault('FOO_BAR', false, true)).toEqual(true);

      delete process.env.FOO_BAR;

      (fs.readFileSync as any).mockReturnValue('FOO_BAR=false');
      (fs.existsSync as any).mockReturnValue(true);

      expect(_getOrDefault('FOO_BAR', false, true)).toEqual(false);

      delete process.env.FOO_BAR;

      (fs.readFileSync as any).mockClear();
      (fs.existsSync as any).mockClear();
    });

    it('should deserialize number values from the environment when the default value is a number without reloading the environment', () => {
      process.env.FOO_BAR = '1';
      expect(_getOrDefault('FOO_BAR', 0, false)).toEqual(1);

      delete process.env.FOO_BAR;

      process.env.FOO_BAR = '0';
      expect(_getOrDefault('FOO_BAR', 0, false)).toEqual(0);

      delete process.env.FOO_BAR;
    });

    it('should use the default value as a number when the environment variable is not set and reload the environment', () => {
      expect(_getOrDefault('FOO_BAR_BEZ', 0, true)).toEqual(0);
    });

    it('should deserialize number values from the environment when the default value is a number and reload the environment', () => {
      (fs.readFileSync as any).mockReturnValue('FOO_BAR=1');
      (fs.existsSync as any).mockReturnValue(true);

      expect(_getOrDefault('FOO_BAR', 0, true)).toEqual(1);

      delete process.env.FOO_BAR;

      (fs.readFileSync as any).mockReturnValue('FOO_BAR=0');
      (fs.existsSync as any).mockReturnValue(true);

      expect(_getOrDefault('FOO_BAR', 0, true)).toEqual(0);

      delete process.env.FOO_BAR;

      (fs.readFileSync as any).mockClear();
      (fs.existsSync as any).mockClear();
    });

    it('should use the default value as a number when the environment variable is not set and not reload the environment', () => {
      expect(_getOrDefault('FOO_BAR_BEZ', 0, false)).toEqual(0);
    });

    it('should call the callback function if the value is not set and reload the environment', () => {
      const callback = () => '0';

      // Spy on the callback function
      jest.spyOn(callback, 'call' as never);

      delete process.env.FOO_BAR;

      expect(_getOrDefault('FOO_BAR_BAZ', callback, true)).toEqual('0');

      expect(callback.call).toHaveBeenCalled();

      delete process.env.FOO_BAR;

      // Stop spying on the callback function
      (callback.call as any).mockRestore();
    });

    it('should call the callback function if the value is not set and do not reload the environment', () => {
      const callback = () => '0';
      jest.spyOn(callback, 'call' as never);

      delete process.env.FOO_BAR;

      expect(_getOrDefault('FOO_BAR', callback, false)).toEqual('0');

      expect(callback.call).toHaveBeenCalled();

      delete process.env.FOO_BAR;

      // Stop spying on the callback function
      (callback.call as any).mockRestore();
    });

    it('should deserialize array values from the environment when the default value is an array without reloading the environment', () => {
      process.env.FOO_BAR = '1,2,3';
      expect(_getOrDefault('FOO_BAR', [], false)).toEqual(['1', '2', '3']);

      delete process.env.FOO_BAR;
    });

    it('should deserialize array values from the environment when the default value is an array and reload the environment', () => {
      expect(_getOrDefault('FOO_BAR_BEZ', ['0'], true)).toEqual(['0']);
    });

    it('should deserialize array values from the environment when the default value is an array and reload the environment', () => {
      (fs.readFileSync as any).mockReturnValue('FOO_BAR=1,2,3');
      (fs.existsSync as any).mockReturnValue(true);

      expect(_getOrDefault('FOO_BAR', [], true)).toEqual(['1', '2', '3']);

      delete process.env.FOO_BAR;

      (fs.readFileSync as any).mockClear();
      (fs.existsSync as any).mockClear();
    });

    it('should deserialize array values from the environment when the default value is an array and do not reload the environment', () => {
      expect(_getOrDefault('FOO_BAR_BEZ', ['0'], false)).toEqual(['0']);
    });

    it('should deserialize RegExp values from the environment when the default value is a RegExp without reloading the environment', () => {
      process.env.FOO_BAR = '^foo$';
      expect(_getOrDefault('FOO_BAR', /^foo$/, false)).toEqual(/^foo$/);

      delete process.env.FOO_BAR;
    });

    it('should deserialize RegExp values from the environment when the default value is a RegExp and reload the environment', () => {
      expect(_getOrDefault('FOO_BAR_BEZ', /^foo$/, true)).toEqual(/^foo$/);
    });

    it('should deserialize RegExp values from the environment when the default value is a RegExp and reload the environment', () => {
      (fs.readFileSync as any).mockReturnValue('FOO_BAR=^foo$');
      (fs.existsSync as any).mockReturnValue(true);

      expect(_getOrDefault('FOO_BAR', /^foo$/, true)).toEqual(/^foo$/);

      delete process.env.FOO_BAR;

      (fs.readFileSync as any).mockClear();
      (fs.existsSync as any).mockClear();
    });

    it('should deserialize RegExp values from the environment when the default value is a RegExp and do not reload the environment', () => {
      expect(_getOrDefault('FOO_BAR_BEZ', /^foo$/, false)).toEqual(/^foo$/);
    });

    it('should deserialize object values from the environment when the default value is an object without reloading the environment', () => {
      process.env.FOO_BAR = '{"foo":"bar"}';
      expect(_getOrDefault('FOO_BAR', {}, false)).toStrictEqual({ foo: 'bar' });

      delete process.env.FOO_BAR;
    });

    it('should deserialize object values from the environment when the default value is an object and reload the environment', () => {
      expect(_getOrDefault('FOO_BAR_BEZ', { foo: 'bar' }, true)).toStrictEqual({ foo: 'bar' });
    });

    it('should deserialize object values from the environment when the default value is an object and reload the environment', () => {
      (fs.readFileSync as any).mockReturnValue('FOO_BAR={"foo":"bar"}');
      (fs.existsSync as any).mockReturnValue(true);

      expect(_getOrDefault('FOO_BAR', {}, true)).toStrictEqual({ foo: 'bar' });

      delete process.env.FOO_BAR;

      (fs.readFileSync as any).mockClear();
      (fs.existsSync as any).mockClear();
    });

    it('should deserialize object values from the environment when the default value is an object and do not reload the environment', () => {
      expect(_getOrDefault('FOO_BAR_BEZ', { foo: 'bar' }, false)).toStrictEqual({ foo: 'bar' });
    });
  });

  describe('hasDockerEnv', () => {
    it('should return true if the system has a /.dockerenv file', () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      (fs.existsSync as any).mockReturnValue(true);
      expect(environment.hasDockerEnv()).toBe(true);
      (fs.existsSync as any).mockClear();

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });

    it('should return false if the system does not have a /.dockerenv file', () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      (fs.existsSync as any).mockReturnValue(false);
      expect(environment.hasDockerEnv()).toBe(false);
      (fs.existsSync as any).mockClear();

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });

    it('should return false if the system is not a linux system', () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      expect(environment.hasDockerEnv()).toBe(false);

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });
  });

  describe('hasDockerCGroup', () => {
    it("should return true if the system's cgroup contains the docker cgroup", () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      (fs.readFileSync as any).mockReturnValue('docker');
      expect(environment.hasDockerCGroup()).toBe(true);
      (fs.readFileSync as any).mockClear();

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });

    it("should return false if the system's cgroup does not contain the docker cgroup", () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      (fs.readFileSync as any).mockReturnValue('foo');
      expect(environment.hasDockerCGroup()).toBe(false);
      (fs.readFileSync as any).mockClear();

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });

    it("should return false if the system is not a linux system", () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      expect(environment.hasDockerCGroup()).toBe(false);

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });
    it("should return false if the system's cgroup does not exist", () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      (fs.readFileSync as any).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(environment.hasDockerCGroup()).toBe(false);
      (fs.readFileSync as any).mockClear();

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });
  });

  describe('isDocker', () => {
    it('should return true if the system has a .dockerenv file and no cgroup', () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      (fs.existsSync as any).mockReturnValue(true);
      expect(environment.isDocker()).toBe(true);
      (fs.existsSync as any).mockClear();

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });

    it('should return false if the system does not have a .dockerenv file and no cgroup', () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      (environment as any)._isDocker = false;
      expect(environment.isDocker()).toBe(false);

      delete (environment as any)._isDocker;

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });

    it('should return true if the system does not have a .dockerenv file and has a cgroup', () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      (fs.existsSync as any).mockReturnValue(false);
      (fs.readFileSync as any).mockReturnValue('docker');
      expect(environment.isDocker()).toBe(true);
      (fs.existsSync as any).mockClear();
      (fs.readFileSync as any).mockClear();

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });

    it('should return true if the system has a .dockerenv file and has a cgroup', () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      (environment as any)._isDocker = true;
      expect(environment.isDocker()).toBe(true);

      delete (environment as any)._isDocker;

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });

    it('should return false if the system is not a linux system', () => {
      const orignalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      expect(environment.isDocker()).toBe(false);

      Object.defineProperty(process, 'platform', {
        value: orignalPlatform,
      });
    });
  });
});
