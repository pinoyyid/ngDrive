'use strict';

describe('Controller: MaximalCtrl', function () {

  // load the controller's module
  beforeEach(module('MyApp'));

  var MaximalCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    MaximalCtrl = $controller('MaximalCtrl', {
      $scope: scope
    });
  }));

  it('should have a MaximalCtrl sig', function () {
    expect(MaximalCtrl.sig).toBe('MaximalCtrl');
  });
});
