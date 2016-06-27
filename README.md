# Spigot

- [Install](#install)
- [Running](#running)
- [Options](#options)
- [Interact with VersionOne](#interact-with-versionone)
	- [Creating an Asset](#creating-an-asset)
	- [Updating an Asset](#updating-an-asset)
	- [Updating a multi relation](#updating-a-multi-relation)
	- [Referencing an oid](#referencing-an-oid)
	- [Executing an Operation](#executing-an-operation)
- [Additional](#additional)
  - [Url](#url)
  - [Username/Password](#username/password)
  - [Array of commands](#array-of-commands)

## Install
Global install
```sh
npm install -g git+ssh://git@github.com:versionone/spigot.git
```
Cloning
```sh
git clone git@github.com:versionone/spigot.git
```

## Developing
Local build

```sh
#Install dependencies
npm install

#Build
npm run build
```

## Running
Globally installed
```sh
spigot
```
Local clone
```sh
./bin/spigot
```

## Options
```sh
spigot --url <url> --username <username> --password <password> --throttle <events per second> --forever --parallel [spigot files]
```
- `--url` Url to VersionOne
- `--username` Username
- `--password` Password
- `--throttle` Number of events per second
- `--parallel` Run commands in parallel
- `--forever` Repeat spigot infinitely
- `[spigot files]` A list of spigot json files

## Interact with VersionOne
### Creating an asset
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

### Creating an asset n times (requires name).
```json
{
    "commands": [{
        "command": "create",
        "times": "5",
        "assetType": "Story",
        "attributes": {
            "Name": "StoryName",
            "Scope": "Scope:0"
        }
    },
    {
        "command": "create",
        "assetType": "Bundle",
        "attributes": {
            "Name": "Story 1",
            "Workitems":  [
                "{{StoryName 1}}",
                "{{StoryName 2}}",
                "{{StoryName 3}}"
                "{{StoryName 4}}"
            ]
        }
    }]
}
```

### Updating an asset
```json
{
    "commands": [{
        "command": "update",
        "assetType": "Story",
        "oid": "Story:1005",
        "attributes": {
            "Name": "Renamed Story"
        }
    }]
}
```

### Updating a multi relation
```json
{
    "commands": [
        {
            "command": "create",
            "assetType": "Story",
            "attributes": {
                "Name": "Story with owners",
                "Scope": "Scope:0"
            }
        },
        {
            "command": "update",
            "assetType": "Story",
            "oid": "{{Story}}",
            "attributes": {
                "Owners": [
                    "Member:20",
                    "Member:1133",
                    "Member:1134"
                ]
            }
        },
        {
            "command": "update",
            "assetType": "Story",
            "oid": "{{Story}}",
            "attributes": {
                "Owners": [
                    { "idref": "Member:1133", "act": "remove" }
                 ]
            }
        }
    ]
}
```

### Referencing an oid
Use `{{<assettype>}}` example: `{{Story}}` or `{{Task}}`
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

Use `{{<asset name>}}` example: `{{Story 1}}` or `{{A Specific Story}}`
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
            "Parent": "{{Story 1}}"
        }
    },{
        "command": "create",
        "assetType": "Task",
        "attributes": {
            "Name": "Task 2",
            "Parent": "{{A Specific Story}}"
        }
    }
}
```

### Executing an Operation
```json
{
    "commands": [{
        "command": "execute",
        "assetType": "Story",
        "oid": "Story:1005",
        "operation": "Inactivate"
    }]
}
```

## Additional
### Url
Override the defaults url
```json
{
	"url": "http://<versionone>",
	"commands":[]
}
```

### Username/Password
Overrides the default username and password. This can be useful for simulating multiple users.
```json
{
	"username": "admin",
	"password": "password",
	"commands":[]
}
```

### Incrementing Number
Supply an incrementing number in strings
```json
{
    "username": "admin",
    "password": "admin",

    "commands": [
        {
            "command": "create",
            "assetType": "Story",
            "attributes": {
                "Name": "Story {{number}}",
                "Scope": "Scope:0"
            }
        },
        {
            "command": "create",
            "assetType": "Story",
            "attributes": {
                "Name": "Story {{number}}",
                "Scope": "Scope:0"
            }
        }
	]
}
```

### Array of commands
Multiple command sets can be supplied by multiple files. Using a single file use the following format
```json
[{
    "username": "admin",
    "password": "admin",
    "commands": [{
        "command": "create",
        "assetType": "Story",
        "attributes": {
            "Name": "Story 1",
            "Scope": "Scope:0"
        }
    }]
}, {
    "username": "bob",
    "password": "bob",
    "commands": [{
        "command": "create",
        "assetType": "Story",
        "attributes": {
            "Name": "Story 1",
            "Scope": "Scope:0"
        }
    }]
}, {
    "username": "jennifer",
    "password": "jennifer",
    "commands": [{
        "command": "create",
        "assetType": "Story",
        "attributes": {
            "Name": "Story 1",
            "Scope": "Scope:0"
        }
    }]
}]
```
