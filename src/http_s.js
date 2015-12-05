'use strict';
var NgGapi;
(function (NgGapi) {
    var HttpService = (function () {
        function HttpService($log, $http, $timeout, $interval, $q, OauthService) {
            this.$log = $log;
            this.$http = $http;
            this.$timeout = $timeout;
            this.$interval = $interval;
            this.$q = $q;
            this.OauthService = OauthService;
            this.sig = 'HttpService';
            this.RETRY_COUNT = 10;
            this.INTERVAL_NORMAL = 10;
            this.INTERVAL_THROTTLE = 500;
            this.INTERVAL_MAX = 1500;
            this.isQueueMode = false;
            this.queue = [];
            this.testStatus = 'foo';
            this.skipOauthCozTesting = false;
            this.def401 = $q.defer();
        }
        HttpService.prototype.getOauthService = function () {
            return this.OauthService;
        };
        HttpService.prototype.get$http = function () {
            return this.$http;
        };
        HttpService.prototype.doHttp = function (configObject) {
            var def = this.$q.defer();
            if (this.isQueueMode) {
                this.add2q(configObject, def, this.RETRY_COUNT);
            }
            else {
                this._doHttp(configObject, def, this.RETRY_COUNT);
            }
            return def.promise;
        };
        HttpService.prototype.add2q = function (configObject, def, retryCounter) {
            var _this = this;
            this.queue.push({ c: configObject, d: def, r: retryCounter });
            if (!this.queuePromise) {
                this.queuePromise = this.$interval(function () {
                    _this.dq();
                }, this.queueInterval);
            }
        };
        HttpService.prototype.throttleDown = function () {
            var _this = this;
            if (this.queueInterval == this.INTERVAL_NORMAL) {
                this.queueInterval = this.INTERVAL_THROTTLE;
            }
            if (this.queuePromise) {
                this.$interval.cancel(this.queuePromise);
            }
            this.queueInterval = this.INTERVAL_MAX;
            this.queuePromise = this.$interval(function () {
                _this.dq();
            }, this.queueInterval);
        };
        HttpService.prototype.throttleUp = function () {
            var _this = this;
            if (this.queueInterval == this.INTERVAL_NORMAL) {
                return;
            }
            if (this.queuePromise) {
                this.$interval.cancel(this.queuePromise);
            }
            this.queueInterval = this.queueInterval * 0.8;
            if (this.queueInterval < this.INTERVAL_NORMAL) {
                this.queueInterval = this.INTERVAL_NORMAL;
            }
            this.queuePromise = this.$interval(function () {
                _this.dq();
            }, this.queueInterval);
        };
        HttpService.prototype.dq = function () {
            if (this.queue.length == 0) {
                this.queueInterval = this.INTERVAL_NORMAL;
                this.$interval.cancel(this.queuePromise);
                this.queuePromise = undefined;
                return;
            }
            var obj = this.queue[0];
            this.queue.splice(0, 1);
            this._doHttp(obj.c, obj.d, obj.r);
        };
        HttpService.prototype._doHttp = function (configObject, def, retryCounter) {
            var _this = this;
            if (!configObject.headers) {
                configObject.headers = {};
            }
            if (this.skipOauthCozTesting) {
                this.do$http({ access_token: 'unit test access token' }, configObject, def, retryCounter);
            }
            else {
                this.OauthService.getAccessToken().then(function (token) {
                    _this.do$http(token, configObject, def, retryCounter);
                    return;
                }, function (error) {
                    def.reject('401 no access token ' + error);
                });
            }
        };
        HttpService.prototype.do$http = function (token, configObject, def, retryCounter) {
            var _this = this;
            configObject.headers['Authorization'] = 'Bearer ' + token.access_token;
            var httpPromise = this.$http(configObject);
            httpPromise.then(function (resp) {
                _this.throttleUp();
                if (resp.data && resp.data.nextPageToken) {
                    def.notify({
                        data: resp.data,
                        configObject: configObject,
                        headers: resp.headers,
                        status: resp.status,
                        statusText: resp.statusText
                    });
                    if (!configObject.params) {
                        configObject.params = {};
                    }
                    configObject.params.pageToken = resp.data.nextPageToken;
                    return _this._doHttp(configObject, def, retryCounter);
                }
                def.resolve({
                    data: resp.data,
                    configObject: configObject,
                    headers: resp.headers,
                    status: resp.status,
                    statusText: resp.statusText
                });
            });
            httpPromise.catch(function (resp) {
                if (resp.status > 299 && resp.status < 310) {
                    def.resolve({
                        data: resp.data,
                        configObject: configObject,
                        headers: resp.headers,
                        status: resp.status,
                        statusText: resp.statusText
                    });
                }
                else {
                    _this.errorHandler(resp.data, resp.status, resp.headers, resp.configObject, resp.statusText, def, retryCounter);
                }
            });
        };
        HttpService.prototype.errorHandler = function (data, status, headers, configObject, statusText, def, retryCounter) {
            var _this = this;
            if (!data || data == null) {
                data = { error: { message: '[H242] null response. Possible network failure.' } };
            }
            if (status == 404) {
                def.reject(status + " " + data.error.message);
                return;
            }
            if (status == 401) {
                this.$log.warn("[H116] Need to acquire a new Access Token and resubmit");
                this.OauthService.refreshAccessToken(this.def401).then(function () {
                    console.log('401 resolved so repeat');
                    _this._doHttp(configObject, def, retryCounter);
                }, function (err) {
                    def.reject(err);
                });
                return;
            }
            if (status == 501) {
                if (--retryCounter > 0) {
                    this.sleep(1000).then(function () {
                        _this._doHttp(configObject, def, retryCounter);
                    });
                }
                else {
                    def.reject(status + ' ' + data.error.message);
                }
                return;
            }
            if (status == 403 && data.error.message.toLowerCase().indexOf('rate limit') > -1) {
                this.$log.warn('[H153] 403 rate limit. requeuing retryConter = ' + retryCounter);
                this.throttleDown();
                this.add2q(configObject, def, retryCounter);
                return;
            }
            def.reject(status + " " + data.error.message);
        };
        HttpService.prototype.sleep = function (ms) {
            var def = this.$q.defer();
            this.$timeout(function () {
                def.resolve(0);
            }, ms);
            return def.promise;
        };
        HttpService.$inject = ['$log', '$http', '$timeout', '$interval', '$q', 'OauthService'];
        return HttpService;
    })();
    NgGapi.HttpService = HttpService;
})(NgGapi || (NgGapi = {}));
angular.module('ngm.NgGapi')
    .service('HttpService', NgGapi.HttpService);
