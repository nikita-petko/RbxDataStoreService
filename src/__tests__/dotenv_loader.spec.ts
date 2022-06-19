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
    File Name: dotenv_loader.spec.ts
    Description: Dotenv Loader Test Specification.
    Written by: Nikita Petko
*/

import dirname from '../lib/dirname';
import dotenvLoader from '../lib/environment/dotenv_loader';

import * as fs from 'fs';
import * as path from 'path';

// Set up packageDirname for testing. It should be this file's directory.
dirname.packageDirname = path.resolve();

describe('Dotenv Loader', () => {
  // Write a .env file with the following content:
  // FOO=bar
  // BAZ=qux
  beforeEach(() => {
    // Create a .env file.
    fs.writeFileSync(path.join(dirname.packageDirname, '.env'), 'FOO=bar\nBAZ=qux');

    delete process.env.FOO;
    delete process.env.BAZ;
  });

  // Remove the .env file after the tests.
  afterAll(() => {
    fs.unlinkSync(path.join(dirname.packageDirname, '.env'));
  });

  it('should load the .env file', () => {
    // Load the .env file.
    dotenvLoader.reloadEnvironment();

    // Check that the environment variables were loaded.
    expect(process.env.FOO).toEqual('bar');
    expect(process.env.BAZ).toEqual('qux');
  });

  it('should not load the .env file if it does not exist', () => {
    // Remove the .env file.
    fs.unlinkSync(path.join(dirname.packageDirname, '.env'));

    // Load the .env file.
    dotenvLoader.reloadEnvironment();

    // Check that the environment variables were loaded.
    expect(process.env.FOO).toBeUndefined();
    expect(process.env.BAZ).toBeUndefined();
  });

  it('should overwrite the environment variables', () => {
    // Set the environment variables.
    process.env.FOO = 'baz';
    process.env.BAZ = 'quux';

    // Load the .env file.
    dotenvLoader.reloadEnvironment();

    // Check that the environment variables were loaded.
    expect(process.env.FOO).toEqual('bar');
    expect(process.env.BAZ).toEqual('qux');
  });

  it('should not overwrite the environment variables if overwriteExisting is false', () => {
    // Set the environment variables.
    process.env.FOO = 'baz';
    process.env.BAZ = 'quux';

    // Load the .env file.
    dotenvLoader.reloadEnvironment(false);

    // Check that the environment variables were loaded.
    expect(process.env.FOO).toEqual('baz');
    expect(process.env.BAZ).toEqual('quux');
  });
});
