/// <reference path="../ngdrive_ts_declaration_files/drive_interfaces.d.ts"/>
'use strict';

/*
 This defines a provider for the OAuth service, responsible to fetching access tokens.

 It's a provider so it can be easily configured at app startup to hold the OAuth id and scopes needed for it to operate.
 */

module ngDrive {
	/**
	 * an Enum to define the different refresh token behaviours
	 */
	//export enum NoAccessTokenPolicy {
	//	RETRY,            // http will sleep for a config number of ms then retry
	//	FAIL              // http will fail with a synthetic 401
	//}

	/**
	 * an Enum to define the different refresh token behaviours
	 */
	export enum TokenRefreshPolicy {
		ON_DEMAND,            // token will be refreshed after a 401
		PRIOR_TO_EXPIRY       // token will be refreshed shortly prior to expiration using a setTimeout
		// TODO add some kind of "own" option which overrides calls to gapi.auth
	}

	/**
	 * The OAuth service
	 */
	export class OauthService implements IOauthService {
		sig = 'OauthService';               // used in unit testing to confirm DI
		isAuthInProgress = false;           // true if there is an outstanding auth (ie. refresh token) in progress to prevent multiples
		isAuthedYet = false;                // first time flag, used to set immediate mode

		GAPI_RETRY_MS = 200;                // how long to wait for gapi load before retrying a refresh
		POPUP_BLOCKER_ALERT_DELAY = 10000;  // how long to wait for an auth before concluding there is a blocked popup. 0 disables
		POPUP_BLOCKER_ALERT_TEXT = "This app is requesting your authorization, but isn't able to, possibly because you have blocked popups from this site.";
		refreshException;                   // set if there is a hard error on refresh, eg wrong client or access denied. Used by getAccessToken

		accessToken:GoogleApiOAuth2TokenObject;  // the current access token

		testStatus:string;                  // this has no role in the functionality of OauthService. it's a helper property for unit tests


		/**
		 *
		 * @param scopes.  a space separated string of scopes
		 * @param clientId. The Google client ID
		 * @param tokenRefreshPolicy  One of the TokenRefreshPolicy Enum values
		 * @param immediateMode  set to true to suppress the initial auth,
		 * @param ownGetAccessTokenFunction (0 = fail and http will return a synthetic 401, !0 = retry after xx ms)
		 * @param testingRefreshToken - if set, this is used to fetch access tokens instead of gapi
		 * @param testingAccessToken - if set, this string is used as the access token, eg. ya.dsfdfdsew
		 * @param testingClientSecret - if set, this is used to fetch access tokens instead of gapi
		 * @param popupBlockedFunction - if set, this is called in place of the default alert if we think that auth is blocked by a popup blocker (or the use closed the window)
		 * @param $log
		 * @param $window
		 * @param $http
		 * @param $timeout
		 * @param $q
		 */
		constructor(private scopes:string, private clientId:string, private tokenRefreshPolicy,
		            private immediateMode:boolean, private ownGetAccessTokenFunction,
		            private testingRefreshToken, private testingAccessToken:string, private testingClientSecret, private popupBlockedFunction,
		            private $log:mng.ILogService, private $window:mng.IWindowService, private $http:mng.IHttpService,
		            private $timeout:mng.ITimeoutService, private $q:mng.IQService) {
			//console.log("OAuth instantiated with " + scopes);
			//$log.log("scopes", this.scopes);
			//$log.log("trp", this.tokenRefreshPolicy);drivdrivee
			//console.log('oauth cons');

			// if dev has requested to override the default getAccessToken function
			if (ownGetAccessTokenFunction) {
				this.getAccessToken = ownGetAccessTokenFunction;
			}
			;

			if (immediateMode) {                                                                                        // did user override immediate mode
				this.isAuthedYet = true;
			}
		}


