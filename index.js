var Service, Characteristic, Accessory;
var exec2 = require("child_process").exec;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    homebridge.registerAccessory('homebridge-samsung-airconditioner1', 'SamsungAirconditioner1', SamsungAirco1);
}

function SamsungAirco1(log, config) {
    this.log = log;
    this.name = config["name"];
    this.ip = config["ip"];
    this.token = config["token"];
    this.patchCert = config["patchCert"];
    this.baseUrl = `https://${this.ip}:8888/devices`; // Base URL for the API
}

SamsungAirco1.prototype = {

    execRequest: function(command) {
        return new Promise((resolve, reject) => {
            exec2(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    },

    buildCurlCommand: function(endpoint, method = 'GET', data = null) {
        let command = `curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ${this.token}" --cert ${this.patchCert} --insecure -X ${method} ${this.baseUrl}${endpoint}`;
        if (data) {
            command += ` -d '${JSON.stringify(data)}'`;
        }
        return command;
    },

    identify: function(callback) {
        this.log("장치 확인됨");
        callback(); // success
    },

    getServices: function() {
        this.aircoSamsung = new Service.HeaterCooler(this.name);

        this.aircoSamsung.getCharacteristic(Characteristic.Active)
            .on('get', this.getActive.bind(this))
            .on('set', this.setActive.bind(this));

        this.aircoSamsung.getCharacteristic(Characteristic.CurrentTemperature)
            .setProps({
                minValue: 0,
                maxValue: 50,
                minStep: 1
            })
            .on('get', this.getCurrentTemperature.bind(this));

        this.aircoSamsung.getCharacteristic(Characteristic.TargetHeaterCoolerState)
            .setProps({
                validValues: [2]
            })
            .on('get', this.getTargetHeaterCoolerState.bind(this))
            .on('set', this.setTargetHeaterCoolerState.bind(this));

        this.aircoSamsung.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
            .on('get', this.getCurrentHeaterCoolerState.bind(this));

        this.aircoSamsung.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .setProps({
                minValue: 18,
                maxValue: 30,
                minStep: 1
            })
            .on('get', this.getTargetTemperature.bind(this))
            .on('set', this.setTargetTemperature.bind(this));

        this.aircoSamsung.getCharacteristic(Characteristic.SwingMode)
            .on('get', this.getSwingMode.bind(this))
            .on('set', this.setSwingMode.bind(this));

        var informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer, 'Samsung')
            .setCharacteristic(Characteristic.Model, 'Air conditioner')
            .setCharacteristic(Characteristic.SerialNumber, 'AF16K7970WFN');

        return [informationService, this.aircoSamsung];
    },

    async getTargetTemperature(callback) {
        try {
            const command = this.buildCurlCommand('|jq \'.Devices[0].Temperatures[0].desired\'');
            const stdout = await this.execRequest(command);
            const temperature = parseInt(stdout);
            callback(null, temperature);
        } catch (error) {
            callback(error);
        }
    },

    async setTargetTemperature(value, callback) {
        try {
            const command = this.buildCurlCommand('/1/temperatures/0', 'PUT', { desired: value });
            await this.execRequest(command);
            callback(null, value);
        } catch (error) {
            callback(error);
        }
    },

    async getCurrentTemperature(callback) {
        try {
            const command = this.buildCurlCommand('|jq \'.Devices[0].Temperatures[0].current\'');
            const stdout = await this.execRequest(command);
            const temperature = parseInt(stdout);
            callback(null, temperature);
        } catch (error) {
            callback(error);
        }
    },

    async getSwingMode(callback) {
        try {
            const command = this.buildCurlCommand('|jq \'.Devices[0].Wind.direction\'');
            const stdout = await this.execRequest(command);
            const mode = stdout.trim().replace(/"/g, '');
            if (mode === "Fix") {
                callback(null, Characteristic.SwingMode.SWING_DISABLED);
            } else if (mode === "Up_And_Low") {
                callback(null, Characteristic.SwingMode.SWING_ENABLED);
            } else {
                this.log("회전 확인 오류");
                callback(new Error("Invalid Swing Mode"));
            }
        } catch (error) {
            callback(error);
        }
    },

    async setSwingMode(state, callback) {
        try {
            const direction = state === Characteristic.SwingMode.SWING_ENABLED ? "Up_And_Low" : "Fix";
            const command = this.buildCurlCommand('/1/wind', 'PUT', { direction });
            await this.execRequest(command);
            callback(null);
        } catch (error) {
            callback(error);
        }
    },

    async getActive(callback) {
        try {
            const command = this.buildCurlCommand('|jq \'.Devices[0].Operation.power\'');
            const stdout = await this.execRequest(command);
            const powerState = stdout.trim().replace(/"/g, '');
            const isActive = powerState === "On" ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
            callback(null, isActive);
        } catch (error) {
            callback(error);
        }
    },

    async setActive(state, callback) {
        try {
            const power = state === Characteristic.Active.ACTIVE ? "On" : "Off";
            const command = this.buildCurlCommand('/1', 'PUT', { Operation: { power } });
            await this.execRequest(command);
            callback(null);
        } catch (error) {
            callback(error);
        }
    },

    async getCurrentHeaterCoolerState(callback) {
        try {
            const command = this.buildCurlCommand('|jq \'.Devices[0].Mode.modes[0]\'');
            const stdout = await this.execRequest(command);
            const mode = stdout.trim().replace(/"/g, '');
            if (["CoolClean", "Cool", "Dry", "DryClean", "Auto", "Wind"].includes(mode)) {
                callback(null, Characteristic.CurrentHeaterCoolerState.COOLING);
            } else {
                this.log("현재 모드 확인 오류");
                callback(new Error("Invalid Heater Cooler State"));
            }
        } catch (error) {
            callback(error);
        }
    },

    async getTargetHeaterCoolerState(callback) {
        try {
            const command = this.buildCurlCommand('|jq \'.Devices[0].Mode.modes[0]\'');
            const stdout = await this.execRequest(command);
            const mode = stdout.trim().replace(/"/g, '');
            if (["CoolClean", "Cool", "Dry", "DryClean", "Auto", "Wind"].includes(mode)) {
                callback(null, Characteristic.TargetHeaterCoolerState.COOL);
            } else {
                this.log("목표 모드 확인 오류");
                callback(new Error("Invalid Target Heater Cooler State"));
            }
        } catch (error) {
            callback(error);
        }
    },

    async setTargetHeaterCoolerState(state, callback) {
        if (state === Characteristic.TargetHeaterCoolerState.COOL) {
            try {
                const command = this.buildCurlCommand('/1/mode', 'PUT', { modes: ["DryClean"] });
                await this.execRequest(command);
                this.aircoSamsung.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(Characteristic.CurrentHeaterCoolerState.COOLING);
                callback(null);
            } catch (error) {
                callback(error);
            }
        }
    }
};
