var Service, Characteristic, Accessory;
var exec2 = require("child_process").exec;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    //UUIDGen = homebridge.hap.uuid;
    homebridge.registerAccessory('homebridge-samsung-airconditioner1', 'SamsungAirconditioner1', SamsungAirco1);
}

function SamsungAirco1(log, config) {
    this.log = log;
    this.name = config["name"];
    this.ip = config["ip"];
    this.token = config["token"];
    this.patchCert = config["patchCert"];
}

SamsungAirco1.prototype = {

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
                maxValue: 50,
                minStep: 1
            })
            .on('get', this.getCurrentTemperature.bind(this));

        //현재 모드 설정
        this.aircoSamsung.getCharacteristic(Characteristic.TargetHeaterCoolerState)
            .on('get', this.getTargetHeaterCoolerState.bind(this))       
            .on('set', this.setTargetHeaterCoolerState.bind(this));
   
        //현재 모드 확인
        this.aircoSamsung.getCharacteristic(Characteristic.CurrentHeaterCoolerState) 
            .on('get', this.getCurrentHeaterCoolerState.bind(this));

        //냉방모드 온도
        this.aircoSamsung.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .setProps({
                minValue: 18,
                maxValue: 30,
                minStep: 1
            })
            .on('get', this.getTargetTemperature.bind(this))
            .on('set', this.setTargetTemperature.bind(this)); 

        //난방모드 온도        
         this.aircoSamsung.getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .setProps({
                minValue: 18,
                maxValue: 30,
                minStep: 1
            })
            .on('get', this.getTargetTemperature.bind(this))
            .on('set', this.setTargetTemperature.bind(this)); 
        
        //스윙모드 설정
        this.aircoSamsung.getCharacteristic(Characteristic.SwingMode)
            .on('get', this.getSwingMode.bind(this))
            .on('set', this.setSwingMode.bind(this));  

        //자동청소 설정
        this.aircoSamsung.getCharacteristic(Characteristic.LockPhysicalControls)
            .on('get', this.getLockPhysicalControls.bind(this))
            .on('set', this.setLockPhysicalControls.bind(this));  
		
        var informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer, 'Samsung')
            .setCharacteristic(Characteristic.Model, 'Air conditioner')
            .setCharacteristic(Characteristic.SerialNumber, 'AF16K7970WFN');
	    
	    
        return [informationService, this.aircoSamsung];
    },

    //services

    getTargetTemperature: function(callback) {
	var str;
	var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[0].Temperatures[0].desired\'';

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                body = parseInt(stdout);
                callback(null, body);
                //this.log("희망온도 확인 : " + body);
            }
        }.bind(this))
    },

    setTargetTemperature: function(body, callback) {
	var str;
	var body;	 
        str = 'curl -X PUT -d \'{"desired": ' + body + '}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/1/temperatures/0';

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                callback(null, body);
                //this.log("희망온도 설정 : " + body);
            }
        }.bind(this));
    },
    
    getCurrentTemperature: function(callback) {
	var str;
	var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[0].Temperatures[0].current\'';
 
        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                body = parseInt(stdout);
                callback(null, body);
                //this.log("현재 온도: " + body);
            }
        }.bind(this));
    },

    getLockPhysicalControls: function(callback) {
	var str;
	var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[0].Mode.options[2]\'';

        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                body = stdout;
	        body = body.substr(1, body.length - 3);
            if (body == "Autoclean_Off") {
                callback(null, Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
                //this.log("자동청소해제 확인");
            } else if (body == "Autoclean_On") {
                //this.log("자동청소 확인");
                callback(null, Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED);
            } else
                this.log("자동청소 확인 오류");
            }
        }.bind(this));

    },
    
    setLockPhysicalControls: function(state, callback) {

        switch (state) {

            case Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED:
	        var str;
	        var body;
                //this.log("자동청소 설정")
                str = 'curl -X PUT -d \'{"options": ["Autoclean_On"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/1/mode';

                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, body);
                    }
                }.bind(this));
                break;

            case Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED:
	        var str;
	        var body;
                //this.log("자동청소해제 설정")
                str = 'curl -X PUT -d \'{"options": ["Autoclean_Off"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/1/mode';
 
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, body);
                    }
                }.bind(this));
                break;
        }
    },
	
    getSwingMode: function(callback) {
	var str;
	var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[0].Wind.direction\'';


        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                body = stdout;
	        body = body.substr(1, body.length - 3);
            if (body == "Fix") {
                callback(null, Characteristic.SwingMode.SWING_DISABLED);
                //this.log("고정 확인");
            } else if (body == "Up_And_Low") {
                //this.log("회전 확인");
                callback(null, Characteristic.SwingMode.SWING_ENABLED);
            } else
		this.log("회전 확인 오류");
            }
        }.bind(this));

    },
    
    setSwingMode: function(state, callback) {

        switch (state) {

            case Characteristic.SwingMode.SWING_ENABLED:
	        var str;
	        var body;
                //this.log("회전 설정")
                str = 'curl -X PUT -d \'{"direction": "Up_And_Low"}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/1/wind';

                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, body);
                    }
                }.bind(this));
                break;

            case Characteristic.SwingMode.SWING_DISABLED:
	        var str;
	        var body;
                //this.log("고정 설정")
                str = 'curl -X PUT -d \'{"direction": "Fix"}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/1/wind';
 
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, body);
                    }
                }.bind(this));
                break;
        }
    },
    
    getActive: function(callback) {
	var str;
	var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[0].Operation.power\'';


        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                body = stdout;
	        body = body.substr(1, body.length - 3);
            if (body == "Off") {
                callback(null, Characteristic.Active.INACTIVE);
                //this.log("비활성화 확인");
            } else if (body == "On") {
                //this.log("활성화 확인");
                callback(null, Characteristic.Active.ACTIVE);
            } else
		this.log("활성화 확인 오류");
            }
        }.bind(this));

    },
	
    setActive: function(state, callback) {

        switch (state) {

            case Characteristic.Active.ACTIVE:
	        var str;
	        var body;
                //this.log("켜기 설정");
		str = null
                //str = 'curl -X PUT -d \'{"Operation": {"power" : "On"}}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/1';
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, body);
                    }
                }.bind(this));
                break;

            case Characteristic.Active.INACTIVE:
	        var str;
	        var body;
                //this.log("끄기 설정");
                str = 'curl -X PUT -d \'{"Operation": {"power" : "Off"}}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/1';
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, body);
                    }
                }.bind(this));
                break;
         }
    },

    getCurrentHeaterCoolerState: function(callback) {
	var str;
	var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[0].Mode.modes[0]\'';
 
        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                body = stdout;
	        body = body.substr(1, body.length - 3);
                if (body == "DryClean" || body == "Dry") {
                    //this.log("제습청정모드 확인");                	
                    callback(null, Characteristic.CurrentHeaterCoolerState.COOLING);
                } else if (body == "CoolClean" || body == "Cool") {
                    //this.log("냉방청정모드 확인");                	
                    callback(null, Characteristic.CurrentHeaterCoolerState.HEATING);
                } else if (body == "Auto" || body == "Wind") {
                   // this.log("공기청정모드 확인");
                    callback(null, Characteristic.CurrentHeaterCoolerState.IDLE);
                } else
		    this.log("현재 모드 확인 오류");      
            }
        }.bind(this));
    },
	
     getTargetHeaterCoolerState: function(callback) {
	var str;
	var body;
        str = 'curl -s -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure -X GET https://' + this.ip + ':8888/devices|jq \'.Devices[0].Mode.modes[0]\'';
 
        this.execRequest(str, body, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                body = stdout;
	        body = body.substr(1, body.length - 3);
                if (body == "DryClean" || body == "Dry") {
                    //this.log("제습청정모드 확인");                	
                    callback(null, Characteristic.TargetHeaterCoolerState.COOL);
                } else if (body == "CoolClean" || body == "Cool") {
                    //this.log("냉방청정모드 확인");                	
                    callback(null, Characteristic.TargetHeaterCoolerState.HEAT);
                } else if (body == "Auto" || body == "Wind") {
                    //this.log("공기청정모드 확인");
                    callback(null, Characteristic.TargetHeaterCoolerState.AUTO);
                } else
		    this.log("목표 모드 확인 오류");      
            }
        }.bind(this));
    },
    
    setTargetHeaterCoolerState: function(state, callback) {

        switch (state) {

            case Characteristic.TargetHeaterCoolerState.AUTO:
	        var str;
	        var body;
                //this.log("공기청정모드로 설정");
                str = 'curl -X PUT -d \'{"modes": ["Wind"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/1/mode';
                this.aircoSamsung.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(1);
			
	    this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, body);
                    }
                }.bind(this));
                break;

            case Characteristic.TargetHeaterCoolerState.HEAT:
	        var str;
	        var body;
                //this.log("냉방청정모드로 설정");
                str = 'curl -X PUT -d \'{"modes": ["CoolClean"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/1/mode';
                this.aircoSamsung.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(2);
			
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, body);
                    }
                }.bind(this));
                break;
                
            case Characteristic.TargetHeaterCoolerState.COOL:
	        var str;
	        var body;
                //this.log("제습청정모드로 설정");
                str = 'curl -X PUT -d \'{"modes": ["DryClean"]}\' -v -k -H "Content-Type: application/json" -H "Authorization: Bearer ' + this.token + '" --cert ' + this.patchCert + ' --insecure https://' + this.ip + ':8888/devices/1/mode';
                this.aircoSamsung.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(3);
			
                this.execRequest(str, body, function(error, stdout, stderr) {
                    if (error) {
                        callback(error);
                    } else {
                        callback(null, body);
                    }
                }.bind(this));
                break;
        }
    }
}
