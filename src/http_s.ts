/// <reference path="../ngdrive_ts_declaration_files/angular_cropped.d.ts"/>

'use strict';


module ngDrive {

	/**
	 * The Http service.
	 * Basically a wrapper for $http that deals with the most common GAPI error conditions and returns an application level promise in place of the low level $http promise
	 */
    export class HttpService implements IHttpService {
        sig = 'HttpService';                                                                                            // used in unit testing to confirm DI
        RETRY_COUNT = 10;                                                                                               // how many times to retry
        INTERVAL_NORMAL = 10;
        INTERVAL_THROTTLE = 500;
        INTERVAL_MAX = 1500;

        //throttleInterval;                                                                                               // the variable delay
        isQueueMode = false;                                                                                             // use queue, set to false for unit testing
        queue: Array<any> = [];                                                                                          // q of requests
        queueInterval;                                                                                                  // frequency of dq
        queuePromise: mng.IPromise<any>;                                                                                 // the $interval promise

        def401: mng.IDeferred<any>;                                                                                          // a global deferred for any 401
        // this is so multiple requests that cause a 401 will all get resolved


        testStatus: string = 'foo';                  // this has no role in the functionality of OauthService. it's a helper property for unit tests
        skipOauthCozTesting = false;               // if true does no Oauth. Only used for unit tests


        static $inject = ['$log', '$http', '$timeout', '$interval', '$q', 'OauthService'];

        constructor(private $log: mng.ILogService, private $http: mng.IHttpService, private $timeout: mng.ITimeoutService,
            private $interval: mng.IIntervalService, private $q: mng.IQService, private OauthService: IOauthService) {
            //console.log('http cons');
            this.def401 = $q.defer();
        }

		/**
		 * getter for the underlying Oauth service just in case the app needs it
		 *
		 * @returns {ng.IHttpService}
		 */
        getOauthService(): ngDrive.IOauthService {
            return this.OauthService;
        }

		/**
		 * getter for the underlying $http service just in case the app needs it
		 *
		 * @returns {ng.IHttpService}
		 */
        get$http(): mng.IHttpService {
            return this.$http;
        }

		/**
		 * exported method for any $http call.
		 * The call is wrapped in a mid-level promise, ie. not the low level $http promise.
		 *
		 * @param configObject
		 *
		 * @returns {IPromise<T>}
		 */
        doHttp(configObject: mng.IRequestConfig): mng.IPromise<any> {
            var def = this.$q.defer();
            // replace with add2q {}
            if (this.isQueueMode) {
                this.add2q(configObject, def, this.RETRY_COUNT);
            } else {
                this._doHttp(configObject, def, this.RETRY_COUNT);
            }
            return def.promise;
        }

		/* add2q
		 pushes to q
		 if dq not running, starts dq interval
		 */

		/**
		 * adds a new config object to the http queue
		 *
		 * @param configObject
		 * @param def
		 * @param retryCounter
		 */
        add2q(configObject: mng.IRequestConfig, def: mng.IDeferred<any>, retryCounter: number) {
            //console.log('adding '+configObject.method);
            this.queue.push({ c: configObject, d: def, r: retryCounter });
            if (!this.queuePromise) {
                //console.log('starting dq')
                this.queuePromise = this.$interval(() => {
                    this.dq()
                }, this.queueInterval);
            }

        }

		/**
		 * slows down http submission
		 */
        throttleDown() {
            //console.info('throttling down');
            if (this.queueInterval == this.INTERVAL_NORMAL) {
                this.queueInterval = this.INTERVAL_THROTTLE;
                //console.log('starting throttling');
            }
            if (this.queuePromise) {                                                                                    // if there is an interval running
                //console.log('killing existing dq');
                this.$interval.cancel(this.queuePromise);                                                               // kill it
            }
            this.queueInterval = this.INTERVAL_MAX;                                                                     // set max delay (ie. close throttle)
            // old way was to slowly throttle back by 10%
            //this.queueInterval = this.queueInterval * 1.1;
            //if (this.queueInterval > this.INTERVAL_MAX) {
            //	this.queueInterval = this.INTERVAL_MAX;
            //}
            //console.log('throttling at '+this.queueInterval);
            this.queuePromise = this.$interval(() => {
                this.dq()
            }, this.queueInterval);                                    // start a new interval
        }


