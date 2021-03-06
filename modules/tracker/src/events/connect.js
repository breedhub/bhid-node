/**
 * Connect event
 * @module tracker/events/connect
 */
const os = require('os');
const uuid = require('uuid');
const NError = require('nerror');
const Base = require('./base');

/**
 * Connect event class
 */
class Connect extends Base {
    /**
     * Create service
     * @param {App} app                         The application
     * @param {object} config                   Configuration
     * @param {Logger} logger                   Logger service
     * @param {Crypter} crypter                 Crypter service
     */
    constructor(app, config, logger, crypter) {
        super(app);
        this._config = config;
        this._logger = logger;
        this._crypter = crypter;
    }

    /**
     * Service name is 'tracker.events.connect'
     * @type {string}
     */
    static get provides() {
        return 'tracker.events.connect';
    }

    /**
     * Dependencies as constructor arguments
     * @type {string[]}
     */
    static get requires() {
        return [ 'app', 'config', 'logger', 'crypter' ];
    }

    /**
     * Event name
     * @type {string}
     */
    get name() {
        return 'connect';
    }

    /**
     * Event handler
     * @param {string} name                     Name of the tracker
     * @return {Promise}
     */
    async handle(name) {
        let server = this.tracker.servers.get(name);
        if (!server || !server.token)
            return;

        this._logger.debug('connect', `${name} connected - registering`);
        try {
            let msgId = uuid.v1();

            let onResponse = (name, response) => {
                if (response.messageId !== msgId)
                    return;

                this.tracker.removeListener('register_daemon_response', onResponse);

                this._logger.debug('connection', `Got REGISTER DAEMON RESPONSE from tracker`);
                switch (response.registerDaemonResponse.response) {
                    case this.tracker.RegisterDaemonResponse.Result.ACCEPTED:
                        server.registered = true;
                        server.email = response.registerDaemonResponse.email;
                        server.daemonName = response.registerDaemonResponse.name;
                        this.tracker.emit('registered', name);
                        break;
                    case this.tracker.RegisterDaemonResponse.Result.REJECTED:
                        this.tracker._logger.error(`Tracker ${name} refused to register this daemon`);
                        break;
                    default:
                        this._logger.debug('connection', 'Unsupported response from daemon');
                }
            };
            this.tracker.on('register_daemon_response', onResponse);

            let request = this.tracker.RegisterDaemonRequest.create({
                token: server.token,
                identity: this._crypter.identity,
                key: this.peer.publicKey,
                hostname: os.hostname() || '',
                version: this._config.version || '',
            });
            let msg = this.tracker.ClientMessage.create({
                type: this.tracker.ClientMessage.Type.REGISTER_DAEMON_REQUEST,
                messageId: msgId,
                registerDaemonRequest: request,
            });
            let data = this.tracker.ClientMessage.encode(msg).finish();
            this.tracker.send(name, data);
        } catch (error) {
            this._logger.error(new NError(error, 'Connect.handle()'));
        }
    }
}

module.exports = Connect;
