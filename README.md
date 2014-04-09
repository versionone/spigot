# Spigot

[TOC]

## Install
```sh
npm install -g git+ssh://git@github.com:versionone/spigot.git
```

## Options
```sh
spigot --url <url> --username <username> --password <password> [spigot files]
```

## Creating an asset
```json
{
    "commands": [{
        "command": "create",
        "assetType": "Story",
        "attributes": {
            "Name": "Story 1",
            "Scope": "Scope:0"
        }
    }]
}
```

## Updating an asset