/**
 * Daemon server
 * @module servers/daemon
 */
const debug = require('debug')('bhit:daemon');
const path = require('path');
const fs = require('fs');
const net = require('net');
const uuid = require('uuid');
const protobuf = require('protobufjs');
const EventEmitter = require('events');
const WError = require('verror').WError;
const SocketWrapper = require('socket-wrapper');

/**
 * Server class
 */
class Daemon extends EventEmitter {
    /**
     * Create the service
     * @param {App} app                     Application
     * @param {object} config               Configuration
     * @param {Logger} logger               Logger service
     */
    constructor(app, config, logger, util) {
        super();

        this.server = null;
        this.clients = new Map();

        this._name = null;
        this._app = app;
        this._config = config;
        this._logger = logger;
    }

    /**
     * Service name is 'servers.daemon'
     * @type {string}
     */
    static get provides() {
        return 'servers.daemon';
    }

    /**
     * Dependencies as constructor arguments
     * @type {string[]}
     */
    static get requires() {
        return [ 'app', 'config', 'logger' ];
    }

    /**
     * Initialize the server
     * @param {string} name                     Config section name
     * @return {Promise}
     */
    init(name) {
        this._name = name;
        this._logger.setLogStream('daemon.log', this._config.get(`servers.${name}.log`));

        return new Promise((resolve, reject) => {
                debug('Loading protocol');
                protobuf.load(path.join(this._config.base_path, 'proto', 'local.proto'), (error, root) => {
                    if (error)
                        return reject(new WError(error, 'Daemon.init()'));

                    try {
                        this.proto = root;
                        this.InitRequest = this.proto.lookup('tracker.InitRequest');
                        this.InitResponse = this.proto.lookup('tracker.InitResponse');
                        this.ConfirmRequest = this.proto.lookup('tracker.ConfirmRequest');
                        this.ConfirmResponse = this.proto.lookup('tracker.ConfirmResponse');
                        this.ClientMessage = this.proto.lookup('tracker.ClientMessage');
                        this.ServerMessage = this.proto.lookup('tracker.ServerMessage');
                        resolve();
                    } catch (error) {
                        reject(new WError(error, 'Daemon.init()'));
                    }
                })
            })
            .then(() => {
                this.server = net.createServer(this.onConnection.bind(this))
                this.server.on('error', this.onServerError.bind(this));
                this.server.on('listening', this.onListening.bind(this));
            });
    }

    /**
     * Start the server
     * @param {string} name                     Config section name
     * @return {Promise}
     */
    start(name) {
        if (name !== this._name)
            return Promise.reject(new Error(`Server ${name} was not properly bootstrapped`));

        return Array.from(this._app.get('modules')).reduce(
                (prev, [ curName, curModule ]) => {
                    return prev.then(() => {
                        if (!curModule.register)
                            return;

                        let result = curModule.register(name);
                        if (result === null || typeof result != 'object' || typeof result.then != 'function')
                            throw new Error(`Module '${curName}' register() did not return a Promise`);
                        return result;
                    });
                },
                Promise.resolve()
            )
            .then(() => {
                debug('Starting the server');
                try {
                    let sock = path.join('/var', 'run', this._config.project, this._config.instance + '.sock');
                    try {
                        fs.accessSync(sock, fs.constants.F_OK);
                        fs.unlinkSync(sock);
                    } catch (error) {
                        // do nothing
                    }
                    this.server.listen(sock);
                } catch (error) {
                    throw new WError(error, 'Daemon.start()');
                }
            });
    }

    /**
     * Send message
     * @param {string} id                   Client ID
     * @param {Buffer|null} data            Data to send
     */
    send(id, data) {
        let client = this.clients.get(id);
        if (!client || !client.socket || !client.wrapper)
            return;

        client.wrapper.send(data);
    }

    /**
     * Server error handler
     * @param {object} error            The error
     */
    onServerError(error) {
        if (error.syscall !== 'listen')
            return this._logger.error(new WError(error, 'Tracker.onTcpError()'));

        switch (error.code) {
            case 'EACCES':
                this._logger.error('Tracker TCP port requires elevated privileges');
                break;
            case 'EADDRINUSE':
                this._logger.error('Tracker TCP port is already in use');
                break;
            default:
                this._logger.error(error);
        }
        process.exit(1);
    }

    /**
     * Server listening event handler
     */
    onListening() {
        this._logger.info(`Daemon server listening on /var/run/${this._config.project}/${this._config.instance}.sock`);
    }

    /**
     * Connection handler
     * @param {object} socket           Client socket
     */
    onConnection(socket) {
        let id = uuid.v1();
        debug(`New socket`);

        let client = {
            id: id,
            socket: socket,
            wrapper: new SocketWrapper(socket),
        };
        this.clients.set(id, client);

        client.wrapper.on(
            'receive',
            data => {
                if (!this.onMessage(id, data)) {
                    socket.end();
                    client.wrapper.detach();
                }
            }
        );

        socket.on('error', error => { this.onError(id, error); });
        socket.on('close', () => { this.onClose(id); });

        this.emit('connection', id);
    }

    /**
     * Client message handler
     * @param {string} id               Client ID
     * @param {Buffer} data             Message
     * @return {boolean}                Destroy socket on false
     */
    onMessage(id, data) {
        let client = this.clients.get(id);
        if (!client)
            return false;

        if (!data || !data.length)
            return true;

        try {
            let message = this.ClientMessage.decode(data);
            debug(`Client message ${message.type}`);
            switch(message.type) {
                case this.ClientMessage.Type.INIT_REQUEST:
                    this.emit('init_request', id, message);
                    break;
                case this.ClientMessage.Type.CONFIRM_REQUEST:
                    this.emit('confirm_request', id, message);
                    break;
            }
        } catch (error) {
            this._logger.error(`Daemon protocol error: ${error.message}`);
        }

        return true;
    }

    /**
     * Client error handler
     * @param {string} id                   Client ID
     * @param {Error} error                 Error
     */
    onError(id, error) {
        this._logger.error(`Daemon socket error: ${error.message}`);
    }

    /**
     * Client disconnect handler
     * @param {string} id                   Client ID
     */
    onClose(id) {
        let client = this.clients.get(id);
        if (client) {
            debug(`Client disconnected`);
            if (client.socket) {
                if (!client.socket.destroyed)
                    client.socket.destroy();
                client.socket = null;
                client.wrapper.destroy();
                client.wrapper = null;
            }
            this.clients.delete(id);
        }
    }
}

module.exports = Daemon;