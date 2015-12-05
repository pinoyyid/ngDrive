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

	describe('.permissions.insert() method', function () {
		var id = 'fooi';

		beforeEach(function () {
			$httpBackend.whenPOST("").respond({id: id});
		});

		it('should return a permission object', function () {
			var ro = DriveService.permissions.insert( {role: 'role', type: 'type'}, {fileId: id});
			$httpBackend.flush();

			ro.promise
				.then(success, failure)
				.finally(function () {
					expect(success).toHaveBeenCalled();
					expect(failure).not.toHaveBeenCalled();
					expect(ro.data.id).toBe(id);
				});
		});

		it('should fail when missing fileId', function () {
			var ro = DriveService.permissions.insert({type: 'domain'}, {foo: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1141/);
				});
		});

		it('should fail when missing role/type', function () {
			var ro = DriveService.permissions.insert({}, {fileId: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1145/);
				});
		});
	});

	describe('.permissions.list() method', function () {
		var id = 'fooi';

		beforeEach(function () {
			$httpBackend.whenGET("").respond({items:[{id: id}]});
		});

		it('should return a permission array', function () {
			var ro = DriveService.permissions.list({fileId: id});
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

	describe('.permissions.get() method', function () {
		var id = 'fooi';

		it('should fail when missing fileId', function () {
			var ro = DriveService.permissions.get({foo: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1045/);
				});
		});

		it('should fail when missing permissionId', function () {
			var ro = DriveService.permissions.get({fileId: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1049/);
				});
		});

		beforeEach(function () {
			$httpBackend.whenGET("").respond({id: id});
		});

		it('should return a permission object', function () {
			var ro = DriveService.permissions.get({fileId: id, permissionId: id});
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

	describe('.permissions.del() method', function () {
		var id = 'fooi';

		it('should fail when missing fileId', function () {
			var ro = DriveService.permissions.del({foo: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1177/);
				});
		});

		it('should fail when missing permissionId', function () {
			var ro = DriveService.permissions.del({fileId: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1181/);
				});
		});

		beforeEach(function () {
			$httpBackend.whenDELETE("").respond(204,undefined,{status: "204 No Content"});
		});

		it('should return status 204 no content', function () {
			var ro = DriveService.permissions.del({fileId: id, permissionId: id});
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

	describe('.permissions.update() method', function () {
		var id = 'fooi';

		it('should fail when missing permissionId', function () {
			var ro = DriveService.permissions.update({foo: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1214/);
				});
		});

		beforeEach(function () {
			$httpBackend.whenPUT("").respond({id: id});
		});

		it('should return a permission object', function () {
			var ro = DriveService.permissions.update({role:'role',type:'type'},{fileId: id, permissionId: id});
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

	describe('.permissions.patch() method', function () {
		var id = 'fooi';

		it('should fail when missing permissionId', function () {
			var ro = DriveService.permissions.patch({foo: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1254/);
				});
		});

		beforeEach(function () {
			$httpBackend.whenPATCH("").respond({id: id});
		});

		it('should return a permission object', function () {
			var ro = DriveService.permissions.patch({role:'role',type:'type'},{fileId: id, permissionId: id});
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
