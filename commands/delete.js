/**
 * Delete command
 * @module commands/delete
 */
const path = require('path');
const net = require('net');
const protobuf = require('protobufjs');
const argvParser = require('argv');
const SocketWrapper = require('socket-wrapper');

/**
 * Command class
 */
class Delete {
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
     * Service name is 'commands.delete'
     * @type {string}
     */
    static get provides() {
        return 'commands.delete';
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
            return this._help.helpDelete(argv);

        let cpath = args.targets[1];
        let trackerName = args.options.tracker || '';
        let sockName = args.options.socket;

        this._app.debug('Loading protocol').catch(() => { /* do nothing */ });
        protobuf.load(path.join(this._config.base_path, 'proto', 'local.proto'), (error, root) => {
            if (error)
                return this.error(error);

            try {
                this.proto = root;
                this.DeleteRequest = this.proto.lookup('local.DeleteRequest');
                this.DeleteResponse = this.proto.lookup('local.DeleteResponse');
                this.ClientMessage = this.proto.lookup('local.ClientMessage');
                this.ServerMessage = this.proto.lookup('local.ServerMessage');

                this._app.debug('Sending DELETE REQUEST').catch(() => { /* do nothing */ });
                let request = this.DeleteRequest.create({
                    trackerName: trackerName,
                    path: cpath,
                });
                let message = this.ClientMessage.create({
                    type: this.ClientMessage.Type.DELETE_REQUEST,
                    deleteRequest: request,
                });
                let buffer = this.ClientMessage.encode(message).finish();
                this.send(buffer, sockName)
                    .then(data => {
                        let message = this.ServerMessage.decode(data);
                        if (message.type !== this.ServerMessage.Type.DELETE_RESPONSE)
                            return this.error('Invalid reply from daemon');

                        switch (message.deleteResponse.response) {
                            case this.DeleteResponse.Result.ACCEPTED:
                                return;
                            case this.DeleteResponse.Result.REJECTED:
                                return this.error('Request rejected');
                            case this.DeleteResponse.Result.INVALID_PATH:
                                return this.error('Invalid path');
                            case this.DeleteResponse.Result.PATH_NOT_FOUND:
                                return this.error('Path not found');
                            case this.DeleteResponse.Result.TIMEOUT:
                                return this.error('No response from the tracker');
                            case this.DeleteResponse.Result.NO_TRACKER:
                                return this.error('Not connected to the tracker');
                            case this.DeleteResponse.Result.NOT_REGISTERED:
                                return this.error('Not registered with the tracker');
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
            if (sockName && sockName[0] === '/') {
                sock = sockName;
            } else {
                sockName = sockName ? `.${sockName}` : '';
                sock = path.join('/var', 'run', this._config.project, this._config.instance + sockName + '.sock');
            }

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

module.exports = Delete;