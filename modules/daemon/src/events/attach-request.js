/**
 * Attach Request event
 * @module daemon/events/attach-request
 */
const uuid = require('uuid');
const NError = require('nerror');
const Base = require('./base');

/**
 * Attach Request event class
 */
class AttachRequest extends Base {
    /**
     * Create service
     * @param {App} app                             The application
     * @param {object} config                       Configuration
     * @param {Logger} logger                       Logger service
     * @param {ConnectionsList} connectionsList     Connections List service
     */
    constructor(app, config, logger, connectionsList) {
        super(app);
        this._config = config;
        this._logger = logger;
        this._connectionsList = connectionsList;
    }

    /**
     * Service name is 'daemon.events.attachRequest'
     * @type {string}
     */
    static get provides() {
        return 'daemon.events.attachRequest';
    }

    /**
     * Dependencies as constructor arguments
     * @type {string[]}
     */
    static get requires() {
        return [ 'app', 'config', 'logger', 'connectionsList' ];
    }

    /**
     * Event name
     * @type {string}
     */
    get name() {
        return 'attach_request';
    }

    /**
     * Event handler
     * @param {string} id           ID of the client
     * @param {object} message      The message
     * @return {Promise}
     */
    async handle(id, message) {
        let client = this.daemon.clients.get(id);
        if (!client)
            return;

        this._logger.debug('attach-request', `Got ATTACH REQUEST`);
        try {
            let relayId = uuid.v1();

            let timer, onResponse;
            let reply = (value, updates) => {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }

                if (onResponse)
                    this.tracker.removeListener('attach_response', onResponse);

                let reply = this.daemon.AttachResponse.create({
                    response: value,
                    updates: updates,
                });
                let relay = this.daemon.ServerMessage.create({
                    type: this.daemon.ServerMessage.Type.ATTACH_RESPONSE,
                    attachResponse: reply,
                });
                let data = this.daemon.ServerMessage.encode(relay).finish();
                this._logger.debug('attach-request', `Sending ATTACH RESPONSE`);
                this.daemon.send(id, data);
            };

            let server = this.tracker.getServer(message.attachRequest.trackerName);
            if (!server || !server.connected)
                return reply(this.daemon.AttachResponse.Result.NO_TRACKER);
            if (!server.registered)
                return reply(this.daemon.AttachResponse.Result.NOT_REGISTERED);
            let info = this._connectionsList.getImport(
                server.name,
                message.attachRequest.path[0] === '/' ? server.email + message.attachRequest.path : message.attachRequest.path
            );
            if (!info || !info.token)
                return reply(this.daemon.AttachResponse.Result.REJECTED);

            onResponse = (name, response) => {
                if (response.messageId !== relayId)
                    return;

                this._logger.debug('attach-request', `Got ATTACH RESPONSE from tracker`);
                reply(
                    response.attachResponse.response,
                    response.attachResponse.updates
                );
            };
            this.tracker.on('attach_response', onResponse);

            timer = setTimeout(
                () => reply(this.daemon.AttachResponse.Result.TIMEOUT),
                this.daemon.constructor.requestTimeout
            );

            let request = this.tracker.AttachRequest.create({
                token: info.token,
                path: message.attachRequest.path,
                addressOverride: message.attachRequest.addressOverride,
                portOverride: message.attachRequest.portOverride,
            });
            let relay = this.tracker.ClientMessage.create({
                type: this.tracker.ClientMessage.Type.ATTACH_REQUEST,
                messageId: relayId,
                attachRequest: request,
            });
            let data = this.tracker.ClientMessage.encode(relay).finish();
            this.tracker.send(message.attachRequest.trackerName, data);
        } catch (error) {
            this._logger.error(new NError(error, 'AttachRequest.handle()'));
        }
    }
}

module.exports = AttachRequest;
