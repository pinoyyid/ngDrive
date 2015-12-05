'use strict';
//
// tests for the DriveService.
describe('Service: DriveService', function () {

	// load the service's module
	beforeEach(module('MyApp'));

	// instantiate service
	var $httpBackend;
	var $rootScope;
	var $q;
	var $timeout;
	var DriveService;
	var authRequestHandlerGet;
	var authRequestHandlerPost;

	// stub instances
	var success = sinon.stub();
	var failure = sinon.stub();

	beforeEach(inject(function (_$httpBackend_, _DriveService_, _$q_, _$rootScope_, _$timeout_) {
		$httpBackend = _$httpBackend_;
		DriveService = _DriveService_;
		$q = _$q_;
		$rootScope = _$rootScope_;
		$timeout = _$timeout_;
		// mock out the underlying getAccessToken to return a test string
		DriveService.getHttpService().getOauthService().testingAccessToken = {access_token: 'unit test access token'};
		// disable queue mode in the HttpService
		DriveService.getHttpService().isQueueMode = false;
		DriveService.getHttpService().skipOauthCozTesting = true;
	}));

	beforeEach(function () {
		// Set up the mock http service responses
		// backend definition common for all tests
		// this configures the backed to return specified responses in response to specified http calls
		//authRequestHandlerGet = $httpBackend.when('GET', '')
		//	.respond({kind: 'drive#file'}, {'A-Token': 'xxx'});
		//authRequestHandlerPost = $httpBackend.when('POST', '')
		//	.respond(200, {id: 'id_from_mock_httpbackend', title: 'title'});
	});

	afterEach(function () {
		$httpBackend.verifyNoOutstandingExpectation();
		$httpBackend.verifyNoOutstandingRequest();

		// reset stubs
		success.reset();
		failure.reset();
	});

	it('should be instantiated', function () {
		expect(!!DriveService).toBe(true);
	});

	it('should have the correct sig', function () {
		expect(DriveService.sig).toBe('DriveService');
	});

	it('should have an HttpService instance', function () {
		expect(DriveService.HttpService.sig).toBe('HttpService');
	});

	it('should have an an HttpService with an OauthService instance', function () {
		expect(DriveService.HttpService.getOauthService().sig).toBe('OauthService');
	});

	describe('.revisions.list() method', function () {
		var id = 'fooi';

		beforeEach(function () {
			$httpBackend.whenGET("").respond({items:[{id: id}]});
		});

		it('should return a revision array', function () {
			var ro = DriveService.revisions.list({fileId: id});
			$httpBackend.flush();

			ro.promise
				.then(success, failure)
				.finally(function () {
					expect(success).toHaveBeenCalled();
					expect(failure).not.toHaveBeenCalled();
					expect(ro.data.items[0].id).toBe(id);
				});
		});
	});

	describe('.revisions.get() method', function () {
		var id = 'fooi';

		it('should fail when missing fileId', function () {
			var ro = DriveService.revisions.get({foo: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1310/);
				});
		});

		it('should fail when missing revisionId', function () {
			var ro = DriveService.revisions.get({fileId: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1314/);
				});
		});

		beforeEach(function () {
			$httpBackend.whenGET("").respond({id: id});
		});

		it('should return a revision object', function () {
			var ro = DriveService.revisions.get({fileId: id, revisionId: id});
			$httpBackend.flush();

			ro.promise
				.then(success, failure)
				.finally(function () {
					expect(success).toHaveBeenCalled();
					expect(failure).not.toHaveBeenCalled();
					expect(ro.data.id).toBe(id);
				});
		});
	});

	describe('.revisions.del() method', function () {
		var id = 'fooi';

		it('should fail when missing fileId', function () {
			var ro = DriveService.revisions.del({foo: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1393/);
				});
		});

		it('should fail when missing revisionId', function () {
			var ro = DriveService.revisions.del({fileId: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1397/);
				});
		});

		beforeEach(function () {
			$httpBackend.whenDELETE("").respond(204,undefined,{status: "204 No Content"});
		});

		it('should return status 204 no content', function () {
			var ro = DriveService.revisions.del({fileId: id, revisionId: id});
			$httpBackend.flush();

			ro.promise
				.then(success, failure)
				.finally(function () {
					expect(success).toHaveBeenCalled();
					expect(failure).not.toHaveBeenCalled();
					console.log("ro.headers");
					console.log(ro.headers());
					expect(ro.headers('status')).toBe('204 No Content');
				});
		});
	});

	describe('.revisions.update() method', function () {
		var id = 'fooi';

		it('should fail when missing revisionId', function () {
			var ro = DriveService.revisions.update({foo: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1435/);
				});
		});

		beforeEach(function () {
			$httpBackend.whenPUT("").respond({id: id});
		});

		it('should return a revision object', function () {
			var ro = DriveService.revisions.update({role:'role',type:'type'},{fileId: id, revisionId: id});
			$httpBackend.flush();

			ro.promise
				.then(success, failure)
				.finally(function () {
					expect(success).toHaveBeenCalled();
					expect(failure).not.toHaveBeenCalled();
					expect(ro.data.id).toBe(id);
				});
		});
	});

	describe('.revisions.patch() method', function () {
		var id = 'fooi';

		it('should fail when missing revisionId', function () {
			var ro = DriveService.revisions.patch({foo: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1475/);
				});
		});

		beforeEach(function () {
			$httpBackend.whenPATCH("").respond({id: id});
		});

		it('should return a revision object', function () {
			var ro = DriveService.revisions.patch({role:'role',type:'type'},{fileId: id, revisionId: id});
			$httpBackend.flush();

			ro.promise
				.then(success, failure)
				.finally(function () {
					expect(success).toHaveBeenCalled();
					expect(failure).not.toHaveBeenCalled();
					expect(ro.data.id).toBe(id);
				});
		});
	});
});
