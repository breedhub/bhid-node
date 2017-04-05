/**
 * Detach command
 * @module commands/detach
 */
const path = require('path');
const net = require('net');
const protobuf = require('protobufjs');
const argvParser = require('argv');
const SocketWrapper = require('socket-wrapper');

/**
 * Command class
 */
class Detach {
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
     * Service name is 'commands.detach'
     * @type {string}
     */
    static get provides() {
        return 'commands.detach';
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

        if (args.targets.length < 2)
            return this._help.helpDetach(argv);

        let dpath = args.targets[1];
        let trackerName = args.options['tracker'] || '';
        let sockName = args.options['socket'];

        this._app.debug('Loading protocol');
        protobuf.load(path.join(this._config.base_path, 'proto', 'local.proto'), (error, root) => {
            if (error)
                return this.error(error.message);

            try {
                this.proto = root;
                this.DetachRequest = this.proto.lookup('local.DetachRequest');
                this.DetachResponse = this.proto.lookup('local.DetachResponse');
                this.ClientMessage = this.proto.lookup('local.ClientMessage');
                this.ServerMessage = this.proto.lookup('local.ServerMessage');

                this._app.debug(`Sending DETACH REQUEST`);
                let request = this.DetachRequest.create({
                    trackerName: trackerName,
                    path: dpath,
                });
                let message = this.ClientMessage.create({
                    type: this.ClientMessage.Type.DETACH_REQUEST,
                    detachRequest: request,
                });
                let buffer = this.ClientMessage.encode(message).finish();
                this.send(buffer, sockName)
                    .then(data => {
                        let message = this.ServerMessage.decode(data);
                        if (message.type !== this.ServerMessage.Type.DETACH_RESPONSE)
                            throw new Error('Invalid reply from daemon');

                        switch (message.detachResponse.response) {
                            case this.DetachResponse.Result.ACCEPTED:
                                return;
                            case this.DetachResponse.Result.REJECTED:
                                throw new Error('Request rejected');
                            case this.DetachResponse.Result.INVALID_PATH:
                                throw new Error('Invalid path');
                            case this.DetachResponse.Result.PATH_NOT_FOUND:
                                throw new Error('Path not found');
                            case this.DetachResponse.Result.NOT_ATTACHED:
                                throw new Error('Not attached');
                            case this.DetachResponse.Result.TIMEOUT:
                                throw new Error('No response from the tracker');
                            case this.DetachResponse.Result.NO_TRACKER:
                                throw new Error('Not connected to the tracker');
                            case this.DetachResponse.Result.NOT_REGISTERED:
                                throw new Error('Not registered with the tracker');
                            default:
                                throw new Error('Unsupported response from daemon');
                        }
                    })
                    .then(() => {
                        process.exit(0);
                    })
                    .catch(error => {
                        return this.error(error.message);
                    });
            } catch (error) {
                return this.error(error.message);
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
                sock = path.join('/var', 'run', this._config.project, this._config.instance + (sockName || '') + '.sock');

            let onError = error => {
                this.error(`Could not connect to daemon: ${error.message}`);
            };

            let socket = net.connect(sock, () => {
                this._app.debug('Connected to daemon');
                socket.removeListener('error', onError);
                socket.once('error', error => { this.error(error.message) });

                let wrapper = new SocketWrapper(socket);
                wrapper.on('receive', data => {
                    this._app.debug('Got daemon reply');
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
        return this._app.error(...args)
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

module.exports = Detach;