		/**
		 * return an access token. Normally simply calls gapi.auth.getToken(). If that returns undefined, then
		 * return undefined, and starts a background refresh. The idea is that retries of the REST call will repeatedly fail 401 until
		 * such time that the refresh completes and gapi.auth.getToken returns a valid access token.
		 * @param optional deferred used when recursing
		 *
		 * @return a promise which may be resolved with a token object, or notified with O55 waiting for gapi, or O121 refreshing token
		 */
		getAccessToken(def?:mng.IDeferred<any>):mng.IPromise<GoogleApiOAuth2TokenObject> {
			//console.log('o88 gAT');
			if (!def) {                                                                                                 // if not called from HttpService, make a deferred
				this.$log.info('[O97] Warning: getAccesToken called without a deferred. This is possibly a mistake if called from your own code as it means multiple overlapping calls won\'t resolve');
				def = this.$q.defer()  ;
			}
			if (!!this.testingAccessToken) {                                                                            // if a test token has been set
				//console.log('returning '+{access_token: this.testingAccessToken});
				def.resolve({access_token: this.testingAccessToken});                                                                   // return it
				return def.promise;
			}

			if (!!this.testingRefreshToken) {                                                                                 // if a test refresh token has been provided
				if (!!this.accessToken) {                                                                                       // and there is an access token
					def.resolve(this.accessToken);                                                                               // resolve with it

					return def.promise;
				}                                                                                                               // else
				def.notify('[O121] refreshing token');                                                                            // and emit a notify
				this.refreshAccessTokenUsingTestRefreshToken(this.testingRefreshToken, this.testingClientSecret, def);          // use it to fetch an a_t
				return def.promise;
			}

			if (!this.isGapiLoaded()) {                                                                                 // if gapi hasn't loaded yet
				var s= '[O55] waiting for the gapi script to download';
				this.$log.warn(s);
				this.testStatus = 'O55';
				def.notify(s);                                                                                          // emit a promise notify
				this.$timeout(()=>{this.getAccessToken(def)}, 200);                                                     // and check again in 0.2s
				return def.promise;
			}

			//if (!!this.refreshException) {                                                                              // if there is a hard error
			//	return "!FAIL " + this.refreshException;                                                                // return it
			//}

			if (!!this.$window['gapi'].auth.getToken()                                                                  // function returns something
				&& !!this.$window['gapi'].auth.getToken()['access_token']                                               // with an access token
				&& (this.$window['gapi'].auth.getToken()['access_token'] != null)) {                                    // which isn't null
				//console.log('oauth getaccess token resolving with ',this.$window['gapi'].auth.getToken());
				def.resolve(this.$window['gapi'].auth.getToken());                                                      // return it
			} else {
				this.refreshAccessToken(def);                                                                           // else, we need an access token so call refresh
				def.notify('[O121] refreshing token');                                                                  // and emit a notify
			}
			return def.promise;
		}


		/**
		 *  call gapi authorize.
		 *  Uses isFirstAuth to set the immediate flag, so first time through there is a login prompt.
		 *
		 *  If isAuthInprogress, does nothing, but emits a console warning to help debug any issues where the callback wasn't invoked.
		 */
		refreshAccessToken(def?:mng.IDeferred<any>):mng.IPromise<GoogleApiOAuth2TokenObject> {
			if (!def) {                                                                                                 // def may be undefined if called from the app directly
				def = this.$q.defer();                                                                                  // so make a new one
			}

			if (this.isAuthInProgress) {                                                                                // prevent multiple concurrent refresh requests
				this.$log.warn('[O75] refresh access token suppressed because there is already such a request in progress');
				this.testStatus = 'O75';
				return def.promise;
			}

			this.refreshException = undefined;                                                                          // clear any previous hard failures so we can try again

			if (!this.isGapiLoaded()) {                                                                                 // if gapi isn;t yet loaded
				this.$log.warn('[O81] gapi not yet loaded, retrying...');
				this.testStatus = 'O81';
				this.$timeout(() => {
					this.refreshAccessToken(def);                                                                       // try again
				}, this.GAPI_RETRY_MS);
				return def.promise;
			}

			this.isAuthInProgress = true;

			try {
				if (this.POPUP_BLOCKER_ALERT_DELAY > 0) {                                                               // if popup blocker alerts are enabled
					var toPromise = this.$timeout(()=> {                                                                // set a n second timeout on auth
							this.$log.warn("auth timed out after " + this.POPUP_BLOCKER_ALERT_DELAY + "ms. Resetting anti-concurrent-calls flag so the next call to getAccesstoken() will trigger a fresh request");
							if (this.popupBlockedFunction) {                                                            // if the app wants to handle popups blocked
								this.popupBlockedFunction();                                                            //let it
							} else {                                                                                    // else
								if (this.POPUP_BLOCKER_ALERT_TEXT) {
									alert(this.POPUP_BLOCKER_ALERT_TEXT);                                               // display a default alert TODO consider a def.reject instead
								}
							}
							def.reject('[O163] popup blocker timeout fired');
							this.isAuthInProgress = false;
						},
						this.POPUP_BLOCKER_ALERT_DELAY);
				}
				this.$window['gapi'].auth.authorize(                                                                    // THIS IS THE CALL TO GAPI.AUTHORIZE
					{
						client_id: this.clientId,
						scope: this.scopes,
						immediate: this.isAuthedYet
					},
					(resp)=> {                                                                                          // when we get a response form gapi
						this.$timeout.cancel(toPromise);                                                                // cancel the popup blocker checker
						this.refreshCallback(resp, def);                                                                // and process the response
					});                    // callback invoked when gapi refresh returns with a new token
			} catch (e) {
				this.$log.error('[O153] exception calling gapi.auth.authorize ' + e);
				this.isAuthInProgress = false;
			}
			return def.promise;
		}


