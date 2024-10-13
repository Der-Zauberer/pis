//@ts-check

const FileSystem = require('node:fs');
const Path = require('path');

/**********************
*   Types %& Consts   *
**********************/

const CLI_RESET = '\x1b[0m';
const CLI_RED = '\x1b[31m';
const CLI_YELLOW = '\x1b[33m';
const CLI_GREEN = '\x1b[32m';
const CLI_BLUE = '\x1b[36m';

class Command {
    /** @type { (args: any[]) => void } */
    function;
    /** @type { string } */
    usage;
    /** @type { string } */
    description;
}

/**********
*   Cli   *
**********/

class CliService {

    executeCommand() {
        let branch = commands;
        let args = process.argv.slice(2);
        do {
            this.throwError(args.length === 0, `Not enough arguments! Possible arguments: ${Object.keys(branch)}`);
            if (args[0] === 'help') {
                for (const entry of this.#getHelp(branch)) {
                    console.log(`${entry.usage}\t\t${entry.description}`)
                }
                return;
            }
            const next = branch[args[0]];
            this.throwError(!next, `Command branch "${args[0]}" doesn't exists!`);
            branch = next;
            args = args.slice(1);
        } while (!(typeof branch.function === 'function'));
        branch.function(...args);
    }

    /**
     * @param { object | Command } branch
     * @returns { Command[] }
     */
    #getHelp(branch) {
        const /** @type {Command[]} */ list = []; 
        for (const entry of Object.values(branch)) {
            if (entry.function) {
                list.push(entry);
            } else {
                list.push(...this.#getHelp(entry));
            }
        }
        return list;
    }

    /**
     * @param { boolean } condition
     * @param { string } error
     */
    throwError(condition, error) {
        if (!condition) return;
        console.log(`${CLI_RED}ERROR: ${error}${CLI_RESET}`);
        process.exit(-1);
    }

}

class ProgressLogger {

    /** @type { string } */
    #name;
    /** @type { string } */
    #type;
    /** @type { (() => void) | undefined } */
    #removeTemporaryLastLine = undefined;
    /** @type { (() => void) | undefined } */
    #stopLoading = undefined;

    /**
     * @param { string } name
     * @param { string } type
     */
    constructor(name, type) {
        this.#name = name;
        this.#type = type;
    }

    /**
     * @param { string } message
     * @param { any } [response]
     * @returns { any }
     */
    log(message, response) {
        this.#removeTemporaryLastLine?.();
        this.#stopLoading?.();
        console.log(`${CLI_BLUE}[${this.#name}]${CLI_RESET} ${message}`);
        return response;
    }

    /**
     * @param { string } message
     * @param { any } [response]
     * @returns { any }
     */
    loading(message, response) {
        this.#removeTemporaryLastLine?.();
        this.#stopLoading?.();
        console.log(`${CLI_BLUE}[${this.#name}]${CLI_RESET} ${message}`);
        const logLoading = (count) => {
            process.stdout.moveCursor(0, -1);
            process.stdout.clearLine(1);
            console.log(`${CLI_BLUE}[${this.#name}]${CLI_RESET} ${message} ${'.'.repeat(count)}`);
        }
        let i = 0;
        const interval = setInterval(() => {
            if (i === 4) i = 0;
            logLoading(i++);
        }, 250);
        this.#stopLoading = () => {
            clearInterval(interval);
            logLoading(0);
            this.#stopLoading = undefined;
        }
        return response;
    }

    /**
     * @param { number } index
     * @param { number } amount
     * @param { string } name
     * @param { any } [response]
     * @returns { any }
     */
    progress(index, amount, name, response) {
        this.#removeTemporaryLastLine?.();
        this.#stopLoading?.();
        console.log(`${CLI_BLUE}[${this.#name}]${CLI_RESET} ${ ((index / amount) * 100).toFixed(0) }% (${index}/${amount}) Processing ${this.#name} ${name}`);
        this.#removeTemporaryLastLine = () => {
            process.stdout.moveCursor(0, -1);
            process.stdout.clearLine(1);
            this.#removeTemporaryLastLine = undefined;
        }
        return response;
    }

    /**
     * @param {number} amount
     */
    finish(amount) {
        this.#removeTemporaryLastLine?.();
        this.#stopLoading?.();
        console.log(`${CLI_BLUE}[${this.#name}]${CLI_RESET} Successfully processed ${amount ? amount + ' ' : ''}${this.#type}`);
    }

}

/***********
*   File   *
***********/

class FileService {

    /**
     * @param { string | undefined } path
     * @param { string } name
     */
    readFile(path, name) {
        FileSystem.readFileSync(path ? Path.join(path, name) : name, 'utf8');
    }

    /**
     * @param { string | undefined } path
     * @param { string } name
     * @param { string } content
     */
    writeFile(path, name, content) {
        const filePath = path ? Path.join(path, name) : name;
        const directory = Path.dirname(filePath);
        if (directory && !FileSystem.existsSync(directory)) FileSystem.mkdirSync(directory);
        FileSystem.writeFileSync(filePath, content, 'utf8');
    }

}

