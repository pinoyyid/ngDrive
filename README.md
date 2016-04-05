## ngDrive - Google APIs for AngularJS

### Quick Start
* `bower install ngDrive --save`
* In your HTML, `bower_components/ngDrive/build/module.js` must be loaded before your app declaration.

```
<script src="bower_components/ngDrive/build/module.js"></script>
<script src="app.js"></script>
```

* If you are developing in TypeScript, you'll want to reference the definition file from `ngdrive_ts_declaration_files/drive_interfaces.d.ts`
* A simple `app.js` looks something like

```
var myApp = angular.module('MyApp', ['ngm.ngDrive']);

angular.module('ngm.ngDrive')
	.provider('OauthService', ngDrive.Config)
	.config(function (OauthServiceProvider) {
		OauthServiceProvider.setScopes('https://www.googleapis.com/auth/drive.file');
		OauthServiceProvider.setClientID('2231299-2bvf1.apps.googleusercontent.com');
		OauthServiceProvider.setTokenRefreshPolicy(ngDrive.TokenRefreshPolicy.ON_DEMAND);
	});
```
* The syntax of the ngDrive Drive calls mimics the Google JavaScript library.
So you'll be reading https://developers.google.com/drive/v2/reference/files#methods and then each sub page for each method,
and looking at the JavaScript tab. See **API details** below for more detail.
For example, a simple ngDrive call to create a new, empty file looks something like :-

```
  DriveService.files.insert({title: 'file title', mimeType:'text/plain'})
  .promise.then(()=>{console.log('new file inserted')})
```

NB. We will be creating distributions for npm and bower soon.

### API details

The API that ngDrive presents to your app is modelled on the Google gapi client. Generally this means that the syntax for calling a method looks like the Google JavaScript equivalent, but with the following differences:-

 | Google gapi  | ngDrive
---| ------------- | -------------
call | gapi.client.drive.files.patch  | DriveService.files.patch <br>//(where "DriveService" is the injected service name)
return | A callback function  | A `ResponseObject` containing a promise and the response data ({promise:ng.IPromise, data:ngDrive.IDriveFile})   
validation | None. Whatever you submit is sent to Google | Some. We detect some common errors (eg. a missing fileId for a GET and throw an exception).
error handling | None. The app must deal with any errors | Most. 501's are retried, 403 Rate Limit errors are automatically throttled back and retried. This frees your app from a lot of tedious error handling.

Example: Here is the Get method being used to retrieve a file in both Google gapi and ngDrive

```
// Google gapi
function getFile(fileId) {
 var request = gapi.client.drive.files.get({
    'fileId': fileId
  });
  request.execute(function(resp) {
    console.log('Title: ' + resp.data.title);
  });
}
```

```
// ngDrive
function getFile(fileId) {
 DriveService.files.get({
    'fileId': fileId
   }).promise.then((resp)=>{console.log('Title: ' + resp.data.title)});
}
```

You might be tempted to count the characters in each example and conclude that ngDrive doesn't save you much. Please don't, because if you do a kitten will die.
Using Google GAPI, you need to take that innocent piece of code and preface it with your own OAuth handling, and wrap it with a mass of error handling,
finally wrapping all of that in AngularJS promises.

Also, in AngularJS, you generally want to use data binding to display information in the same way that $resource does.
In that case, the above example can be simplified to:-

```
// ngDrive assigning directly to the viewmodel
function getFile(fileId, $scope) {
 $scope.fetchedFile = DriveService.drive.files.get({ 'fileId': fileId }).data;
}
```

So the key points to remember are that all calls look like their gapi equivalents (so refer to the Google documentation for specifics on the parameters),
and that they all return a ResponseObject containing a promise and the data.

