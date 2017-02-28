/**
 * Restart command
 * @module commands/restart
 */
const debug = require('debug')('bhid:command');
const path = require('path');

/**
 * Command class
 */
class Restart {
    /**
     * Create the service
     * @param {App} app                 The application
     * @param {object} config           Configuration
     * @param {Start} start             Start command
     * @param {Stop} stop               Stop command
     */
    constructor(app, config, start, stop) {
        this._app = app;
        this._config = config;
        this._start = start;
        this._stop = stop;
    }

    /**
     * Service name is 'commands.restart'
     * @type {string}
     */
    static get provides() {
        return 'commands.restart';
    }

    /**
     * Dependencies as constructor arguments
     * @type {string[]}
     */
    static get requires() {
        return [ 'app', 'config', 'commands.start', 'commands.stop' ];
    }

    /**
     * Run the command
     * @param {object} argv             Minimist object
     * @return {Promise}
     */
    run(argv) {
        return this._stop.terminate()
            .then(() => {
                return this._start.launch();
            })
            .then(() => {
                process.exit(0);
            })
            .catch(error => {
                this.error(error.message);
            })
    }

    /**
     * Log error and terminate
     * @param {...*} args
     */
    error(...args) {
        console.error(...args);
        process.exit(1);
    }
}

module.exports = Restart;