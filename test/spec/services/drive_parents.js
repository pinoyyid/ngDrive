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

	describe('.parents.insert() method', function () {
		var id = 'fooi';

		beforeEach(function () {
			$httpBackend.whenPOST("").respond({id: id});
		});

		it('should return a parent object', function () {
			var ro = DriveService.parents.insert({fileId: id}, {id: id});
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
			var ro = DriveService.parents.insert({foo: 'bar'},{id: 'id'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D971/);
				});
		});

		it('should fail when missing parentId', function () {
			var ro = DriveService.parents.insert({fileId: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D975/);
				});
		});
	});

	describe('.parents.list() method', function () {
		var id = 'fooi';

		beforeEach(function () {
			$httpBackend.whenGET("").respond({items:[{id: id}]});
		});

		it('should return a parent array', function () {
			var ro = DriveService.parents.list({fileId: id});
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

	describe('.parents.get() method', function () {
		var id = 'fooi';

		it('should fail when missing fileId', function () {
			var ro = DriveService.parents.get({foo: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D874/);
				});
		});

		it('should fail when missing parentId', function () {
			var ro = DriveService.parents.get({fileId: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D878/);
				});
		});

		beforeEach(function () {
			$httpBackend.whenGET("").respond({id: id});
		});

		it('should return a parent object', function () {
			var ro = DriveService.parents.get({fileId: id, parentId: id});
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

	describe('.parents.del() method', function () {
		var id = 'fooi';

		it('should fail when missing fileId', function () {
			var ro = DriveService.parents.del({foo: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1007/);
				});
		});

		it('should fail when missing parentId', function () {
			var ro = DriveService.parents.del({fileId: 'bar'});
			ro.promise
				.then(success, failure)
				.finally(function() {
					expect(success).not.toHaveBeenCalled();
					expect(failure).toHaveBeenCalledWithMatch(/D1010/);
				});
		});

		beforeEach(function () {
			$httpBackend.whenDELETE("").respond(204,undefined,{status: "204 No Content"});
		});

		it('should return status 204 no content', function () {
			var ro = DriveService.parents.del({fileId: id, parentId: id});
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






	//it('watch should return a file object', function () {
	//	var id = 'foot';
	//	var filesUrl = 'https://www.googleapis.com/drive/v2/files/:id/watch';
	//	$httpBackend .whenPOST("") .respond({id: id, labels:{trashed: true}} );
	//
	//	var ro = DriveService.files.watch({id: id});
	//	$httpBackend.flush();
	//
	//	expect(DriveService.lastFile.id).toBe(id);
	//	expect(ro.data.id).toBe(id);
	//});

	/*
	 it('insert should call POST on the tasks endpoint', function() {
	 console.log("test insert");
	 $httpBackend.expectPOST("http://localhost:8080/tasks/v1/lists/MDM4NjIwODI0NzAwNDQwMjQ2MjU6OTEzMzE4NTkxOjA/tasks");
	 DriveService.insert({title:'foo'});
	 $httpBackend.flush();
	 });
	 */

});
