/* 
	FileName: index.ts
	Written By: Nikita Nikolaevich Petko, - nikita-mfd
	File Type: Module
	Description: The main exports file for RbxDataStoreService

	***

	Copyright 2015-2020 MFD

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.

	***
*/
import { init } from './Helpers/InitAuthenticatedUser';
import { DataStoreService } from './Services/DataStoreService';

export = {
	InitializeAsync: init,
	DataStoreService: DataStoreService,
};
