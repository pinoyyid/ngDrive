'use strict';

describe('Service: OauthService', function () {

  // load the service's module
  beforeEach(module('MyApp'));

  // instantiate service
  var $httpBackend;
  var OauthService;
  var $window;
  var LIST_URL = "https://www.googleapis.com/drive/v2/files?maxResults=1000&q=trashed%3Dtrue&fields=items(id%2Ctitle)%2CnextPageToken";
  var myApp = angular.module('MyApp',['ngm.ngDrive']);
  myApp.provider('OauthService', ngDrive.Config)
    .config(function (OauthServiceProvider) {
      OauthServiceProvider.setScopes('drive.file');
      OauthServiceProvider.setClientID('1234');
      OauthServiceProvider.setTokenRefreshPolicy(ngDrive.TokenRefreshPolicy.ON_DEMAND);
    });
  beforeEach(inject(function (_OauthService_) {
    OauthService= _OauthService_;
  }));

  // Set up the mock window service so we can dump a mock gapi onto it
  beforeEach(inject(function($injector) {
    //var myInjector = angular.injector(["ng"]);
    //var $log = myInjector.get("$log");
    //$window = myInjector.get("$window");
    $window = $injector.get('$window');
    $window.gapi = {auth:{}};
    $window.gapi.auth.getToken = function (token2return) {return token2return};
    $window.gapi.auth.authorize = function () {return "faked authorization"};
  }));


  // --- tests ---
  it('should be instantiated', function () {
    expect(!!OauthService).toBe(true);
  });

  it('should have the correct sig', function () {
    expect(OauthService.sig).toBe('OauthService');
  });

  it('should have the scopes correctly set', function () {
    expect(OauthService.scopes).toBe('drive.file');
  });

  it('should find gapi loaded', function () {
    expect(OauthService.isGapiLoaded()).toBeTruthy();
  });

  it('should find gapi not loaded', function () {
    $window.gapi = undefined;
    expect(OauthService.isGapiLoaded()).toBeFalsy();
  });

  it('should return an access token', function () {
    $window.gapi.auth.getToken = function () {return {access_token: "my_at"}};
    expect(OauthService.getAccessToken().$$state.value.access_token).toEqual("my_at");
  });

  it('should return undefined and refresh the token', function () {
    $window.gapi.auth.getToken = function () {return undefined};
    //expect(OauthService.getAccessToken()).toBe('!RETRY=999');     // the 999 comes from app.js
    expect(OauthService.getAccessToken().$$state.status).toEqual(0);
    expect(OauthService.isAuthInProgress).toBeTruthy();
  });

  it('should return undefined and set testStatus to indicate no gapi for getAccessToken', function () {
    $window.gapi.auth = undefined;
    expect(OauthService.getAccessToken().$$state.status).toEqual(0);
    expect(OauthService.testStatus).toEqual('O55');
  });

  it('should return undefined and set testStatus to indicate no gapi for refreshAccessToken', function () {
    $window.gapi.auth = undefined;
    OauthService.refreshAccessToken();
    expect(OauthService.testStatus).toEqual('O81');
    OauthService.isAuthInProgress = true;
    OauthService.refreshAccessToken();
    expect(OauthService.testStatus).toEqual('O75');
  });

  //it('should set up a timeout to refresh the token', function () {
  //  $window.gapi.auth.getToken = function () {return {access_token: "my_at", expires_in: 3600}};
  //  OauthService.tokenRefreshPolicy = ngDrive.TokenRefreshPolicy.PRIOR_TO_EXPIRY;
  //  OauthService.refreshCallback({resolve:function (){}});
  //  expect(OauthService.testStatus).toEqual('O203');
  //});

});
