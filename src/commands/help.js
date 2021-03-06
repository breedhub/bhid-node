/**
 * Help command
 * @module commands/help
 */
const argvParser = require('argv');
const Base = require('./base');

/**
 * Command class
 */
class Help extends Base {
    /**
     * Create the service
     * @param {App} app                 The application
     * @param {object} config           Configuration
     * @param {Util} util               Utility service
     */
    constructor(app, config, util) {
        super(app);
        this._config = config;
        this._util = util;
    }

    /**
     * Service name is 'commands.help'
     * @type {string}
     */
    static get provides() {
        return 'commands.help';
    }

    /**
     * Dependencies as constructor arguments
     * @type {string[]}
     */
    static get requires() {
        return [ 'app', 'config', 'util' ];
    }

    /**
     * Run the command
     * @param {string[]} argv           Arguments
     * @return {Promise}
     */
    async run(argv) {
        let args = argvParser
            .option({
                name: 'help',
                short: 'h',
                type: 'boolean',
            })
            .run(argv);

        if (args.targets.length < 2)
            return this.usage();

        let method = this[`help${this._util.dashedToCamel(args.targets[1], true)}`];
        if (typeof method !== 'function')
            return this.usage();

        return method.call(this, argv);
    }

    /**
     * General help
     * @return {Promise}
     */
    async usage() {
        await this._app.info(
            'Usage:\tbhidctl <command> [<parameters]\n\n' +
            'Commands:\n' +
            '\thelp\t\tPrint help about any other command\n' +
            '\tinstall\t\tRegister the program in the system\n' +
            '\tinit\t\tInitialize the account\n' +
            '\tconfirm\t\tConfirm email\n' +
            '\tdaemons\t\tPrint your daemons list\n' +
            '\tregister\tRegister new daemon\n' +
            '\tunregister\tDelete a daemon\n' +
            '\tauth\t\tSet and save token for the daemon\n' +
            '\tload\t\tLoad current connection configuration from tracker\n' +
            '\ttree\t\tPrint user tree\n' +
            '\tconnections\tPrint this daemon connections\n' +
            '\tcreate\t\tCreate new connection\n' +
            '\tdelete\t\tDelete a connection\n' +
            '\timport\t\tImport a token\n' +
            '\tattach\t\tMake this daemon a server or a client of a connection\n' +
            '\tdetach\t\tDetach this daemon from given connection\n' +
            '\trattach\t\tMake any your daemon a server or a client of your connection\n' +
            '\trdetach\t\tDetach your daemon from given connection\n' +
            '\tredeem\t\tRedeem account, daemon or connection token\n' +
            '\tstart\t\tStart the daemon\n' +
            '\tstop\t\tStop the daemon\n' +
            '\trestart\t\tRestart the daemon\n' +
            '\tstatus\t\tQuery running status of the daemon'
        );
        process.exit(0);
    }

    /**
     * Help command
     * @return {Promise}
     */
    async helpHelp(argv) {
        await this._app.info(
            'Usage:\tbhidctl help <command>\n\n' +
            '\tPrint help for the given command'
        );
        process.exit(0);
    }

    /**
     * Install command
     * @return {Promise}
     */
    async helpInstall(argv) {
        await this._app.info(
            'Usage:\tbhidctl install\n\n' +
            '\tThis command will register the program in the system\n' +
            '\tand will create configuration in /etc/bhid by default'
        );
        process.exit(0);
    }

    /**
     * Init command
     * @return {Promise}
     */
    async helpInit(argv) {
        await this._app.info(
            'Usage:\tbhidctl init <email> [-t <tracker>]\n\n' +
            '\tInitialize your account on the tracker\n' +
            '\tYou will receive a confirmation email'
        );
        process.exit(0);
    }

    /**
     * Confirm command
     * @return {Promise}
     */
    async helpConfirm(argv) {
        await this._app.info(
            'Usage:\tbhidctl confirm <token> [-t <tracker>]\n\n' +
            '\tConfirm account creation'
        );
        process.exit(0);
    }

