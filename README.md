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
```json
{
    "commands": [{
        "command": "update",
        "oid": "Story:1005",
        "attributes": {
            "Name": "Renamed Story"
        }
    }]
}
```
## Referencing a previous oid
Use {{<assettype>}} example: {{Story}} or {{Task}}
```json
{
    "commands": [{
        "command": "create",
        "assetType": "Story",
        "attributes": {
            "Name": "Story 1",
            "Scope": "Scope:0"
        }
    }, {
        "command": "create",
        "assetType": "Task",
        "attributes": {
            "Name": "Task 1",
            "Parent": "{{Story}}"
        }
    },
}

```