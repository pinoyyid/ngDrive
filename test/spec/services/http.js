'use strict';
//
// tests for the HttpService. Simply test that each method makes the correct
// call to $http
//
// Once this class is certified, it can be replaced by a mock equivalent that either mocks out
// all of its methods, or includes with $httpBackend to mock the server
describe('Service: HttpService', function () {

	// load the service's module
	beforeEach(module('MyApp'));

	// instantiate service
	var $rootScope;
	var $q;
	var $timeout;
	var $interval;
	var HttpService;
	var $httpBackend;
	var authRequestHandlerGet;
	var authRequestHandlerPost;

	beforeEach(inject(function($injector) {
		// Set up the mock http service responses
		$httpBackend = $injector.get('$httpBackend');
		$q = $injector.get('$q');
		$rootScope = $injector.get('$rootScope');
		$timeout = $injector.get('$timeout');
		$interval = $injector.get('$interval');
	}));

	beforeEach(inject(function (_HttpService_) {
		HttpService= _HttpService_;
		HttpService.isQueueMode = false;
	}));

	it('should be instantiated', function () {
		expect(!!HttpService).toBe(true);
	});

	it('should not be in queue mode', function () {
		expect(HttpService.isQueueMode).toBe(false);
	});

	it('should have the correct sig', function () {
		expect(HttpService.sig).toBe('HttpService');
	});

	describe('.errorHandler() method', function () {

		it('should reject a 404', function () {
			var def = $q.defer();
			// stub instances
			var success = sinon.stub();
			var failure = sinon.stub();

			HttpService.errorHandler({error: 'error message'}, 404, undefined, undefined, undefined, def, 0);
			def.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWith(404);
				});
		});

		// TODO: the test below is false because it isn't waiting for the retry before karma exits

		it('should retry a 501', function () {
			var def = $q.defer();
			// stub instances
			var success = sinon.stub();
			var failure = sinon.stub();
			// override the _doHttp function to track retries
			var retryCount = 1;
			HttpService._doHttp = function (c, d, retryCount) {
				console.log('in dohttp mock');
				retryCount--;
			}
			HttpService.errorHandler({error: {message: 'error text'}}, 501, undefined, undefined, undefined, def, retryCount);
			def.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWith('501 error text');
				});
		});

	});

});