Here are the TypeScript definitions (from drive_interfaces.d.ts) for the DriveService.files methods

 * get(params:IDriveGetParameters):IDriveResponseObject<IDriveFile>;
 * list(params:IDriveListParameters, excludeTrashed):IDriveResponseObject<IDriveFile[]>;
 * insert(file:IDriveFile, params?:IDriveInsertParameters, base64EncodedContent?:string):IDriveResponseObject<IDriveFile>;
 * update(file:IDriveFile, params:IDriveUpdateParameters, base64EncodedContent?:string):IDriveResponseObject<IDriveFile>;
 * patch(params:{fileId:string; resource:IDriveFile}):IDriveResponseObject<IDriveFile>;
 * trash(params:{fileId:string}):IDriveResponseObject<IDriveFile>;
 * untrash(params:{fileId:string}):IDriveResponseObject<IDriveFile>;
 * del(params:{fileId:string}):IDriveResponseObject<any>;
 * touch(params:{fileId:string}):IDriveResponseObject<IDriveFile>;
 * watch(params:{fileId:string;alt?:string; revisionId?:string}, resource:IWatchBody):IDriveResponseObject<IApiChannel>;
 * emptyTrash():IDriveResponseObject<any>;

Remember the parameters mimic the [Google API docs](https://developers.google.com/drive/v2/reference/files#methods),
so refer to the appropriate page for details. There are two exceptions for media content Insert and media content Update.
The Google library leaves it as an exercise for the developer to construct the multipart mime body, whereas ngDrive does this for you.

If you use the returned promise with a then(resp), the resp will be a ...
 ```
 interface IHttpPromiseCallbackArg<T> {
         data?: T;
         status?: number;
         headers?: (headerName: string) => string;
         config?: IRequestConfig;
         statusText?: string;
     }
 ```
 ...where `data` contains the raw http response data, which will usually be an instance of a Resource type (eg. a File object)


### OAuth2
In order to access any Google API, your application needs an access token.
With ngDrive, this is as simple as setting your client ID and required scopes.

```
angular.module('ngm.ngDrive')
	.provider('OauthService', ngDrive.Config)
	.config(function (OauthServiceProvider) {
		OauthServiceProvider.setScopes('https://www.googleapis.com/auth/drive.file');
		OauthServiceProvider.setClientID('2231299-2bvf1.apps.googleusercontent.com');
	});
```

There are other options you can set to control the behaviour of OAuth if the defaults aren't appropriate.

```
angular.module('ngm.ngDrive')
	.provider('OauthService', ngDrive.Config)
	.config(function (OauthServiceProvider) {

			// Set the desired scopes using a space-separated list of scopes
		OauthServiceProvider.setScopes('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly');

			// set the client ID as obtained from the Google API Console
		OauthServiceProvider.setClientID('2231299-2bvf1.apps.googleusercontent.com');

			// Configure how the access token should be refreshed, options are:-
			//     TokenRefreshPolicy.ON_DEMAND:        The token will be allowed to expire and then refreshed after a 401 failure
			//     TokenRefreshPolicy.PRIOR_TO_EXPIRY : The token will be refreshed shortly before it is due to expire, preventing any 401's
		OauthServiceProvider.setTokenRefreshPolicy(ngDrive.TokenRefreshPolicy.ON_DEMAND);

			// Set immediate mode.This should normally be left to its default of false. Only set it to true if you can ensure that
			// your app has already been authorized and that the user is logged in to Google.
			// Default is false
        OauthServiceProvider.setImmediateMode(false)

			// provide your own function to return an access token. myFunction should return a promise which resolves with a GoogleApiOAuth2TokenObject (see drive_interfaces.d.ts, but most importantly contains {access_token:string}). The access token will be set into the Authorization Bearer header
		OauthServiceProvider.setGetAccessTokenFunction: function (myFunction) {
	});
```

One of the problems developing applications that access Google Drive is how to achieve headless, end-to-end
testing when acquiring an access token generally requires a logged in browser session.
ngDrive deals with this by allowing you to set a refresh token and client secret directly into the configuration, which allows your
app to acquire access tokens without being logged in. See [This StackOverflow answer](http://stackoverflow.com/questions/19766912/how-do-i-authorise-a-background-web-app-without-user-intervention-canonical/19766913#19766913)
for the steps required to get such a refresh token.

	// set your own credentials for unattended e2e testing. NB, for security, the credentials should be stored in a separate .js file which is in .gitignore
		OauthServiceProvider.setTestingRefreshToken(MY_REFRESHTOKEN).
		OauthServiceProvider.setTestingClientSecret(MY_CLIENTSECRET)


### FAQ
#### Does ngDrive wrap Google the gapi library?
No!!!
One of the motivations of writing ngDrive was to reduce the dependency on unsupported, closed source libraries. By using ngDrive (which is open),
which directly calls AngularJS $http (which is also open), you have access to the source code of your entire stack.
The other reason was that Google gapi hides the underlying http transport, so for example, timeouts are not configurable.
With ngDrive, the full stack is exposed to your application.

Note that we **do** use the gapi auth library for OAuth, as this deals with a lot of the Google specific session handling and iframing required.

#### So does this mean I don't need to read all the Google Documentation?
Not at all. In order to successfully use Google Drive, you still need to understand its capabilities and behaviours, as well as the specific parameters required
to invoke those capabilities and behaviours. What ngDrive gives is a sensible way to deliver those parameters and deal with the response in an AngularJS fashion.
We've patterned our API on gapi to make it easier to migrate existing projects and to provide a "key" into the Google documentation.

You will also find it useful to keep the [TypeScript Definition file](https://github.com/pinoyyid/ngDrive/blob/master/src/ngDrive/drive_interfaces.d.ts)
handy as it contains all of the method signatures in a single file.

#### I still don't get how to do OAuth?
You're not alone. Luckily, we think we've done a pretty good job of removing the need to know too much.
If your project is set up on Google API Console (ie. you have a client ID), and you've set the client ID and scopes as described above, it will Just Work&trade;

#### How do I handle errors?
The library tries to do a level of error handling for you. Specifically:-

1. Any 501 errors are retried 10 times before being escalated to your app
1. Any 403 Rate Limit errors are retried with an adaptive delay to get the best throughput with the minimum number of retries. 403 Rate Limit errors are **never** escalated
to your app.
1. Any 401 Auth errors are dealt with by ngDrive which will request a new access token and retry automatically. If after 10 retries, there is still no valid access token, the 401 will be
escalated to your app.


#### Show me the code
We've created two sample apps for you to look at.

The first is a [minimal app](https://github.com/pinoyyid/ngDrive-demo/blob/master/demo_app/minimal.html) which strips it all down so all of the code lives within the HTML page.
This example shows fetching a list of Drive files and displaying the titles.

The second is [fuller app](https://github.com/pinoyyid/ngDrive-demo/blob/master/demo_app/maximal.html) which does most of its work in
 [this controller](https://github.com/pinoyyid/ngDrive-demo/blob/master/ngDrive/appscripts/controllers/maximal_c.ts).


If you want to run either of these, you'll need to:-

1. Replace the client ID with your own
1. Run a server in the root directory of the project
1. Check that the URL origin has been configured into your Google API Console. I always edit /etc/hosts to have dev.mydomain.com aliased to localhost,
and then configure http://dev.mydomain.com:8000 into the Google API Console.


#### How do I get help?
Post a question on StackOverflow using the "google-drive-sdk" tag. If you've found a problem, please raise an issue here on GitHub.

#### How do I thank you enough?
Just doing our job ma'am.

### Notes on cloning and hacking this repo
* Clone with `git clone https://github.com/pinoyyid/ngDrive.git`
* Change your current working directory to your cloned repo using `cd ngDrive`
* Install Node dependencies using `npm install`
* Install Bower dependencies using `bower install`
* Test your environment is working with `grunt test`
* You'll need to create your own project at the [Google API Console](https://code.google.com/apis/console/b/0/) and substitute your client id at `OauthServiceProvider.setClientID('2231299-2bvf1.apps.googleusercontent.com');`

### Dev tools
If you're writing in TypeScript, you'll need the tsc compiler vers 1.4 or above. If you're using WebStorm, you'll need WS10 or above. `ngdrive_ts_declaration_files/drive_interfaces.d.ts` contains all of the type definitions for ngDrive Drive.

### Contributors
The library was developed by members of the [ngManila](http://www.meetup.com/Manila-AngularJS-Group/) community, specifically Roy Smith and [Johnny Estilles](https://github.com/JohnnyEstilles) of [Agentia Systems](http://www.agentia.asia).
Contributions and PR's welcome. Please note that we have developed this library in TypeScript, so any contributions must also be in TS.
Please observe the rules in .editorconfig.