    /**
     * Register command
     * @return {Promise}
     */
    async helpRegister(argv) {
        await this._app.info(
            'Usage:\tbhidctl register [<daemon-name>] [-r] [-a] [-q] [-t <tracker>]\n\n' +
            '\tCreate new daemon. If name and -r flag are set then random digits to the name\n' +
            '\tprovided will be appended. Without -r the exact name will be used. If no name\n' +
            '\tis given it will be random. If -a is set then auth command will be ran.\n' +
            '\tIf -q is set then only daemon token will be printed with no additional text\n\n' +
            '\tRequires master token'
        );
        process.exit(0);
    }

    /**
     * Unregister command
     * @return {Promise}
     */
    async helpUnregister(argv) {
        await this._app.info(
            'Usage:\tbhidctl unregister <daemon-name> [-t <tracker>]\n\n' +
            '\tDelete daemon record from tracker\n\n' +
            '\tRequires master token'
        );
        process.exit(0);
    }

    /**
     * Auth command
     * @return {Promise}
     */
    async helpAuth(argv) {
        await this._app.info(
            'Usage:\tbhidctl auth <token> [-l] [-t <tracker>]\n\n' +
            '\tSet and save the token of this daemon. With -l flag "load -f" command will be executed.'
        );
        process.exit(0);
    }

    /**
     * Create command
     * @return {Promise}
     */
    async helpCreate(argv) {
        await this._app.info(
            'Usage:\tbhidctl create <path> <connect-addr> [<listen-addr>] [-s|-c] [-e] [-f] [-t <tracker>]\n\n' +
            '\tCreate a new connection. If -s is set then this daemon is configured as server of this connection,\n' +
            '\tor as client when -c is set. If -e is set then connection is encrypted. If -f is set then\n' +
            '\tconnection is fixed (clients list is saved and unknown clients will not be accepted by a daemon\n' +
            '\tuntil next "load" command run on the daemon, daemons also will not be allowed to change RSA keys).\n\n' +
            '\t<connect-addr> and <listen-addr> are written in the form of host:port or just /path/to/unix/socket.\n' +
            '\tListen host and port can contain * symbol for any host or random port respectively. Default listen\n' +
            '\taddress is *:*.\n\n' +
            '\tRequires master token'
        );
        process.exit(0);
    }

    /**
     * Delete command
     * @return {Promise}
     */
    async helpDelete(argv) {
        await this._app.info(
            'Usage:\tbhidctl delete <path> [-t <tracker>]\n\n' +
            '\tDelete path recursively with all the connections\n\n' +
            '\tRequires master token'
        );
        process.exit(0);
    }

    /**
     * Import command
     * @return {Promise}
     */
    async helpImport(argv) {
        await this._app.info(
            'Usage:\tbhidctl import <token> [-t <tracker>]\n\n' +
            '\tImport the token and make its connections ready to be attached to'
        );
        process.exit(0);
    }

    /**
     * Attach command
     * @return {Promise}
     */
    async helpAttach(argv) {
        await this._app.info(
            'Usage:\tbhidctl attach <path> [<addr-override>] [-t <tracker>]\n\n' +
            '\tAttach the daemon to the given path imported previously\n\n' +
            '\tAddress is in the form of host:port or /path/to/unix/socket. If host or port value is omitted\n' +
            '\tthen default will be used (set with "create" command). Client connection listen address override\n' +
            '\thost or port can contain * symbol, which means all interfaces and random port respectively. Server\n' +
            '\tconnection address override cannot contain *.'
        );
        process.exit(0);
    }

    /**
     * Rattach command
     * @return {Promise}
     */
    async helpRattach(argv) {
        await this._app.info(
            'Usage:\tbhidctl rattach <path> <daemon-name> [<addr-override>] [-s] [-t <tracker>]\n\n' +
            '\tAttach specified daemon to the given path of your connection\n' +
            '\tUse -s flag for the daemon to become a server, it will be client otherwise.\n\n' +
            '\tAddress is in the form of host:port or /path/to/unix/socket. If host or port value is omitted\n' +
            '\tthen default will be used (set with "create" command). Client connection listen address override\n' +
            '\thost or port can contain * symbol, which means all interfaces and random port respectively. Server\n' +
            '\tconnection address override cannot contain *.\n\n' +
            '\tRequires master token'
        );
        process.exit(0);
    }