/***********
*   Test   *
***********/

class TestService {

    test() {
        const WARMUP_CYCLES = 100;
        const EXECUTION_CYCLES = 10000;
        let passedCount = 0;
        let failedCount = 0;
        for (const test of tests) {
            const result = test.execute();
            for (let i = 0; i < WARMUP_CYCLES; i++) test.execute();
            const durations = []
            for (let i = 0; i < EXECUTION_CYCLES; i++) {
                const startTime = performance.now();
                test.execute();
                const endTime = performance.now();
                durations.push((endTime - startTime) * 1e3);
            }
            const average = durations.length ? durations.reduce((a, b) => a + b) / durations.length : 0;
            if (test.expect === result) {
                console.log(`${CLI_GREEN}TEST PASSED:${CLI_RESET} ${test.name} (${average.toFixed(3)}µs)`);
                passedCount++;
            } else {
                console.log(`${CLI_RED}TEST FAILED:${CLI_RESET} ${test.name} (${average.toFixed(3)}µs)`);
                console.log(`\tExpected: ${CLI_BLUE}${test.expect}${CLI_RESET}`);
                console.log(`\tResult: ${CLI_RED}${CLI_RED}${result}${CLI_RESET}`);
                failedCount++;
            }
        }
        console.log(`${CLI_GREEN}${passedCount}${CLI_RESET} tests passed, ${CLI_RED}${failedCount}${CLI_RESET} tests failed!`);
    }

}

/*************
*   Search   *
*************/

class SearchService {

    /**
     * @param { string } name
     * @param { string } [seperator]
     * @returns { string }
     */
    normalize(name, seperator) {
        let formatted = '';
        let blank = false;
        const replacements = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
        for (let char of name.toLowerCase()) {
            if (replacements[char]) {
                formatted += replacements[char];
                blank = false;
            } else if (char === ' ' || char === '/' || char === '-' || char === '(' || char === ')') {
                if (!blank) {
                    if (seperator) formatted += seperator;
                    blank = true;
                }
            } else if ((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9')) {
                formatted += char;
                blank = false;
            } else if (char.charCodeAt(0) > 127) {
                const normalized = char.normalize('NFD');
                if (char !== normalized) formatted += normalized[0];
            }
        }
        return formatted;
    }
    
    /**
     * @param { string } search
     * @param {{ searchName: string; score: number; }} a
     * @param {{ searchName: string; score: number; }} b
     */
    beginnScoreMatching(search, a, b) {
        const aStartsWithName = a.searchName.startsWith(search);
        const bStartsWithName = b.searchName.startsWith(search);
        if (aStartsWithName && !bStartsWithName) return 1;
        else if (!aStartsWithName && bStartsWithName) return -1;
        else return b.score - a.score;
    }

}

/***************
*   Download   *
***************/

class DownloadService {

