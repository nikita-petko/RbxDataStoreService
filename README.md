<h4 align="center">A Node.js wrapper for interacting with the Roblox DataStore API.</h4>
<br>
<p align="center">
    <a href="https://standardjs.com"><img src="https://img.shields.io/badge/code_style-standard-blue.svg?style=flat-square" alt="JavaScript Style Guide"/></a>
    <a href="https://discord.gg/EDXNdAT"><img src="https://img.shields.io/badge/discord-roblox%20api%20chat-blue.svg?style=flat-square" alt="Roblox API Discord"/></a>
    <a href="https://npmjs.org/noblox.js"><img src="https://img.shields.io/npm/v/@mfd/rbxdatastoreservice.svg?style=flat-square" alt="NPM package"/></a>
</p>
<p align="center">
  <a href="#about">About</a> •
  <a href="#installation">Installation</a> •
  <a href="#documentation">Docs</a> •
  <a href="#credits">Credits</a>
</p>

## About

RbxDataStoreService is a node module that That allows you to use DataStoreService outside of Roblox.
This project was created because people outside ROBLOX always want to use DataStoreService outside ROBLOX.

RbxDataStoreService allows you to do things you would normally do on the [Roblox](https://www.roblox.com) DataStoreService through a Node.js interface. 
You can use RbxDataStoreService along with ROBLOX's [HttpService feature](http://wiki.roblox.com/index.php?title=API:Class/HttpService) to create scripts that interact with the DataStoreService externally.
## Installation

With node.js installed simply run:
```bash
# Run this to install RbxDataStoreService locally to your repository. 
$ npm install @mfd/rbxdatastoreservice --save

# Run this instead to install RbxDataStoreService globally so you can use it anywhere.
$ npm install @mfd/rbxdatastoreservice -g
```
That's it!
## Documentation

You can find the current RbxDataStoreService documentation [here (Roblox Wiki)](https://developer.roblox.com/en-us/api-reference/class/DataStoreService) or [here (API Reference)](https://robloxapi.github.io/ref/class/DataStoreService.htm)

### Initial setup
1. Run `RbxDataStoreService.InitializeAsync` with the parameters of `Cookie` and `PlaceId`. This will store your cookie internally and validate it, but will perform **no** cookie refresh automatically, it also requires that your cookie have the warning and be valid.
3. While this works, Roblox `.ROBLOSECURITY` cookies expire after 30 years of first authenticating them.
4. You need to store this new cookie somewhere - whether it be in a database, or a JSON file.

> Note: By default, InitializeAsync will validate the cookie you provide by making a HTTP request.
### Example
This example makes use of the new async-await syntax.
```js
const RBX = require("@mfd/rbxdatastoreservice")
async function startApp () {
    await RBX.InitializeAsync("_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_...", 123)
    // Do everything else, calling functions and the like.
    let DataStoreService = RBX.DataStoreService;
}
```

## Credits

* [nsg](https://github.com/mfd-co) - ROBLOX Contractor for the engine team.
* [mfd](https://github.com/mfd-core) - Other devs