    /**
     * Detach command
     * @return {Promise}
     */
    async helpDetach(argv) {
        await this._app.info(
            'Usage:\tbhidctl detach <path> [-t <tracker>]\n\n' +
            '\tDetach the daemon from a connection without deleting the connection on the tracker'
        );
        process.exit(0);
    }

    /**
     * Rdetach command
     * @return {Promise}
     */
    async helpRdetach(argv) {
        await this._app.info(
            'Usage:\tbhidctl rdetach <path> <daemon-name> [-t <tracker>]\n\n' +
            '\tDetach specified daemon from a connection without deleting the connection on the tracker\n\n' +
            '\tRequires master token'
        );
        process.exit(0);
    }

    /**
     * Tree command
     * @return {Promise}
     */
    async helpTree(argv) {
        await this._app.info(
            'Usage:\tbhidctl tree [<path>] [-d <daemon-name>] [-t <tracker>]\n\n' +
            '\tPrint tree of connections of this account'
        );
        process.exit(0);
    }

    /**
     * Connections command
     * @return {Promise}
     */
    async helpConnections(argv) {
        await this._app.info(
            'Usage:\tbhidctl connections [<path>] [-n] [-t <tracker>]\n\n' +
            '\tPrint this daemon connections. Use -n for no-header version.'
        );
        process.exit(0);
    }

    /**
     * Daemons command
     * @return {Promise}
     */
    async helpDaemons(argv) {
        await this._app.info(
            'Usage:\tbhidctl daemons [<path>] [-n] [-t <tracker>]\n\n' +
            '\tPrints the list of all your daemons or daemons attached to <path>.\n' +
            '\tUse -n for no-header version.'
        );
        process.exit(0);
    }

    /**
     * Load command
     * @return {Promise}
     */
    async helpLoad(argv) {
        await this._app.info(
            'Usage:\tbhidctl load [-f] [-t <tracker>]\n\n' +
            '\tRetrieve and save locally connection configuration. If -f is set no confirmation is asked'
        );
        process.exit(0);
    }

    /**
     * Redeem command
     * @return {Promise}
     */
    async helpRedeem(argv) {
        await this._app.info(
            'Usage:\tbhidctl redeem <email> [-t <tracker>]\n' +
                  '\tbhidctl redeem <daemon-name> [-t <tracker>]\n' +
                  '\tbhidctl redeem <path> [-s|-c] [-t <tracker>]\n\n' +
            '\tRedeem account, daemon or connection token. If -c is set the client token will be\n' +
            '\tregenerated (default), or server token if -s is set.\n\n' +
            '\tRedeeming daemon or connection requires master token'
        );
        process.exit(0);
    }

    /**
     * Start command
     * @return {Promise}
     */
    async helpStart(argv) {
        await this._app.info(
            'Usage:\tbhidctl start [-i]\n\n' +
            '\tThis command will start the daemon. Install command will be ran before\n' +
            '\tstarting the daemon if -i is set.'
        );
        process.exit(0);
    }

    /**
     * Stop command
     * @return {Promise}
     */
    async helpStop(argv) {
        await this._app.info(
            'Usage:\tbhidctl stop\n\n' +
            '\tThis command will stop the daemon'
        );
        process.exit(0);
    }

    /**
     * Restart command
     * @return {Promise}
     */
    async helpRestart(argv) {
        await this._app.info(
            'Usage:\tbhidctl restart [-i]\n\n' +
            '\tThis command will stop and start the daemon. Install command will be ran after\n' +
            '\tstopping the daemon if -i is set.'
        );
        process.exit(0);
    }

    /**
     * Status command
     * @return {Promise}
     */
    async helpStatus(argv) {
        await this._app.info(
            'Usage:\tbhidctl status\n\n' +
            '\tThis command will print daemon status'
        );
        process.exit(0);
    }
}

module.exports = Help;
