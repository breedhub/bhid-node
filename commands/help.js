/**
 * Help command
 * @module commands/help
 */
const debug = require('debug')('bhid:command');

/**
 * Command class
 */
class Help {
    /**
     * Create the service
     * @param {App} app                 The application
     * @param {object} config           Configuration
     * @param {Util} util               Utility service
     */
    constructor(app, config, util) {
        this._app = app;
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
     * @param {object} argv             Minimist object
     * @return {Promise}
     */
    run(argv) {
        if (argv['_'].length < 2)
            return this.usage();

        let method = this[`help${this._util.dashedToCamel(argv['_'][1], true)}`];
        if (typeof method != 'function')
            return this.usage();

        return method.call(this, argv);
    }

    /**
     * General help
     */
    usage() {
        console.log('Usage:\tbhidctl <command>');
        console.log('Commands:');
        console.log('\thelp\t\tPrint help about any other command');
        console.log('\tinstall\t\tRegister the program in the system');
        console.log('\tinit\t\tInitialize the account');
        console.log('\tconfirm\t\tConfirm email');
        console.log('\tregister\tRegister new daemon');
        console.log('\tauth\t\tSet and save token for the daemon');
        console.log('\tcreate\t\tCreate new connection');
        console.log('\tdelete\t\tDelete a connection');
        console.log('\tconnect\t\tMake the daemon server or client of a connection');
        console.log('\tdisconnect\tDisconnect the daemon from given path');
        console.log('\ttree\t\tPrint user tree');
        console.log('\tload\t\tLoad current connection configuration from tracker');
        console.log('\tredeem\t\tRedeem account, daemon or connection token');
        console.log('\tstart\t\tStart the daemon');
        console.log('\tstop\t\tStop the daemon');
        process.exit(0);
    }

    /**
     * Help command
     */
    helpHelp(argv) {
        console.log('Usage:\tbhidctl help <command>\n');
        console.log('\tPrint help for the given command');
        process.exit(0);
    }

    /**
     * Install command
     */
    helpInstall(argv) {
        console.log('Usage:\tbhidctl install\n');
        console.log('\tThis command will register the program in the system');
        console.log('\tand will create configuration in /etc/bhid by default');
        process.exit(0);
    }

    /**
     * Init command
     */
    helpInit(argv) {
        console.log('Usage:\tbhidctl init <email> [-t <tracker>]\n');
        console.log('\tInitialize your account on the tracker');
        console.log('\tYou will receive a confirmation email');
        process.exit(0);
    }

    /**
     * Confirm command
     */
    helpConfirm(argv) {
        console.log('Usage:\tbhidctl confirm <token> [-t <tracker>]\n');
        console.log('\tConfirm account creation');
        process.exit(0);
    }

    /**
     * Register command
     */
    helpRegister(argv) {
        console.log('Usage:\tbhidctl register <master-token> [<daemon-name>] [-r] [-t <tracker>]\n');
        console.log('\tCreate new daemon. If name and -r flag are set then the name will be randomized');
        process.exit(0);
    }

    /**
     * Auth command
     */
    helpAuth(argv) {
        console.log('Usage:\tbhidctl auth <token> [-t <tracker>]\n');
        console.log('\tSet and save the token of this daemon');
        process.exit(0);
    }

    /**
     * Create command
     */
    helpCreate(argv) {
        console.log('Usage:\tbhidctl create <path> <connect-addr> <listen-addr>');
        console.log(      '\t               [-d <daemon-name>] [-s|-c] [-e] [-f] [-t <tracker>]\n');
        console.log(
            '\tCreate a new connection. If -s is set then the daemon is configured as server of this connection,\n' +
            '\tor as client when -c is set. If -e is set then connection is encrypted. If -f is set then\n' +
            '\tconnection is fixed (clients list is saved and unknown clients will not be accepted until next\n' +
            '\t"load" command run).\n\n' +
            '\t<connect-addr> and <listen-addr> are written in the form of address:port or just /path/to/unix/socket'
        );
        process.exit(0);
    }

    /**
     * Delete command
     */
    helpDelete(argv) {
        console.log('Usage:\tbhidctl delete <path> [-t <tracker>]\n');
        console.log('\tDelete path recursively with all the connections');
        process.exit(0);
    }

    /**
     * Connect command
     */
    helpConnect(argv) {
        console.log('Usage:\tbhidctl connect <token> [-d <daemon-name>] [-t <tracker>]\n');
        console.log('\tConnect the daemon to the network with the help of the token');
        process.exit(0);
    }

    /**
     * Disconnect command
     */
    helpDisconnect(argv) {
        console.log('Usage:\tbhidctl disconnect <path> [-d <daemon-name>] [-t <tracker>]\n');
        console.log('\tDisconnect the daemon without deleting the connection information and affecting other daemons');
        process.exit(0);
    }

    /**
     * Tree command
     */
    helpTree(argv) {
        console.log('Usage:\tbhidctl tree [<path>] [-d <daemon-name>] [-t <tracker>]\n');
        console.log('\tPrint tree of connections of this account');
        process.exit(0);
    }

    /**
     * Load command
     */
    helpLoad(argv) {
        console.log('Usage:\tbhidctl load [-q] [-t <tracker>]\n');
        console.log('\tRetrieve and save locally connection configuration. If -q is set no confirmation is asked');
        process.exit(0);
    }

    /**
     * Redeem command
     */
    helpRedeem(argv) {
        console.log('Usage:\tbhidctl redeem <email> [-t <tracker>]');
        console.log(      '\tbhidctl redeem <master-token> <daemon-name> [-t <tracker>]');
        console.log(      '\tbhidctl redeem <master-token> <path> [-s|-c] [-t <tracker>]\n');
        console.log('\tRedeem account, daemon or connection token. If -c is set the client token will be');
        console.log('\tregenerated (default), or server token if -s is set.');
        process.exit(0);
    }

    /**
     * Start command
     */
    helpStart(argv) {
        console.log('Usage:\tbhidctl start\n');
        console.log('\tThis command will start the daemon');
        console.log('\tYou might want to run "systemctl bhid start" instead');
        process.exit(0);
    }

    /**
     * Stop command
     */
    helpStop(argv) {
        console.log('Usage:\tbhidctl stop\n');
        console.log('\tThis command will stop the daemon');
        console.log('\tYou might want to run "systemctl bhid stop" instead');
        process.exit(0);
    }

    /**
     * Restart command
     */
    helpRestart(argv) {
        console.log('Usage:\tbhidctl restart\n');
        console.log('\tThis command will stop and start the daemon');
        console.log('\tYou might want to run "systemctl bhid restart" instead');
        process.exit(0);
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

module.exports = Help;