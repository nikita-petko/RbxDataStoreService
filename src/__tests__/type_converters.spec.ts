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
    File Name: type_converters.spec.ts
    Description: Type Converters Test Specification.
    Written by: Nikita Petko
*/

import typeConverters from '../lib/environment/type_converters';

describe('Type Converters', () => {
  describe('toBoolean', () => {
    it('should convert to a boolean', () => {
      expect(typeConverters.toBoolean(true)).toEqual(true);
      expect(typeConverters.toBoolean(false)).toEqual(false);
      expect(typeConverters.toBoolean(1)).toEqual(true);
      expect(typeConverters.toBoolean(0)).toEqual(false);
      expect(typeConverters.toBoolean('true')).toEqual(true);
      expect(typeConverters.toBoolean('false')).toEqual(false);
      expect(typeConverters.toBoolean('1')).toEqual(true);
      expect(typeConverters.toBoolean('0')).toEqual(false);
    });

    it('should give a default value if the value is not a boolean', () => {
      expect(typeConverters.toBoolean('test')).toEqual(false);
      expect(typeConverters.toBoolean('test', true)).toEqual(true);
      expect(typeConverters.toBoolean(null, false)).toEqual(false);
    });
  });
});
