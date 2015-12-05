'use strict';
var NgGapi;
(function (NgGapi) {
    (function (TokenRefreshPolicy) {
        TokenRefreshPolicy[TokenRefreshPolicy["ON_DEMAND"] = 0] = "ON_DEMAND";
        TokenRefreshPolicy[TokenRefreshPolicy["PRIOR_TO_EXPIRY"] = 1] = "PRIOR_TO_EXPIRY";
    })(NgGapi.TokenRefreshPolicy || (NgGapi.TokenRefreshPolicy = {}));
    var TokenRefreshPolicy = NgGapi.TokenRefreshPolicy;
    var OauthService = (function () {
        function OauthService(scopes, clientId, tokenRefreshPolicy, immediateMode, ownGetAccessTokenFunction, testingRefreshToken, testingAccessToken, testingClientSecret, popupBlockedFunction, $log, $window, $http, $timeout, $q) {
            this.scopes = scopes;
            this.clientId = clientId;
            this.tokenRefreshPolicy = tokenRefreshPolicy;
            this.immediateMode = immediateMode;
            this.ownGetAccessTokenFunction = ownGetAccessTokenFunction;
            this.testingRefreshToken = testingRefreshToken;
            this.testingAccessToken = testingAccessToken;
            this.testingClientSecret = testingClientSecret;
            this.popupBlockedFunction = popupBlockedFunction;
            this.$log = $log;
            this.$window = $window;
            this.$http = $http;
            this.$timeout = $timeout;
            this.$q = $q;
            this.sig = 'OauthService';
            this.isAuthInProgress = false;
            this.isAuthedYet = false;
            this.GAPI_RETRY_MS = 200;
            this.POPUP_BLOCKER_ALERT_DELAY = 10000;
            this.POPUP_BLOCKER_ALERT_TEXT = "This app is requesting your authorization, but isn't able to, possibly because you have blocked popups from this site.";
            if (ownGetAccessTokenFunction) {
                this.getAccessToken = ownGetAccessTokenFunction;
            }
            ;
            if (immediateMode) {
                this.isAuthedYet = true;
            }
        }
        OauthService.prototype.getAccessToken = function (def) {
            var _this = this;
            if (!def) {
                this.$log.warn('[O97] Warning: getAccesToken called without a deferred. This is probably a mistake as it means multiple overlapping calls won\'t resolve');
                def = this.$q.defer();
            }
            if (!!this.testingAccessToken) {
                def.resolve({ access_token: this.testingAccessToken });
                return def.promise;
            }
            if (!!this.testingRefreshToken) {
                if (!!this.accessToken) {
                    def.resolve(this.accessToken);
                    return def.promise;
                }
                def.notify('[O121] refreshing token');
                this.refreshAccessTokenUsingTestRefreshToken(this.testingRefreshToken, this.testingClientSecret, def);
                return def.promise;
            }
            if (!this.isGapiLoaded()) {
                var s = '[O55] waiting for the gapi script to download';
                this.$log.warn(s);
                this.testStatus = 'O55';
                def.notify(s);
                this.$timeout(function () { _this.getAccessToken(def); }, 200);
                return def.promise;
            }
            if (!!this.$window['gapi'].auth.getToken()
                && !!this.$window['gapi'].auth.getToken()['access_token']
                && (this.$window['gapi'].auth.getToken()['access_token'] != null)) {
                def.resolve(this.$window['gapi'].auth.getToken());
            }
            else {
                this.refreshAccessToken(def);
                def.notify('[O121] refreshing token');
            }
            return def.promise;
        };
        OauthService.prototype.refreshAccessToken = function (def) {
            var _this = this;
            if (!def) {
                def = this.$q.defer();
            }
            if (this.isAuthInProgress) {
                this.$log.warn('[O75] refresh access token suppressed because there is already such a request in progress');
                this.testStatus = 'O75';
                return def.promise;
            }
            this.refreshException = undefined;
            if (!this.isGapiLoaded()) {
                this.$log.warn('[O81] gapi not yet loaded, retrying...');
                this.testStatus = 'O81';
                this.$timeout(function () {
                    _this.refreshAccessToken(def);
                }, this.GAPI_RETRY_MS);
                return def.promise;
            }
            this.isAuthInProgress = true;
            try {
                if (this.POPUP_BLOCKER_ALERT_DELAY > 0) {
                    var toPromise = this.$timeout(function () {
                        _this.$log.warn("auth timed out after " + _this.POPUP_BLOCKER_ALERT_DELAY + "ms. Resetting anti-concurrent-calls flag so the next call to getAccesstoken() will trigger a fresh request");
                        if (_this.popupBlockedFunction) {
                            _this.popupBlockedFunction();
                        }
                        else {
                            if (_this.POPUP_BLOCKER_ALERT_TEXT) {
                                alert(_this.POPUP_BLOCKER_ALERT_TEXT);
                            }
                        }
                        def.reject('[O163] popup blocker timeout fired');
                        _this.isAuthInProgress = false;
                    }, this.POPUP_BLOCKER_ALERT_DELAY);
                }
                this.$window['gapi'].auth.authorize({
                    client_id: this.clientId,
                    scope: this.scopes,
                    immediate: this.isAuthedYet
                }, function (resp) {
                    _this.$timeout.cancel(toPromise);
                    _this.refreshCallback(resp, def);
                });
            }
            catch (e) {
                this.$log.error('[O153] exception calling gapi.auth.authorize ' + e);
                this.isAuthInProgress = false;
            }
            return def.promise;
        };
        OauthService.prototype.refreshAccessTokenUsingTestRefreshToken = function (rt, secret, def) {
            var _this = this;
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
                    client_secret: encodeURI(secret),
                    refresh_token: rt,
                    grant_type: 'refresh_token'
                },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }).
                success(function (data, status, headers, config) {
                _this.accessToken = data;
                _this.$log.info('[O172]: access token fetched ');
                _this.isAuthInProgress = false;
                def.resolve(data);
            }).
                error(function (data, status, headers, config) {
                _this.isAuthInProgress = false;
                var s = '[O191] problem refreshing test refresh token ' + status + ' ' + data.error + ' ' + data.error_description;
                _this.$log.error(s);
                def.reject(s);
            });
        };
        OauthService.prototype.refreshCallback = function (resp, def) {
            this.isAuthInProgress = false;
            var token = this.$window['gapi'].auth.getToken();
            if (resp == null) {
                var err = "[O248] null response. Possible network error.";
                resp = { error: err };
                def.reject(err);
            }
            if (!token) {
                this.$log.error('[O196] There is a problem that authorize has returned without an access token. Poss. access denied by user or invalid client id or wrong origin URL? Reason = ' + resp.error);
                if (resp.error == "immediate_failed") {
                    this.immediateMode = false;
                    this.refreshAccessToken(def);
                }
                this.refreshException = resp.error;
                def.reject(resp.error);
            }
            if (token.access_token && token.access_token != null) {
                this.isAuthedYet = true;
                this.accessToken = undefined;
                def.resolve(token);
            }
            if (this.tokenRefreshPolicy == TokenRefreshPolicy.PRIOR_TO_EXPIRY) {
                var expiry = token.expires_in;
                this.$log.log('[O203] token will refresh after ' + expiry * 950 + 'ms');
                setTimeout(this.refreshAccessToken, expiry * 950);
                this.testStatus = 'O203';
            }
        };
        OauthService.prototype.isGapiLoaded = function () {
            return (this.$window['gapi'] && this.$window['gapi'].auth);
        };
        return OauthService;
    })();
    NgGapi.OauthService = OauthService;
})(NgGapi || (NgGapi = {}));
NgGapi['Config'] = function () {
    var scopes;
    var clientID;
    var tokenRefreshPolicy = NgGapi.TokenRefreshPolicy.ON_DEMAND;
    var noAccessTokenPolicy = 500;
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
        setImmediateMode: function (_mode) {
            immediateMode = _mode;
        },
        setTestingRefreshToken: function (_rt) {
            testingRefreshToken = _rt;
        },
        setGetAccessTokenFunction: function (_function) {
            getAccessTokenFunction = _function;
        },
        setTestingAccessToken: function (_at) {
            testingAccessToken = _at;
        },
        setTestingClientSecret: function (_secret) {
            testingClientSecret = _secret;
        },
        setPopupBlockedFunction: function (_function) {
            popupBlockedFunction = _function;
        },
        $get: function () {
            var myInjector = angular.injector(["ng"]);
            var $log = myInjector.get("$log");
            var $window = myInjector.get("$window");
            var $http = myInjector.get("$http");
            var $timeout = myInjector.get("$timeout");
            var $q = myInjector.get("$q");
            return new NgGapi.OauthService(scopes, clientID, tokenRefreshPolicy, immediateMode, getAccessTokenFunction, testingRefreshToken, testingAccessToken, testingClientSecret, popupBlockedFunction, $log, $window, $http, $timeout, $q);
        }
    };
};
angular.module('ngm.NgGapi', []);