		/**
		 * speeds up http submission
		 */
        throttleUp() {
            //console.info('throttling up');
            if (this.queueInterval == this.INTERVAL_NORMAL) {                                                           // if no throttling taking place
                //console.log('not throttling');                                                                        // do nothing
                return;
            }
            if (this.queuePromise) {                                                                                    // kill any existing interval
                //console.log('killing existing dq');
                this.$interval.cancel(this.queuePromise);
            }
            this.queueInterval = this.queueInterval * 0.8;                                                              // subtract 20%
            if (this.queueInterval < this.INTERVAL_NORMAL) {
                this.queueInterval = this.INTERVAL_NORMAL;
            }
            //console.log('throttling at '+this.queueInterval);
            this.queuePromise = this.$interval(() => {
                this.dq()
            }, this.queueInterval);                                    // start a new interval
        }

		/*	dq
		 checks q length,
		 if 0, set interval = 10, cancel
		 get  [0]
		 remove [0]
		 _do [0]
		 */

		/**
		 * takes an item off the queue and processes it
		 */
        dq() {
            if (this.queue.length == 0) {                                                                               // if q is empty
                //debugger;
                this.queueInterval = this.INTERVAL_NORMAL;
                this.$interval.cancel(this.queuePromise);                                                               // kill any interval
                this.queuePromise = undefined;
                return;
            }
            // here with q items
            //console.log('processing item, qlen = '+this.queue.length);
            var obj = this.queue[0];                                                                                    // get the oldest item
            this.queue.splice(0, 1);                                                                                     // remove from q
            this._doHttp(obj.c, obj.d, obj.r);                                                                          // process it
        }

		/**
		 * internal $http call. This is recursed for errors
		 *
		 * @param configObject  the $http config object {method, url, params, data}
		 * @param def  the parent deferred object that we will resolve or reject
		 * @param retryCounter used to countdown recursions. set by outer method
		 */
        _doHttp(configObject: mng.IRequestConfig, def: mng.IDeferred<any>, retryCounter: number) {
            //console.log('in _ with conf '+configObject.method);
            //debugger;
            if (!configObject.headers) {
                configObject.headers = {};
            }
            //var at = this.OauthService.getAccessToken();  // get an access token. this is the old method, synchronous with a loop. replaced by an internal promise
            if (this.skipOauthCozTesting) {
                this.do$http({ access_token: 'unit test access token' }, configObject, def, retryCounter);
            } else {
                this.OauthService.getAccessToken().then(                                                                    // get an access token, when one is available ...
                    (token) => {
                        this.do$http(token, configObject, def, retryCounter);
                        return;
                    }, (error) => {                                                                                         // this is the rejection for no access token
                        // here with no access token
                        def.reject('401 no access token ' + error);                                                         // reject the app promise include any explanation, eg. auth denied
                    }
                );
            }
        }

        do$http(token: GoogleApiOAuth2TokenObject, configObject: mng.IRequestConfig, def: mng.IDeferred<any>, retryCounter: number) {
            configObject.headers['Authorization'] = 'Bearer ' + token.access_token;                             // add auth header
            //console.log(configObject);
            var httpPromise = this.$http(configObject);                                                         // run the http call and capture the $http promise
            // todo success/error -> then catch
            httpPromise.then((resp) => {                          // if http success, resolve the app promise
                this.throttleUp();
                //this.$log.debug(status);
                if (resp.data && resp.data.nextPageToken) {                                                                       // if there is more data, emit a notify and recurse
                    //console.log('h198 notify')
                    def.notify({
                        data: resp.data,
                        configObject: configObject,
                        headers: resp.headers,
                        status: resp.status,
                        statusText: resp.statusText
                    });
                    if (!configObject.params) {
                        configObject.params = {};                                                               // just in case the original call had no params
                    }
                    configObject.params.pageToken = resp.data.nextPageToken;                                         // store the page token into the params for the next call
                    return this._doHttp(configObject, def, retryCounter);                                       // recurse
                }
                //console.log('h206 resolve')
                def.resolve({                                                                                   // $http success so resolve the app promise
                    data: resp.data,                                                                                 // with the data from the $http promise
                    configObject: configObject,
                    headers: resp.headers,
                    status: resp.status,
                    statusText: resp.statusText
                });
            });
            httpPromise.catch((resp) => {                            // for a $http error
                if (resp.status > 299 && resp.status < 310) {						// redirect isn't an error
                    def.resolve({                                                                                   // $http success so resolve the app promise
                        data: resp.data,                                                                                 // with the data from the $http promise
                        configObject: configObject,
                        headers: resp.headers,
                        status: resp.status,
                        statusText: resp.statusText
                    });
                } else {
                    this.errorHandler(resp.data, resp.status, resp.headers, resp.config, resp.statusText, def, retryCounter);          // do error handling
                }
            })
        }

