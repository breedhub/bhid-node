/**
 * Set Connections Request event
 * @module daemon/events/set-connections-request
 */
const debug = require('debug')('bhid:daemon');
const uuid = require('uuid');
const WError = require('verror').WError;

/**
 * Set Connections Request event class
 */
class SetConnectionsRequest {
    /**
     * Create service
     * @param {App} app                             The application
     * @param {object} config                       Configuration
     * @param {ConnectionsList} connectionsList     Connections List service
     */
    constructor(app, config, connectionsList) {
        this._app = app;
        this._config = config;
        this._connectionsList = connectionsList;
    }

    /**
     * Service name is 'modules.daemon.events.setConnectionsRequest'
     * @type {string}
     */
    static get provides() {
        return 'modules.daemon.events.setConnectionsRequest';
    }

    /**
     * Dependencies as constructor arguments
     * @type {string[]}
     */
    static get requires() {
        return [ 'app', 'config', 'modules.peer.connectionsList' ];
    }

    /**
     * Event handler
     * @param {string} id           ID of the client
     * @param {object} message      The message
     */
    handle(id, message) {
        let client = this.daemon.clients.get(id);
        if (!client)
            return;

        debug(`Got SET CONNECTIONS REQUEST`);
        try {
            let reply = value => {
                let reply = this.daemon.SetConnectionsResponse.create({
                    response: value,
                });
                let result = this.daemon.ServerMessage.create({
                    type: this.daemon.ServerMessage.Type.SET_CONNECTIONS_RESPONSE,
                    setConnectionsResponse: reply,
                });
                let data = this.daemon.ServerMessage.encode(result).finish();
                debug(`Sending SET CONNECTIONS RESPONSE`);
                this.daemon.send(id, data);
            };

            if (this._connectionsList.set(message.setConnectionsRequest.trackerName, message.setConnectionsRequest.list))
                reply(this.daemon.SetConnectionsResponse.Result.ACCEPTED);
            else
                reply(this.daemon.SetConnectionsResponse.Result.REJECTED);
        } catch (error) {
            this.daemon._logger.error(new WError(error, 'SetConnectionsRequest.handle()'));
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

module.exports = SetConnectionsRequest;