		/**
		 *
		 *  Uses a poked refresh token to fetch a new access token. Only used for e2e testing
		 *
		 * @param rt the refresh token
		 * @param secret the client secret
		 */
		refreshAccessTokenUsingTestRefreshToken(rt:string, secret:string, def:mng.IDeferred<any>):mng.IPromise<GoogleApiOAuth2TokenObject> {
			//console.error('refreshing with '+rt);
			if (this.isAuthInProgress) {
				this.$log.warn('[O143] refresh access token suppressed because there is already such a request in progress');
				this.testStatus = 'O143';
				return def.promise;
			}

			this.isAuthInProgress = true;


			var url = 'https://www.googleapis.com/oauth2/v3/token';

			this.$http({
				method: 'POST',
				url: url,
				params: {
					client_id: encodeURI(this.clientId),
					//client_secret:'Y_vhMLV9wkr88APsQWXPUrhq',
					client_secret: encodeURI(secret),
					refresh_token: rt,
					grant_type: 'refresh_token'
				},
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			}).
				success((data:GoogleApiOAuth2TokenObject, status, headers, config) => {
					this.accessToken = data;
					this.$log.info('[O172]: access token fetched ');
					this.isAuthInProgress = false;
					def.resolve(data);
					// this callback will be called asynchronously
					// when the response is available
				}).
				error((data, status, headers, config) => {
					this.isAuthInProgress = false;
					// called asynchronously if an error occurs
					// or server returns response with an error status.
					var s = '[O191] problem refreshing test refresh token ' + status + ' ' + data.error + ' ' + data.error_description;
					this.$log.error(s);
					def.reject(s);
				});
		}