		/**
		 * Called in the event of any error.
		 *
		 *
		 * @param data          The response body
		 * @param status        The numeric status
		 * @param headers       Object map of response Headers
		 * @param configObject  The original config object
		 * @param statusText    The textual response
		 * @param def           The mid-level deferred object
		 * @param retryCounter  The decrementing retry counter
		 */
        errorHandler(data: any, status: number, headers: {}, configObject: mng.IRequestConfig, statusText: string, def: mng.IDeferred<any>, retryCounter: number) {
            // 404 - hard error
            // debugger;
            if (!data || data == null) {                                                                                // if the response data is null
                data = { error: { message: '[H242] null response. Possible network failure.' } };                           // create a dummy rep data object with an appropriate message
            }

            if (status == 404) { // 404 is not recoverable, so reject the promise
                def.reject(status + " " + data.error.message);
                return;
            }

            // 401 - get new access token
            // retry after 0.5s
            if (status == 401) { // 401 need to refresh the token and then retry
                this.$log.warn("[H116] Need to acquire a new Access Token and resubmit");
                //debugger;
                this.OauthService.refreshAccessToken(this.def401).then(
                    () => {
                        //debugger;
                        console.log('401 resolved so repeat');
                        this._doHttp(configObject, def, retryCounter);
                    },
                    (err) => {
                        def.reject(err);
                    }
                );  // retry loop replaced by a .then Only risk is if refreshToken keeps returning valid tokens which keep getting 401'd by Google

                //if (--retryCounter > 0) { // number of retries set by caller
                //	this.sleep(2000).then(() => {
                //		this._doHttp(configObject, def, retryCounter);
                //	})
                //} else {
                //	def.reject(status + ' ' + data.error.message);
                //}
                return;
            }

            // 501 - might be a hard error due to a Drive bug or malformed request
            // can also be a soft error caused by an internal Google timeout
            // stoopid Google is too lazy to distinguish the two so need to retry quickly
            // retry after 1s
            if (status == 501) {
                if (--retryCounter > 0) { // number of retries set by caller
                    this.sleep(1000).then(() => {
                        this._doHttp(configObject, def, retryCounter);
                    })
                } else {
                    def.reject(status + ' ' + data.error.message);
                }
                return;
            }

            // 403 - rate limit, sleep for 2s x the number of retries to allow some more bucket tokens
            //if (status == 403) debugger;
            if (status == 403 && data.error.message.toLowerCase().indexOf('rate limit') > -1) {
                this.$log.warn('[H153] 403 rate limit. requeuing retryConter = ' + retryCounter);
                this.throttleDown();                                                                                    // slow down submission
                this.add2q(configObject, def, retryCounter);                                                           // and resubmit
                return;
            }

            // anything else is a hard error
            def.reject(status + " " + data.error.message);
        }


		/**
		 * simple sleep(ms) returning a promise
		 */
        sleep(ms: number): mng.IPromise<any> {
            var def = this.$q.defer();
            this.$timeout(() => {
                def.resolve(0)
            }, ms);
            return def.promise;
        }
    }
}

declare var angular: mng.IAngularStatic;
angular.module('ngm.ngDrive')
    .service('HttpService', ngDrive.HttpService);
