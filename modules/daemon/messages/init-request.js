/**
 * Init Request message
 * @module daemon/messages/init-request
 */
const debug = require('debug')('bhit:message');
const uuid = require('uuid');
const WError = require('verror').WError;

/**
 * Init Request message class
 */
class InitRequest {
    /**
     * Create service
     * @param {App} app                         The application
     * @param {object} config                   Configuration
     */
    constructor(app, config) {
        this._app = app;
        this._config = config;
    }

    /**
     * Service name is 'modules.daemon.messages.initRequest'
     * @type {string}
     */
    static get provides() {
        return 'modules.daemon.messages.initRequest';
    }

    /**
     * Dependencies as constructor arguments
     * @type {string[]}
     */
    static get requires() {
        return [ 'app', 'config' ];
    }

    /**
     * Message handler
     * @param {string} id           ID of the client
     * @param {object} message      The message
     */
    onMessage(id, message) {
        let client = this.daemon.clients.get(id);
        if (!client)
            return;

        debug(`Got INIT REQUEST`);
        try {
            let relayId = uuid.v1();

            let onResponse = (name, response) => {
                if (name != message.initRequest.trackerName || response.messageId != relayId)
                    return;

                this.tracker.removeListener('init_response', onResponse);

                let reply = this.daemon.InitResponse.create({
                    response: response.initResponse.response,
                });
                let relay = this.daemon.ClientMessage.create({
                    type: this.daemon.ClientMessage.Type.INIT_RESPONSE,
                    initResponse: reply,
                });
                let data = this.daemon.ClientMessage.encode(relay).finish();
                this.daemon.send(id, data);
            };
            this.tracker.on('init_response', onResponse);

            let request = this.tracker.InitRequest.create({
                email: message.initRequest.email,
                daemonName: message.initRequest.daemonName,
            });
            let relay = this.tracker.ClientMessage.create({
                type: this.tracker.ClientMessage.Type.INIT_REQUEST,
                messageId: relayId,
                initRequest: request,
            });
            let data = this.tracker.ClientMessage.encode(relay).finish();
            this.tracker.send(message.initRequest.trackerName, data);
        } catch (error) {
            this._daemon._logger.error(new WError(error, 'InitRequest.onMessage()'));
        }
    }

    /**
     * Retrieve daemon server
     * @return {Daemon}
     */
    get daemon() {
        if (this._daemon)
            return this._daemon;
        this._daemon = this._app.get('servers').get('daemon');
        return this._daemon;
    }

    /**
     * Retrieve tracker server
     * @return {Tracker}
     */
    get tracker() {
        if (this._tracker)
            return this._tracker;
        this._tracker = this._app.get('servers').get('tracker');
        return this._tracker;
    }
}

module.exports = InitRequest;