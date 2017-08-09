/**
 * Rdetach command
 * @module commands/rdetach
 */
const path = require('path');
const net = require('net');
const protobuf = require('protobufjs');
const argvParser = require('argv');
const SocketWrapper = require('socket-wrapper');

/**
 * Command class
 */
class Rdetach {
    /**
     * Create the service
     * @param {App} app                 The application
     * @param {object} config           Configuration
     * @param {Help} help               Help command
     */
    constructor(app, config, help) {
        this._app = app;
        this._config = config;
        this._help = help;
    }

    /**
     * Service name is 'commands.rdetach'
     * @type {string}
     */
    static get provides() {
        return 'commands.rdetach';
    }

    /**
     * Dependencies as constructor arguments
     * @type {string[]}
     */
    static get requires() {
        return [ 'app', 'config', 'commands.help' ];
    }

    /**
     * Run the command
     * @param {string[]} argv           Arguments
     * @return {Promise}
     */
    run(argv) {
        let args = argvParser
            .option({
                name: 'help',
                short: 'h',
                type: 'boolean',
            })
            .option({
                name: 'tracker',
                short: 't',
                type: 'string',
            })
            .option({
                name: 'socket',
                short: 'z',
                type: 'string',
            })
            .run(argv);

        if (args.targets.length < 3)
            return this._help.helpRdetach(argv);

        let dpath = args.targets[1];
        let ddaemon = args.targets[2];
        let trackerName = args.options.tracker || '';
        let sockName = args.options.socket;

        this._app.debug('Loading protocol').catch(() => { /* do nothing */ });
        protobuf.load(path.join(this._config.base_path, 'proto', 'local.proto'), (error, root) => {
            if (error)
                return this.error(error);

            try {
                this.proto = root;
                this.RemoteDetachRequest = this.proto.lookup('local.RemoteDetachRequest');
                this.RemoteDetachResponse = this.proto.lookup('local.RemoteDetachResponse');
                this.ClientMessage = this.proto.lookup('local.ClientMessage');
                this.ServerMessage = this.proto.lookup('local.ServerMessage');

                this._app.debug('Sending REMOTE DETACH REQUEST').catch(() => { /* do nothing */ });
                let request = this.RemoteDetachRequest.create({
                    trackerName: trackerName,
                    path: dpath,
                    daemonName: ddaemon,
                });
                let message = this.ClientMessage.create({
                    type: this.ClientMessage.Type.REMOTE_DETACH_REQUEST,
                    remoteDetachRequest: request,
                });
                let buffer = this.ClientMessage.encode(message).finish();
                this.send(buffer, sockName)
                    .then(data => {
                        let message = this.ServerMessage.decode(data);
                        if (message.type !== this.ServerMessage.Type.REMOTE_DETACH_RESPONSE)
                            return this.error('Invalid reply from daemon');

                        switch (message.remoteDetachResponse.response) {
                            case this.RemoteDetachResponse.Result.ACCEPTED:
                                return;
                            case this.RemoteDetachResponse.Result.REJECTED:
                                return this.error('Request rejected');
                            case this.RemoteDetachResponse.Result.INVALID_PATH:
                                return this.error('Invalid path');
                            case this.RemoteDetachResponse.Result.PATH_NOT_FOUND:
                                return this.error('Path not found');
                            case this.RemoteDetachResponse.Result.DAEMON_NOT_FOUND:
                                return this.error('Path not found');
                            case this.RemoteDetachResponse.Result.NOT_ATTACHED:
                                return this.error('Not attached');
                            case this.RemoteDetachResponse.Result.TIMEOUT:
                                return this.error('No response from the tracker');
                            case this.RemoteDetachResponse.Result.NO_TRACKER:
                                return this.error('Not connected to the tracker');
                            default:
                                return this.error('Unsupported response from daemon');
                        }
                    })
                    .then(() => {
                        process.exit(0);
                    })
                    .catch(error => {
                        return this.error(error);
                    });
            } catch (error) {
                return this.error(error);
            }
        });

        return Promise.resolve();
    }

    /**
     * Send request and return response
     * @param {Buffer} request
     * @param {string} [sockName]
     * @return {Promise}
     */
    send(request, sockName) {
        return new Promise((resolve, reject) => {
            let sock;
            if (sockName && sockName[0] === '/')
                sock = sockName;
            else
                sock = path.join('/var', 'run', 'bhid', `daemon${sockName ? '.' + sockName : ''}.sock`);

            let onError = error => {
                this.error(`Could not connect to daemon: ${error.message}`);
            };

            let socket = net.connect(sock, () => {
                this._app.debug('Connected to daemon').catch(() => { /* do nothing */ });
                socket.removeListener('error', onError);
                socket.once('error', error => { this.error(error); });

                let wrapper = new SocketWrapper(socket);
                wrapper.on('receive', data => {
                    this._app.debug('Got daemon reply').catch(() => { /* do nothing */ });
                    resolve(data);
                    socket.end();
                });
                wrapper.send(request);
            });
            socket.on('error', onError);
        });
    }

    /**
     * Log error and terminate
     * @param {...*} args
     */
    error(...args) {
        return args.reduce(
                (prev, cur) => {
                    return prev.then(() => {
                        return this._app.error(cur.fullStack || cur.stack || cur.message || cur);
                    });
                },
                Promise.resolve()
            )
            .then(
                () => {
                    process.exit(1);
                },
                () => {
                    process.exit(1);
                }
            );
    }
}

module.exports = Rdetach;