		/**
		 * called when gapi.auth.authorize returns
		 * Reports an error if no token.
		 *
		 * Sets up an auto refresh if required
		 *
		 * @param resp see https://developers.google.com/api-client-library/javascript/reference/referencedocs#OAuth20TokenObject
		 * @param def a deferred object. usually created in getAccessToken
		 */
		refreshCallback(resp, def) {
			this.isAuthInProgress = false;
			//console.log('o207 authed');

			//resp=null; gapi.auth.setToken(undefined);debugger;                    uncomment to force null to test network error handling
			var token:GoogleApiOAuth2TokenObject = this.$window['gapi'].auth.getToken();

			if (resp == null) {                                                                                         // after a network failure, and poss other causes, response can be null
				var err = "[O248] null response. Possible network error.";                                              // so create a dummy response with an appropriate error message
				resp = {error: err};                                        // so create a dummy response with an appropriate error message
				def.reject(err);
			}

			if (!token) {
				this.$log.error('[O196] There is a problem that authorize has returned without an access token. Poss. access denied by user or invalid client id or wrong origin URL? Reason = ' + resp.error);
				if (resp.error == "immediate_failed") {                                                                 // if we get this error
					this.immediateMode = false;                                                                         // clear immediate flag
					this.refreshAccessToken(def);                                                                       // and retry. This usually means a previous non-immediate failure was ignored
				}
				// for any other fauilure (eg. access denied) set a flag so future calls to getAccessToken fail to the caller
				this.refreshException = resp.error;
				def.reject(resp.error);
			}

			if (token.access_token && token.access_token != null) {                                                     // if there is an access token
				this.isAuthedYet = true;                                                                                // set flag that authed , ie immediate is now true
				this.accessToken = undefined;                                                                    // lose any testing token
				def.resolve(token);                                                                                     // resolve with the token
				//console.log('resolving 401');
			}

			// if app has requested auto-refresh, set up the timeout to refresh
			if (this.tokenRefreshPolicy == TokenRefreshPolicy.PRIOR_TO_EXPIRY) {
				var expiry:number = token.expires_in;
				this.$log.log('[O203] token will refresh after ' + expiry * 950 + 'ms');
				setTimeout(this.refreshAccessToken, expiry * 950);              // refresh after 95% of the validity
				this.testStatus = 'O203';
			}
		}


		isGapiLoaded():boolean {
			return (this.$window['gapi'] && this.$window['gapi'].auth);
		}
	}
}

/**
 * Config function which returns a provider containing methods to set OAuth parameters and a $get to return the OAuth service itself.
 * This will be referenced by the app.js startup script, something like:-
 *
 *myApp.provider('oauthService', ngDrive.Config)
 .config(function (oauthServiceProvider) {
		oauthServiceProvider.setScopes('drive.file');
		oauthServiceProvider.setClientID('1234');
		oauthServiceProvider.setTokenRefreshPolicy(ngDrive.TokenRefreshPolicy.ON_DEMAND);
});
 *
 * @returns a provider with various setters
 */

ngDrive['Config'] = function () {
	var scopes;
	var clientID;
	var tokenRefreshPolicy = ngDrive.TokenRefreshPolicy.ON_DEMAND;               // default is on demand
	var noAccessTokenPolicy = 500;                                              // default is to retry after 1/2 sec
	var getAccessTokenFunction = undefined;
	var immediateMode = false;
	var testingRefreshToken;
	var testingAccessToken;
	var testingClientSecret;
	var popupBlockedFunction;

	return {
		setScopes: function (_scopes) {
			scopes = _scopes;
		},
		setClientID: function (_clientID) {
			clientID = _clientID;
		},
		setTokenRefreshPolicy: function (_policy) {
			tokenRefreshPolicy = _policy;
		},
		//setNoAccessTokenPolicy: function (_policy) {
		//	noAccessTokenPolicy = _policy;
		//},
		setImmediateMode: function (_mode) {
			immediateMode = _mode;
		},
		setTestingRefreshToken: function (_rt) {
			testingRefreshToken = _rt;
		},
		setGetAccessTokenFunction: function (_function) {
			getAccessTokenFunction = _function;
		},
		// TODO add this method to README
		setTestingAccessToken: function (_at) {
			testingAccessToken = _at;
		},
		setTestingClientSecret: function (_secret) {
			testingClientSecret = _secret;
		},
		setPopupBlockedFunction: function (_function) {
			popupBlockedFunction = _function;
		},
		// this is the function called by the Angular DI system to return the service
		$get: function () {
			var myInjector = angular.injector(["ng"]);
			var $log = myInjector.get("$log");
			var $window = myInjector.get("$window");
			var $http = myInjector.get("$http");
			var $timeout = myInjector.get("$timeout");
			var $q = myInjector.get("$q");
			return new ngDrive.OauthService(scopes, clientID, tokenRefreshPolicy,
				immediateMode, getAccessTokenFunction, testingRefreshToken, testingAccessToken,
				testingClientSecret, popupBlockedFunction, $log, $window, $http, $timeout, $q);
		}
	}
};
