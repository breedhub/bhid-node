/**
 * Import Connections Request event
 * @module daemon/events/import-connections-request
 */
const debug = require('debug')('bhid:daemon');
const uuid = require('uuid');
const WError = require('verror').WError;

/**
 * Import Connections Request event class
 */
class ImportConnectionsRequest {
    /**
     * Create service
     * @param {App} app                             The application
     * @param {object} config                       Configuration
     * @param {Logger} logger                       Logger service
     * @param {ConnectionsList} connectionsList     Connections List service
     */
    constructor(app, config, logger, connectionsList) {
        this._app = app;
        this._config = config;
        this._logger = logger;
        this._connectionsList = connectionsList;
    }

    /**
     * Service name is 'modules.daemon.events.importConnectionsRequest'
     * @type {string}
     */
    static get provides() {
        return 'modules.daemon.events.importConnectionsRequest';
    }

    /**
     * Dependencies as constructor arguments
     * @type {string[]}
     */
    static get requires() {
        return [ 'app', 'config', 'logger', 'modules.peer.connectionsList' ];
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

        debug(`Got IMPORT CONNECTIONS REQUEST`);
        try {
            let reply = value => {
                let reply = this.daemon.ImportConnectionsResponse.create({
                    response: value,
                });
                let result = this.daemon.ServerMessage.create({
                    type: this.daemon.ServerMessage.Type.IMPORT_CONNECTIONS_RESPONSE,
                    importConnectionsResponse: reply,
                });
                let data = this.daemon.ServerMessage.encode(result).finish();
                debug(`Sending IMPORT CONNECTIONS RESPONSE`);
                this.daemon.send(id, data);
            };

            this._connectionsList.import(
                message.importConnectionsRequest.trackerName || this.tracker.default,
                message.importConnectionsRequest.token,
                message.importConnectionsRequest.list
            );

            reply(this.daemon.ImportConnectionsResponse.Result.ACCEPTED);
        } catch (error) {
            this._logger.error(new WError(error, 'UpdateConnectionsRequest.handle()'));
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

module.exports = ImportConnectionsRequest;