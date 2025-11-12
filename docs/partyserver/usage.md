You can connect to the server from a client (like a browser or a mobile app) using `partysocket`.

```ts
import { PartySocket } from 'partysocket';

const socket = new PartySocket({
  host: 'https://my-partyserver-app.threepointone.workers.dev', // optional, defaults to window.location.host,
  party: 'my-server', // the server name. if you use routePartykitRequest, it automatically uses the kebab-cased version of the binding name (MyServer -> my-server)
  room: 'my-room',
});
```

## Customizing `Server`

`Server` is a class that extends `DurableObject`. You can override the following methods on `Server` to add custom behavior:

### Lifecycle Hooks

These methods can be optionally `async`:

- `onStart()`: Called when the server starts for the first time or after waking up from hibernation. You can use this to load data from storage and perform other initialization, such as retrieving data or configuration from other services or databases.

- `onConnect(connection, context)` - Called when a new websocket connection is established. You can use this to set up any connection-specific state or perform other initialization. Receives a reference to the connecting `Connection`, and a `ConnectionContext` that provides information about the initial connection request.

- `onMessage(connection, message)` - Called when a message is received on a connection.

- `onClose(connection, code, reason, wasClean)` - Called when a connection is closed by a client. By the time `onClose` is called, the connection is already closed and can no longer receive messages.

- `onError(connection, error)` - Called when an error occurs on a connection.

- `onRequest(request): Response` - Called when a request is made to the server. This is useful for handling HTTP requests in addition to WebSocket connections.

- `onAlarm()` - Called when an alarm is triggered. You can set an alarm by calling `this.ctx.storage.setAlarm(Date)`. Read more about Durable Objects alarms [here](https://developers.cloudflare.com/durable-objects/api/alarms/).

- `getConnectionTags(connection, context): string[]` - You can set additional metadata on connections by returning them from `getConnectionTags()`, and then filter connections based on the tag with `this.getConnections`.

### Additional Methods

- `broadcast(message, exclude = [])` - Send a message to all connections, optionally excluding connection ids listed in the second array parameter.

- `getConnections(tags = [])` - Get all currently connected WebSocket connections, optionally filtered by tags set by `getConnectionTags()`. Returns an iterable list of `Connection`.

- `getConnection(id)` - Get a connection by its ID.

## Properties

- `.name` - (readonly) this is automatically set to the server's "name", determined by `getServerByName()` or `routePartykitRequest()`.

- `.ctx` - the context object for the Durable Object, containing references to [`storage`](https://developers.cloudflare.com/durable-objects/api/transactional-storage-api/)

- `.env` - the environment object for the Durable Object, defined by bindings and other configuration in your `wrangler.toml` configuration file.

### Durable Object methods

- `fetch(request)` - PartyServer overrides the `fetch` method to add the lifecycle methods to the server instance. In most cases you don't have to implement this mehod yourself. If you do (for example, to add request handling before any lifecycle methods are called), make sure to call `super.fetch(request)` as appropriate to ensure the lifecycle methods are called.

- `alarm()` - _You should not implement/override this yourself, use `onAlarm()` instead._ This method is called whenever an alarm is triggered. This is the only way to run code after the server has been evicted. Read more about alarms [here](https://developers.cloudflare.com/durable-objects/api/alarms/).

- Do not implement any of these methods on your server class: `webSocketMessage` /`webSocketClose` / `webSocketError` / alarm. We override them to call the lifecycle methods in hibernation mode.

### Connection Properties

A connection is a standard WebSocket with the following additional properties:

- `id` - A unique ID for the connection
- `tags` - An array of tags assigned to the connection (TODO)
- `server` - The server name the connection is in
- `state` - Arbitrary state data (up to 2KB) that can be set on the connection using `connection.setState()`

### Utility Methods

- `getServerByName(namespace, name, {locationHint, jurisdiction}): Promise<DurableObjectStub>` - Create a new Server with a specific name. Optionally pass a `locationHint` to specify the [location](https://developers.cloudflare.com/durable-objects/reference/data-location/#provide-a-location-hint) or `jurisdiction` to specify the [jurisdiction](https://developers.cloudflare.com/durable-objects/reference/data-location/#restrict-durable-objects-to-a-jurisdiction) of the server.
