## About

Nikita Petko and a few other friends alike created a NodeJS package that mocks the [Roblox DataStore System](https://developer.roblox.com/en-us/articles/Data-store) almost identically,
introducting calls and creations like the actual Lua DataStoreService

What makes this especially interesting, is that everything you do is:

- Strong/Inferred in typings (DataStore2 result can be a tuple of variant and DataStoreKeyInfo whereas GlobalDataStore result can be just a variant)
- External usage identical to Lua with better syntax in your NodeJS applications.

## An example of read world implementation

Say you have a web server with [Express JS](https://www.npmjs.com/package/express), and you have a game that manages users with moderation etc.

With your web server you can query your users like you would via Roblox and get the results like you would on Roblox.

The example is as follows:

### Roblox Game Server Code

```lua
-- Server script in ServerScriptService

local PlayersService = game:GetService("Players");
local DataStoreService = game:GetService("DataStoreService");

local users = DataStoreService:GetDataStore("Users", "global", nil); -- no options parameter here as AllScopes nor V2 API isn't needed.
local usersResolutionTable = users:GetAsync("UsersResolution") or {}; -- or {} in case it's nil

PlayersService.PlayerAdded:Connect(function (remotePlayer)
    local playerDiscriminator = tostring(remotePlayer.UserId);

    -- dummy true here just for resolution
    -- create user if they do not exist already
    if (usersResolutionTable[playerDiscriminator] ~= true) then
        local data = { Name = remotePlayer.Name, ID = remotePlayer.UserId, Status = 0, Created = DateTime.now():ToISODate() };
        users:SetAsync(playerDiscriminator, data, nil, nil); -- no userIDs or DataStoreSetOptions because V2 API not enabled right now
        usersResolutionTable[playerDiscriminator] = true;
        users:UpdateAsync("UsersResolution", function() return usersResolutionTable end); -- SetAsync would suffice here but we want to skip cache
    end
    local user = users:GetAsync(tostring(remotePlayer.UserId));

    if (user.Status == 1) then
        -- user is banned
        remotePlayer:Kick("You are banned");
        return;
    end

    -- continue with further logic.

end)
```

### Web Server Code

```js
// This code will query all the userIDs and try to resolve each user, the structure depends on the UsersResolution table to be a table or null of course

const app = require("express")();
const {
  DataStoreService,
  InitializeAsync,
} = require("@mfdlabs/rbxdatastoreservice");

(async () => {
    await InitializeAsync("Security token for authentication purposes", place id);

    const users = DataStoreService.GetDataStore("Users", "global", undefined); // no options parameter here as AllScopes nor V2 API isn't needed.

    app.get("/v1/all-users", async (request, response) => {
        const usersResolutionTable = (await users.GetAsync("UsersResolution"])) || {}; // or {} in case it's nil

        let resultingUsers = [];

        for (const userID of Object.keys(usersResolutionTable)) {
            resultingUsers.push(await users.GetAsync(userID));
        }

        return response
            .status(200)
            .send({ count: resultingUsers.length, data: resultingUsers });

    });

    app.listen(8080);
})();
```

## Installation

With node.js installed simply run:

```sh
# Run this to install RbxDataStoreService locally to your repository.
$ npm install @mfdlabs/rbxdatastoreservice --save
$ yarn add @mfdlabs/rbxdatastoreservice

# Run this instead to install RbxDataStoreService globally so you can use it anywhere.
$ npm install @mfdlabs/rbxdatastoreservice -g
$ yarn global add @mfdlabs/rbxdatastoreservice
```

That's it!

## Documentation

As this framework mocks the [Roblox DataStore System](https://developer.roblox.com/en-us/articles/Data-store) identically, the documentation for this will almost be identical to the Lua documentation at:

- [Roblox Developer Hub](https://developer.roblox.com/en-us/api-reference/class/DataStoreService)
- [Anaminus's Documentation](https://robloxapi.github.io/ref/class/DataStoreService.html)

It is made this way to make it seem familiar to users moving, or users that use JavaScript and TypeScript

### Initial setup

Before you can do anything you must initialize the global state with valid data.
The data you must give are:

1. A valid .ROBLOSECURITY token that you can get from the brower or after an authentication check.
2. A valid PlaceID for a place that you have edit permissions for.

At initialization these 2 arguments are validated via:

1. Checking if the .ROBLOSECURITY token has a corresponding account.
2. Checking if there is a place/asset with the give placeID.
3. Checking if the authenticated user has sufficient permissions to access datastores for the place (edit permissions will suffice).

When you are using the library, you will want to import the `InitializeAsync` method from the index file like this:

```ts
import { InitializeAsync } from '@mfdlabs/rbxdatastoreservice';
```

And you will use it like:

```ts
import { InitializeAsync } from "@mfdlabs/rbxdatastoreservice";

/* PETKO_TODO: Examples for ApiKey authentication here. */

(async () => {
    // This method is async, so you will want to use it in an async block, or you will want to bind to .then and .catch etc.
    await InitializeAsync("The .ROBLOSECURITY with the warning INCLUDED", the place ID);
})();
```

The cookie cannot be:

1. Empty
2. null or undefined

The placeId cannot be:

1. Null, NaN or undefined
2. < 1

You will know the initialization succeeded if the method didn't throw during initialization, then you can start using the DataStoreService object you import.

## Closing Words

If you want to contribute, please open a pull request via [here](https://github.com/nkpetko/RbxDataStoreService/pulls).

If you have any issues when using this library, please open an issue [here](https://github.com/nkpetko/RbxDataStoreService/issues).

Thank you and please enjoy!

## License

```
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
```