    /**
     * @param { string } clientId
     * @param { string } apikey
     * @param { string } [path]
     */
    downloadApiDBStada(clientId, apikey, path) {
        cliService.throwError(!clientId || !apikey, `Require client-id and api-key as argumnets!`);
        const outputAsFile = path?.endsWith('.json');
        const url = 'https://apis.deutschebahn.com/db-api-marketplace/apis/station-data/v2/stations'
        const headers = { 'DB-Client-Id': clientId, 'DB-Api-Key': apikey }
        const logger = new ProgressLogger('DB/Stada', 'stations');
        logger.loading(`Downloading stations from ${url}`);
        fetch(url, { headers })
            .then(response => logger.loading('Parsing stations', response))
            .then(response => response.ok ? response.json() : Promise.reject())
            .then(response => {
                let i = 1;
                const newStations = [];
                for (const station of response.result) {
                    try {
                        if (station.evaNumbers.length == 0) {
                            i++;
                            continue;
                        }
                        const newStation = {
                            id: searchService.normalize(station.name, '_'),
                            name: station.name,
                            score: station.category,
                            location: false ? {} : {
                                latitude: station.evaNumbers[0].geographicCoordinates.coordinates[1],
                                longitude: station.evaNumbers[0].geographicCoordinates.coordinates[0]
                            },
                            address: {
                                street: station.mailingAddress.street.replace('str.', 'straße').replace('  ', ' '),
                                zipcode: station.mailingAddress.zipcode,
                                city: station.mailingAddress.city,
                                federalState: station.federalState,
                                country: 'Deutschland'
                            },
                            open: !station.localServiceStaff || !station.localServiceStaff.availability ? {} : {
                                monday: station.localServiceStaff.availability.monday ? station.localServiceStaff.availability.monday.fromTime + ' - ' + station.localServiceStaff.availability.monday.toTime : undefined,
                                tuesday: station.localServiceStaff.availability.tuesday ? station.localServiceStaff.availability.tuesday.fromTime + ' - ' + station.localServiceStaff.availability.tuesday.toTime : undefined,
                                wednesday: station.localServiceStaff.availability.wednesday ? station.localServiceStaff.availability.wednesday.fromTime + ' - ' + station.localServiceStaff.availability.wednesday.toTime : undefined,
                                thursday: station.localServiceStaff.availability.thursday ? station.localServiceStaff.availability.thursday.fromTime + ' - ' + station.localServiceStaff.availability.thursday.toTime : undefined,
                                friday: station.localServiceStaff.availability.friday ? station.localServiceStaff.availability.friday.fromTime + ' - ' + station.localServiceStaff.availability.friday.toTime : undefined,
                                saturday: station.localServiceStaff.availability.saturday ? station.localServiceStaff.availability.saturday.fromTime + ' - ' + station.localServiceStaff.availability.saturday.toTime : undefined,
                                sunday: station.localServiceStaff.availability.sunday ? station.localServiceStaff.availability.sunday.fromTime + ' - ' + station.localServiceStaff.availability.sunday.toTime : undefined,
                            },
                            services: {
                                parking: station.hasParking,
                                localPublicTransport: station.hasBicycleParking,
                                carRental: station.hasCarRental,
                                taxi: station.hasTaxiRank,
                                publicFacilities: station.hasPublicFacilities,
                                travelNecessities: station.hasTravelNecessities,
                                locker: station.hasLockerSystem,
                                wifi: station.hasWiFi,
                                information: station.hasTravelCenter,
                                railwayMission: station.hasRailwayMission,
                                lostAndFound: station.hasLostAndFound,
                                barrierFree: (station.hasSteplessAccess === true || station.hasSteplessAccess === 'yes'),
                                mobilityService: station.hasMobilityService,
                            },
                            ids: {
                                eva: station.evaNumbers[0].number,
                                ril: station.ril100Identifiers.map((/** @type {{ rilIdentifier: any; }} */ ril) => ril.rilIdentifier),
                                stada: station.number,
                            },
                            sources: [
                                {
                                    name: 'DB Stada',
                                    url,
                                    timestamp: new Date().toISOString()
                                }
                            ]
                        }
                        
                        if (!outputAsFile) {
                            fileService.writeFile(path, newStation.id + '.json', JSON.stringify(newStation, undefined, '\t'));
                        } else {
                            newStations.push(newStation);
                        }
                        logger.progress(i++, response.result.length, newStation.name);
                    } catch (error) {
                        cliService.throwError(true, `Failed to parse ${station.id} (${error})`);
                    }
                }
                if (outputAsFile) {
                    fileService.writeFile(undefined, path || '', JSON.stringify(newStations, undefined, '\t'));
                }
                logger.finish(response.result.length);
            })
    }
}

/**************
*   General   *
**************/

const cliService = new CliService();
const fileService = new FileService();
const testService = new TestService();
const searchService = new SearchService();
const downloadService = new DownloadService();

const tests = [
    {
        name: "normalize() should return without seperator",
        execute: () => searchService.normalize('Fäßchen/Brücken-Straße (Brötchen)Compañía'),
        expect: 'faesschenbrueckenstrassebroetchencompania'
    },
    {
        name: "normalize() should return with blank seperator",
        execute: () => searchService.normalize('Fäßchen/Brücken-Straße (Brötchen)Compañía', ' '),
        expect: 'faesschen bruecken strasse broetchen compania'
    },
    {
        name: "normalize() should return with underscore seperator",
        execute: () => searchService.normalize('Fäßchen/Brücken-Straße (Brötchen)Compañía', '_'),
        expect: 'faesschen_bruecken_strasse_broetchen_compania'
    },
    {
        name: "beginnScoreMatching() should match first entry",
        execute: () => searchService.beginnScoreMatching('Karlsruhe', { searchName: 'Karlsruhe Hbf', score: 0 }, { searchName: 'Leipzig Karlsruher Straße', score: 0 }),
        expect: 1
    },
    {
        name: "beginnScoreMatching() should match second entry",
        execute: () => searchService.beginnScoreMatching('Karlsruhe', { searchName: 'Leipzig Karlsruher Straße', score: 0 }, { searchName: 'Karlsruhe Hbf', score: 0 }),
        expect: -1
    },
    {
        name: "beginnScoreMatching() should score first entry",
        execute: () => searchService.beginnScoreMatching('Karlsruhe', { searchName: 'Leipzig Karlsruher Straße', score: 0 }, { searchName: 'Karlsruhe Hbf', score: 1 }),
        expect: 1
    },
    {
        name: "beginnScoreMatching() should score second entry",
        execute: () => searchService.beginnScoreMatching('Karlsruhe', { searchName: 'Karlsruhe Hbf', score: 1 }, { searchName: 'Leipzig Karlsruher Straße', score: 0 }),
        expect: 1
    }
]

const commands = {
    download: {
        'DB/Stada': { 
            function: downloadService.downloadApiDBStada,
            usage: 'download DB/Stada <client-id> <api-key> [path|file]',
            description: 'Downloads station from the DB Stada API to multible or a single file'
        }
    },
    test: { 
        function: testService.test,
        usage: 'test',
        description: 'Runs all tests'
    }
}

cliService.executeCommand();