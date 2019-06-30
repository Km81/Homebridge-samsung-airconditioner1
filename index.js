var Service, Characteristic;
var exec2 = require("child_process").exec;
var response;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    //UUIDGen = homebridge.hap.uuid;
    homebridge.registerAccessory('homebridge-samsung-airconditioner', 'SamsungAirconditioner', SamsungAirco);
}

function SamsungAirco(log, config) {
    this.log = log;
    this.name = config["name"];
    this.ip = config["ip"];
    this.token = config["token"];
    this.patchCert = config["patchCert"];
    this.accessoryName = config["name"];
    this.setOn = true;
    this.setOff = false;
}

SamsungAirco.prototype = {

    execRequest: function(str, body, callback) {
        exec2(str, function(error, stdout, stderr) {
            callback(error, stdout, stderr)
        })
        //return stdout;
    },
    identify: function(callback) {
        this.log("장치 확인됨");
        callback(); // success
    },

    getServices: function() {

        //var uuid;
        //uuid = UUIDGen.generate(this.accessoryName);
        this.aircoSamsung = new Service.HeaterCooler(this.name);

        //전원 설정
        this.aircoSamsung.getCharacteristic(Characteristic.Active)
            .on('get', this.getActive.bind(this))
            .on('set', this.setActive.bind(this));

        //현재 온도
        this.aircoSamsung.getCharacteristic(Characteristic.CurrentTemperature)
            .setProps({
                minValue: 0,
                maxValue: 100,
                minStep: 0.01
            })
            .on('get', this.getCurrentTemperature.bind(this));

        //현재 모드 설정
        this.aircoSamsung.getCharacteristic(Characteristic.TargetHeaterCoolerState)
            .on('set', this.setCurrentHeaterCoolerState.bind(this))       
            .on('get', this.getCurrentHeaterCoolerState.bind(this));
   
        //현재 모드 확인
        this.aircoSamsung.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
            .on('set', this.setCurrentHeaterCoolerState.bind(this))       
            .on('get', this.getCurrentHeaterCoolerState.bind(this));

        //냉방모드 온도
        this.aircoSamsung.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .setProps({
                minValue: 16,
                maxValue: 30,
                minStep: 1
            })
            .on('get', this.getHeatingUpOrDwTemperature.bind(this))
            .on('set', this.setHeatingUpOrDwTemperature.bind(this));

        //난방모드 온도        
         this.aircoSamsung.getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .setProps({
                minValue: 16,
                maxValue: 30,
                minStep: 1
            })
            .on('get', this.getHeatingUpOrDwTemperature.bind(this))
            .on('set', this.setHeatingUpOrDwTemperature.bind(this)); 
        
        //스윙모드 설정
        this.aircoSamsung.getCharacteristic(Characteristic.SwingMode)
            .on('get', this.getSwingMode.bind(this))
            .on('set', this.setSwingMode.bind(this));  

        //바람세기 설정        
        this.aircoSamsung.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
		    	minValue: 0,
		    	maxValue: 5,
		    	minStep: 1,
		    })
		.on('get', this.getRotationSpeed.bind(this))
		.on('set', this.setRotationSpeed.bind(this));
		
        var informationService = new Service.AccessoryInformation();
            .setCharacteristic(Characteristic.Manufacturer, "Samsung");
            .setCharacteristic(Characteristic.Model, "Airconditioner");
            .setCharacteristic(Characteristic.SerialNumber, "Undefined");
        return [informationService, this.aircoSamsung];
    },

    //services


    getHeatingUpOrDwTemperature: function(callback) {
        var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[1].Temperatures[0].desired\'';

        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                body = parseInt(stdout);
                this.log("희망온도 확인 : " + stdout);

                callback(null, body);
                //callback();
            }
        }.bind(this))
        //callback(null, null);
    },

    setHeatingUpOrDwTemperature: function(temp, callback) {
        var body;

        str = 'curl -X PUT -d \'{"desired": ' + temp + '}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/temperatures/0';
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
            	this.log("희망온도 설정 : " + body);
                callback(null, temp);
                //callback();
            }
        }.bind(this));
    },
    
    getCurrentTemperature: function(callback) {
        var body;

        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[1].Temperatures[0].current\'';
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                //callback();
                body = parseInt(stdout);
                this.log("현재온도: " + body);
                this.aircoSamsung.getCharacteristic(Characteristic.CurrentTemperature).updateValue(body);
            }
            callback(null, body); //Mettere qui ritorno di stdout? o solo callback()
        }.bind(this));

    },

    getRotationSpeed: function(callback) {
        var str;
        var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[1].Wind.speedLevel\'';
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                //callback();
                body = parseInt(stdout)+1;
                this.log("현재풍속: " + body);
                this.aircoSamsung.getCharacteristic(Characteristic.RotationSpeed).updateValue(body);
            }
            callback(null, body);
        }.bind(this));

    },
    
    setRotationSpeed: function(state, callback) {

        switch (state) {

            case 1:
                var body;
                this.log("자동풍 설정")
                str = 'curl -X PUT -d \'{"speedLevel": 0}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/wind';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;

            case 2:
                var body;
                this.log("미풍 설정")
                str = 'curl -X PUT -d \'{"speedLevel": 1}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/wind';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;
                
            case 3:
                var body;
                this.log("약풍 설정")
                str = 'curl -X PUT -d \'{"speedLevel": 2}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/wind';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;
                
            case 4:
                var body;
                this.log("강풍 설정")
                str = 'curl -X PUT -d \'{"speedLevel": 3}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/wind';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;                

            case 5:
                var body;
                this.log("터보풍 설정")
                str = 'curl -X PUT -d \'{"speedLevel": 4}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/wind';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;   

                
        }
    },
    
    getSwingMode: function(callback) {
        var str;
        var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[1].Mode.options[1]\'';
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                this.response = stdout;
                this.response = this.response.substr(1, this.response.length - 3);
            if (this.response == "Comode_Off") {
                callback(null, Characteristic.SwingMode.SWING_DISABLED);
                this.log("무풍모드해제 확인");
            } else if (this.response == "Comode_Nano") {
                this.log("무풍모드 확인");
                callback(null, Characteristic.SwingMode.SWING_ENABLED);
            } else
                this.log(this.response + "무풍모드 확인 오류");
            }
        }.bind(this));

    },
    
    setSwingMode: function(state, callback) {

        switch (state) {

            case Characteristic.SwingMode.SWING_ENABLED:
                var body;
                this.log("무풍모드 설정")
                str = 'curl -X PUT -d \'{"options": ["Comode_Nano"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/mode';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;

            case Characteristic.SwingMode.SWING_DISABLED:
                var body;
                this.log("무풍모드해제 설정")
                str = 'curl -X PUT -d \'{"modes": ["Comode_Off"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/mode';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;
        }
    },
    
    getActive: function(callback) {
        var str;
        var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[1].Operation.power\'';
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                this.response = stdout;
                this.response = this.response.substr(1, this.response.length - 3);
            if (this.response == "Off") {
                callback(null, Characteristic.Active.INACTIVE);
                this.log("전원 꺼짐");
            } else if (this.response == "On") {
                this.log("전원 켜짐");
                callback(null, Characteristic.Active.ACTIVE);
            } else
                this.log(this.response + "연결 오류");
            }
        }.bind(this));

    },

    setActive: function(state, callback) {
        var body;
        var token, ip, patchCert;
        token = this.token;
        ip = this.ip;
        patchCert = this.patchCert;
        
        var activeFuncion = function(state) {
            if (state == Characteristic.Active.ACTIVE) {
                str = 'curl -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + token + '" --cert ' + patchCert + ' --insecure -X PUT -d \'{"Operation" : {\"power"\ : \"On"\}}\' https://' + ip + ':8888/devices/0';
                console.log("전원 켜짐");
            } else {
                console.log("전원 꺼짐");
                str = 'curl -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + token + '" --cert ' + patchCert + ' --insecure -X PUT -d \'{"Operation" : {\"power"\ : \"Off"\}}\' https://' + ip + ':8888/devices/0';
            }
        }
        activeFuncion(state);
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
            } else {
                //callback();
                this.log(stdout);
            }
        }.bind(this));
        callback();
    },

    getCurrentHeaterCoolerState: function(callback) {
        var str;
        var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[1].Mode.modes[0]\'';
        this.log(str);

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                this.response = stdout;
                this.response = this.response.substr(1, this.response.length - 3);
                if (this.response == "CoolClean" || this.response == "Cool") {
                    this.log("냉방청정모드 확인");                	
                    callback(null, Characteristic.CurrentHeaterCoolerState.COOLING);
                } else if (this.response == "DryClean" || this.response == "Dry") {
                    this.log("제습청정모드 확인");                	
                    callback(null, Characteristic.CurrentHeaterCoolerState.HEATING);
                } else if (this.response == "Auto" || this.response == "Wind") {
                	this.log("공기청정모드 확인");
                    callback(null, Characteristic.CurrentHeaterCoolerState.IDLE);
                } else
                    this.log(this.response + "는 설정에 없는 모드 입니다");
                //callback();
            }
        }.bind(this));
    },
    
    setCurrentHeaterCoolerState: function(state, callback) {

        switch (state) {

            case Characteristic.TargetHeaterCoolerState.AUTO:
                var body;
                this.log("공기청정모드로 설정");
                str = 'curl -X PUT -d \'{"modes": ["Wind"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/mode';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;

            case Characteristic.TargetHeaterCoolerState.HEAT:
                var body;
                this.log("제습청정모드로 설정");
                str = 'curl -X PUT -d \'{"modes": ["DryClean"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/mode';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;
                
            case Characteristic.TargetHeaterCoolerState.COOL:
                var body;
                this.log("냉방청정모드로 설정");
                str = 'curl -X PUT -d \'{"modes": ["CoolClean"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/0/mode';
                this.log(str);
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback();
                        this.log(stdout);
                    }
                }.bind(this));
                break;
        }
    }
}
