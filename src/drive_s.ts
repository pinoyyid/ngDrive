/// <reference path="../ngdrive_ts_declaration_files/drive_interfaces.d.ts"/>

'use strict';

module ngDrive {

    /**
     *
     */
    export class DriveService implements IDriveService {
        sig = 'DriveService';                                                                                           // used in unit testing to confirm DI
        // this files object (and the self assignment) allows calls of the nature DriveService.files.insert for compatibility with gapi structure
        files = {
            self: this,
            get: this.filesGet,
            insert: this.filesInsert,
            insertWithContent: this.filesInsertWithContent,
            list: this.filesList,
            update: this.filesUpdate,
            patch: this.filesPatch,
            trash: this.filesTrash,
            untrash: this.filesUntrash,
            del: this.filesDelete,
            watch: this.filesWatch,
            touch: this.filesTouch,
            emptyTrash: this.filesEmptyTrash
        };
        about = {
            self: this,
            get: this.aboutGet
        };
        changes = {
            self: this,
            get: this.changesGet,
            list: this.changesList,
            watch: this.changesWatch
        };

        children = {
            self: this,
            get: this.childrenGet,
            del: this.childrenDelete,
            insert: this.childrenInsert,
            list: this.childrenList
        };
        parents = {
            self: this,
            get: this.parentsGet,
            del: this.parentsDelete,
            insert: this.parentsInsert,
            list: this.parentsList
        };
        permissions = {
            self: this,
            get: this.permissionsGet,
            del: this.permissionsDelete,
            insert: this.permissionsInsert,
            update: this.permissionsUpdate,
            patch: this.permissionsPatch,
            list: this.permissionsList,
            getIdForEmail: this.permissionsGetIdForEmail
        };
        revisions = {
            self: this,
            get: this.revisionsGet,
            del: this.revisionsDelete,
            update: this.revisionsUpdate,
            patch: this.revisionsPatch,
            list: this.revisionsList
        };


        self = this;                                                                                                    // this is recursive and is only required if we expose the files.get form (as opposed to filesGet)

        RESOURCE_TOKEN = 'reSource';
        urlBase = 'https://www.googleapis.com/drive/v2/' + this.RESOURCE_TOKEN + '/:id';
        filesUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'files');
        filesUploadUrl = 'https://www.googleapis.com/upload/drive/v2/files';
        changesUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'changes');
        aboutUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'about');
        childrenUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'files/:fid/children');
        parentsUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'files/:cid/parents');
        permissionsUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'files/:fid/permissions');
        permissionIdsUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'permissionIds');
        revisionsUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'files/:fid/revisions');
        urlTrashSuffix = '/trash';
        urlUntrashSuffix = '/untrash';
        urlWatchSuffix = '/watch';
        urlTouchSuffix = '/touch';

        lastFile: IDriveFile = { id: 'noid' };                                                                             // for testing, holds the most recent file response

        static $inject = ['$log', '$timeout', '$q', 'HttpService'];

        constructor(private $log: mng.ILogService, private $timeout: mng.ITimeoutService,
            private $q: mng.IQService, private HttpService: IHttpService) {
        }

		/**
		 * getter for underlying HttpService, often used to in turn get OauthService or the $http service
		 *
		 * @returns {IHttpService}
		 */
        getHttpService(): IHttpService {
            return this.HttpService;
        }

		/*
		 Each method implements a method from https://developers.google.com/drive/v2/reference/files .
		 Generally this is done by constructing an appropriate IRequestConfig object and passing it to the HttpService.

		 NB. To support the DriveService.files.insert form of calling, references to "this" must always be "this.self"

		 */


		/**
		 * Implements Get for the About resource
		 * See https://developers.google.com/drive/v2/reference/about/get
		 *
		 * @params includeSubscribed etc
		 * @returns {IDriveResponseObject}
		 */
        aboutGet(params: IDriveAboutGetParameters): IDriveResponseObject<IDriveAbout, IDriveAbout> {
            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.aboutUrl.replace(':id', ''),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveAbout, IDriveAbout> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveAbout>) => {                                     // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                              // if file, transcribe properties
            });
            return responseObject;
        }

		/**
		 * Implements Get for the changes resource
		 * See https://developers.google.com/drive/v2/reference/changes/get
		 *
		 * @param params object containing a changeId
		 * @returns {IDriveResponseObject}
		 */
        changesGet(params: { changeId: number }): IDriveResponseObject<IDriveChange, IDriveChange> {
            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.changesUrl.replace(':id', '' + params.changeId)
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveChange, IDriveChange> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveChange>) => {                                    // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                              // if file, transcribe properties
            });
            return responseObject;
        }

		/**
		 * Implements changes.List
		 * Validates that Dev hasn't inadvertently excluded nextPageToken from response, displaying a warning if missing.
		 * Previously this fired an error, but there is a scenario where this is valid. Specifically, if Dev wants to
		 * just return the first n matches (which are generally the n most recent), he can do this by setting maxResults
		 * and omitting the pageToken.
		 *
		 * responseObject.data contains an array of all results across all pages
		 *
		 * The promise will fire its notify for each page with data containing the raw http response object
		 * with an embedded items array. The final page will fire the resolve.
		 *
		 * @param params see https://developers.google.com/drive/v2/reference/changes/list
		 * @returns IDriveResponseObject
		 */
        changesList(params: IDriveChangeListParameters): IDriveResponseObject<IDriveChangeList, IDriveChange[]> {
            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.changesUrl.replace(':id', ''),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveChangeList, IDriveChange[]> = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then((resp: { data: IDriveChangeList }) => {                                                             // on complete
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                                   // push each new file
                    }   // Nb can't use concat as that creates a new array
                }
            }, undefined,
                (resp: { data: IDriveChangeList }) => {                                                                      // on notify, ie a single page of results
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                                   // push each new file
                    }   // Nb can't use concat as that creates a new array
                });
            return responseObject;
        }

		/**
		 * Implements drive.Watch
		 * NB This is not available as CORS endpoint for browser clients
		 *
		 * @param resource
		 * @returns IDriveResponseObject
		 */
        changesWatch(resource: IWatchBody) {
            this.self.$log.warn('[D137] NB files.watch is not available as a CORS endpoint for browser clients.');

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'POST',
                url: this.self.changesUrl.replace(':id', '') + this.self.urlWatchSuffix,
                data: resource
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IApiChannel, IApiChannel> = {
                promise: promise,
                data: undefined,
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IApiChannel>) => {                                            // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                                   // if file, transcribe properties
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

		/**
		 * Implements Get both for getting a file object and the newer alt=media to get a file's media content
		 * See https://developers.google.com/drive/v2/reference/files/get for semantics including the params object
		 *
		 * @param params
		 * @returns {IDriveResponseObject}
		 */
        filesGet(params: IDriveFileGetParameters): IDriveResponseObject<IDriveFile | string, IDriveFile | string> {
            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.filesUrl.replace(':id', params.fileId),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveFile | string, IDriveFile | string> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveFile | string>) => {                                      // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                if (params.alt == 'media') {                                                                            // figure out if the response is a file or media
                    responseObject.data['media'] = resp.data;                                                           // if media, assign to media property
                } else {
                    this.self.transcribeProperties(resp.data, responseObject);                                          // if file, transcribe properties
                    this.self.lastFile = resp.data;
                }
            });
            return responseObject;
        }

		/**
		 * Implements files.List
		 * Validates that Dev hasn't inadvertently excluded nextPageToken from response, displaying a warning if missing.
		 * Previously this fired an error, but there is a scenario where this is valid. Specifically, if Dev wants to
		 * just return the first n matches (which are generally the n most recent), he can do this by setting maxResults
		 * and omitting the pageToken.
		 *
		 * responseObject.data contains an array of all results across all pages
		 *
		 * The promise will fire its notify for each page with data containing the raw http response object
		 * with an embedded items array. The final page will fire the resolve.
		 *
		 * @param params see https://developers.google.com/drive/v2/reference/files/list
		 * @param excludeTrashed
		 * @returns IDriveResponseObject
		 */
        filesList(params: IDriveFileListParameters, excludeTrashed: boolean): IDriveResponseObject<IDriveFileList, IDriveFile[]> {
            if (params && params.fields && params.fields.indexOf('nextPageToken') == -1) {
                this.self.$log.warn('[D82] You have tried to list files with specific fields, but forgotten to include "nextPageToken" which will crop your results to just one page.');
            }
            if (excludeTrashed) {                                                                                       // if wants to exclude trashed
                var trashed = 'trashed = false';
                params.q = params.q ? params.q + ' and ' + trashed : trashed;                                           // set or append to q
            }
            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.filesUrl.replace(':id', ''),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveFileList, IDriveFile[]> = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then((resp: { data: IDriveFileList }) => {    			                                                // on complete
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                                   // push each new file
                    }   // Nb can't use concat as that creates a new array
                }
            }, undefined,
                (resp: { data: IDriveFileList }) => {                                                                        // on notify, ie a single page of results
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                                   // push each new file
                    }   // Nb can't use concat as that creates a new array
                });
            return responseObject;
        }

		/**
		 * Implements Insert, both for metadata only and for multipart media content upload
		 *
		 * See https://developers.google.com/drive/v2/reference/files/insert for semantics including the params object
		 *
		 *
		 * Optionally (default true) it will store the ID returned in the Drive response in the file object that was passed to it.
		 * This is done since it is almost always what an app needs to do, and by doing it in this method, saves the developer from
		 * writing any promise.then logic
		 *
		 * @param file  Files resource with at least a mime type
		 * @param params see Google docs, must contain at least uploadType
		 * @param content
		 * @param contentHeaders sets the content headers for the content part of the multipart body. A typical use would be
		 * to set the Content-Transfer-Encoding to base64 thus {'Content-Transfer-Encoding ', 'base64'}. Because content-transfer-encoding
		 * is the most common case, a simple string value will be interpreted as content-transfer-encoding, thus either 'base64' or {'Content-Transfer-Encoding ', 'base64'}
		 * have the same effect.
		 * @param storeId stores the ID from the Google Drive response in the original file object. NB DEFAULTS TO TRUE
		 * @returns IDriveResponseObject
		 */
        filesInsertWithContent(file: IDriveFile, params: IDriveFileInsertParameters,
            content: string,
            contentHeaders: string | {},
            storeId?: boolean): IDriveResponseObject<IDriveFile, IDriveFile> {
            var configObject: mng.IRequestConfig;
            if (!params || !params.uploadType) {
                var s = "[D314] Missing params (which must contain uploadType)";
                return this.self.reject(s);
            }
            if (!content) {
                var s = "[D318] Missing content";
                return this.self.reject(s);
            }
            try {
                configObject = this.self.buildUploadConfigObject(file, params, content, contentHeaders, true);                  // build a config object from params
                configObject.method = 'POST';
                configObject.url = this.self.filesUploadUrl;                                                                    // nb non-standard URL
            } catch (ex) {                                                                                                    // any validation errors throw an exception
                return this.self.reject(ex);
            }


            // resumable uploads are very special as they involve multiple calls, so deal with separately
            if (params.uploadType == 'resumable') {
                return this.self._resumableUpload(file, params, content, contentHeaders, configObject, storeId, undefined);
            }

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<IDriveFile, IDriveFile> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveFile>) => {                                             // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
                if (storeId == undefined || storeId == true) {                                                          // if requested
                    file.id = resp.data.id;                                                                             // store the ID
                }
                this.self.transcribeProperties(resp.data, responseObject);
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

		/**
		* deals with resumable uploads. Called once at the beginning of an upload
		*/
        _resumableUpload(
            file: IDriveFile,
            params: IDriveFileInsertParameters,
            content: string,
            contentHeaders: string | {},
            configObject: mng.IRequestConfig,
            storeId: boolean,
            resumableDef: mng.IDeferred<any>
            ): IDriveResponseObject<IDriveFile, IDriveFile> {
            params.resumableStart = params.resumableStart ? params.resumableStart : 0;
            params.resumableChunkLength = params.resumableChunkLength ? params.resumableChunkLength : 256 * 1024;

            if (!resumableDef) {
                resumableDef = this.self.$q.defer();
            }

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<IDriveFile, IDriveFile> = {
                promise: resumableDef.promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveFile>) => {                                             // on complete
                if (resp && resp.data && resp.data.id) {                                                              // and there is an ID (ie first response)
                    this.self.transcribeProperties(resp.data, responseObject);
                    this.self.lastFile = resp.data;
                    if (storeId == undefined || storeId == true) {                                                          // if requested
                        file.id = resp.data.id;                                                                            // store the ID
                    }
                    resumableDef.resolve(resp);                                                                           // and resolve the top level promise
                    return responseObject;                                                                                // and terminate recursion
                }

                // here if more chunks to send
                resumableDef.notify(params.resumableStart);                                                                 // give a notify
                if (resp.headers('location') && resp.headers('location') != null) {                                         // first response will have a location
                    configObject.url = resp.headers('location');
                }
                configObject.data = content.substr(params.resumableStart, params.resumableChunkLength);
                // configObject.transformRequest = (data)=> {console.info(data.length);return data};
                configObject.transformRequest = undefined;
                // configObject.headers['Content-Length'] = params.resumableChunkLength;
                configObject.headers['Content-Type'] = file.mimeType;
                // if (typeof contentHeaders === 'string') {                                                                     // if a simple string, interpret it as Content-Transfer-Encoding
                // configObject.headers['Content-Transfer-Encoding'] = contentHeaders;
                // }
                // see console log for termination condition
                configObject.headers['Content-Range'] = 'bytes ' + params.resumableStart + '-' + (params.resumableStart + configObject.data.length - 1) + '/' + content.length;
                configObject.data = this.str2ab(configObject.data);                                               // convert from string to array
                params.resumableStart += params.resumableChunkLength;
                return this.self._resumableUpload(file, params, content, contentHeaders, configObject, storeId, resumableDef);
            }
            // ,  (err: mng.IHttpPromiseCallbackArg<IDriveFile>)=>{console.warn('[d438] there was an error ', err)}
            //     (notify)=> {
            //       console.info('[d440] received a notify ',notify);
            //     }
                ).catch((resp) => {
                console.error('[D446] Error', resp);
                resumableDef.reject(resp);
                return responseObject;
            });
            return responseObject;
        }

        /**
         * convert string to int8 array to prevent angular $http from munging it
         * from http://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers
         */
        str2ab(str) {
            var buf = new ArrayBuffer(str.length); // 2 bytes for each char
            var bufView = new Uint8Array(buf);
            for (var i = 0, strLen = str.length; i < strLen; i++) {
                bufView[i] = str.charCodeAt(i);
            }
            return buf;
        }

		/**
		 * Implements Insert for metadata only
		 *
		 * See https://developers.google.com/drive/v2/reference/files/insert for semantics including the params object
		 *
		 * Optionally (default true) it will store the ID returned in the Drive response in the file object that was passed to it.
		 * This is done since it is almost always what an app needs to do, and by doing it in this method, saves the developer from
		 * writing any promise.then logic
		 *
		 * @param file  Files resource with at least a mime type
		 * @param storeId stores the ID from the Google Drive response in the original file object. NB DEFAULTS TO TRUE
		 * @returns IDriveResponseObject
		 */
        filesInsert(file: IDriveFile, storeId?: boolean): IDriveResponseObject<IDriveFile, IDriveFile> {
            var configObject: mng.IRequestConfig = {
                method: 'POST',
                url: this.self.filesUrl.replace(':id', ''),
                data: file
            };

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<IDriveFile, IDriveFile> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveFile>) => {                                             // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
                if (storeId == undefined || storeId == true) {                                                          // if requested
                    file.id = resp.data.id;                                                                             // stgore the ID
                }
                this.self.transcribeProperties(resp.data, responseObject);
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

		/**
		 * Implements Update, both for metadata only and for multipart media content upload
		 * TODO NB resumable uploads not yet supported
		 *
		 * See https://developers.google.com/drive/v2/reference/files/update for semantics including the params object
		 *
		 * @param file  Files resource
		 * @param params see Google docs
		 * @param content
		 * @param contentHeaders see insertWithContent for a decription
		 * @returns IDriveResponseObject
		 */
        filesUpdate(file: IDriveFile, params?: IDriveFileUpdateParameters, content?: string, contentHeaders?: string | {}): IDriveResponseObject<IDriveFile, IDriveFile> {
            // validate there is an id somewhere, either in the passed file, or in params.fileId
            var id;
            if (params && params.fileId) {                                                                                    // if in params.fileID
                id = params.fileId;
            } else {                                                                                                          // else
                if (file.id) {                                                                                                  // if in file object
                    id = file.id;
                } else {                                                                                                        // if no ID
                    var s = "[D193] Missing fileId";
                    return this.self.reject(s);
                }
            }
            var configObject: mng.IRequestConfig;
            if (!params || !params.uploadType) {
                configObject = { method: 'PUT', url: this.self.filesUrl.replace(':id', id), data: file };                         // no params is a simple metadata insert
            } else {
                try {
                    configObject = this.self.buildUploadConfigObject(file, params, content, contentHeaders, false);               // build a config object from params
                    configObject.method = 'PUT';
                    configObject.url = this.self.filesUploadUrl + '/' + params.fileId;                                            // nb non-standard URL
                } catch (ex) {                                                                                                  // any validation errors throw an exception
                    return this.self.reject(ex);
                }
            }

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<IDriveFile, IDriveFile> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveFile | string>) => {                                            // on complete
                responseObject.headers = resp.headers;                                                                          // transcribe headers
                this.self.transcribeProperties(resp.data, responseObject);
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

		/**
		 * Implements drive.patch
		 *
		 * @param params containg a fileID and a files resource
		 * @returns IDriveResponseObject
		 */
        filesPatch(params: { fileId: string; resource: IDriveFile }): IDriveResponseObject<IDriveFile, IDriveFile> {
            if (!params || !params.fileId) {
                var s = "[D230] Missing fileId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                                     // build request config
                method: 'PATCH',
                url: this.self.filesUrl.replace(':id', params.fileId),
                data: params.resource
            };
            var promise = this.self.HttpService.doHttp(co);                                                                   // call HttpService
            var responseObject: IDriveResponseObject<IDriveFile, IDriveFile> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveFile | string>) => {                                            // on complete
                responseObject.headers = resp.headers;                                                                          // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                                      // if file, transcribe properties
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

		/**
		 * Implements drive.trash
		 *
		 * @param params fileId
		 * @returns IDriveResponseObject
		 */
        filesTrash(params: { fileId: string }) {
            if (!params || !params.fileId) {
                var s = "[D225] Missing fileId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'POST',
                url: this.self.filesUrl.replace(':id', params.fileId) + this.self.urlTrashSuffix
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveFile, IDriveFile> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveFile>) => {                               // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                                   // if file, transcribe properties
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

		/**
		 * Implements drive.Untrash
		 *
		 * @param params fileId
		 * @returns IDriveResponseObject
		 */
        filesUntrash(params: { fileId: string }) {
            if (!params || !params.fileId) {
                var s = "[D251] Missing fileId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'POST',
                url: this.self.filesUrl.replace(':id', params.fileId) + this.self.urlUntrashSuffix
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveFile, IDriveFile> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveFile | string>) => {                               // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                                   // if file, transcribe properties
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

		/**
		 * Implements drive.delete
		 *
		 * @param params fileID
		 * @returns IDriveResponseObject
		 */
        filesDelete(params: { fileId: string }) {
            if (!params || !params.fileId) {
                var s = "[D222] Missing fileId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'delete',
                url: this.self.filesUrl.replace(':id', params.fileId)
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveFile, IDriveFile> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveFile | string>) => {                               // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
            });
            return responseObject;
        }

		/**
		 * Implements drive.Watch
		 * NB This is not available as CORS endpoint for browser clients
		 *
		 * @param params mandatory fileID optional alt and revisionId
		 * @param resource
		 * @returns IDriveResponseObject
		 */
        filesWatch(params: { fileId: string }, resource: IWatchBody) {
            this.self.$log.warn('[D334] NB files.watch is not available as a CORS endpoint for browser clients.');
            if (!params || !params.fileId) {
                var s = "[D302] Missing id";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'POST',
                url: this.self.filesUrl.replace(':id', params.fileId) + this.self.urlWatchSuffix,
                params: params,
                data: resource
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IApiChannel, IApiChannel> = {
                promise: promise,
                data: undefined,
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IApiChannel>) => {                                            // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                                   // if file, transcribe properties
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

		/**
		 * Implements drive.Touch
		 *
		 * @param params
		 * @returns IDriveResponseObject
		 */
        filesTouch(params: { fileId: string }) {
            if (!params || !params.fileId) {
                var s = "[D329] Missing fileId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'POST',
                url: this.self.filesUrl.replace(':id', params.fileId) + this.self.urlTouchSuffix
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveFile, IDriveFile> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveFile | string>) => {                                      // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                              // if file, transcribe properties
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

		/**
		 * Implements drive.emptyTrash
		 *
		 * @returns IDriveResponseObject
		 */
        filesEmptyTrash() {
            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'DELETE',
                url: this.self.filesUrl.replace(':id', 'trash')
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveFile, IDriveFile> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<any>) => {                                                    // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
            });
            return responseObject;
        }


		/*
					  C H I L D R E N
		 */


		/**
		 * Implements Get for getting a children object
		 * See https://developers.google.com/drive/v2/reference/children/get for semantics including the params object
		 *
		 * @param params
		 * @returns {IDriveResponseObject}
		 */
        childrenGet(params: IDriveChildGetParameters): IDriveResponseObject<IDriveChild | string, IDriveChild | string> {
            if (!params || !params.folderId) {
                var s = "[D679] Missing params.folderId";
                return this.self.reject(s);
            }
            if (!params.childId) {
                var s = "[D683] Missing childId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.childrenUrl.replace(':fid', params.folderId).replace(":id", params.childId),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveChild | string, IDriveChild | string> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveChild | string>) => {                                     // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                              // if file, transcribe properties
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }


		/**
		 * Implements children.List
		 * Validates that Dev hasn't inadvertently excluded nextPageToken from response, displaying a warning if missing.
		 * Previously this fired an error, but there is a scenario where this is valid. Specifically, if Dev wants to
		 * just return the first n matches (which are generally the n most recent), he can do this by setting maxResults
		 * and omitting the pageToken.
		 *
		 * responseObject.data contains an array of all results across all pages
		 *
		 * The promise will fire its notify for each page with data containing the raw http response object
		 * with an embedded items array. The final page will fire the resolve.
		 *
		 * @param params see https://developers.google.com/drive/v2/reference/files/list
		 * @param excludeTrashed
		 * @returns IDriveResponseObject
		 */
        childrenList(params: IDriveChildListParameters, excludeTrashed: boolean): IDriveResponseObject<IDriveChildList, IDriveChild[]> {
            if (params && params.fields && params.fields.indexOf('nextPageToken') == -1) {
                this.self.$log.warn('[D712] You have tried to list children with specific fields, but forgotten to include "nextPageToken" which will crop your results to just one page.');
            }
            if (excludeTrashed) {                                                                                       // if wants to exclude trashed
                var trashed = 'trashed = false';
                params.q = params.q ? params.q + ' and ' + trashed : trashed;                                           // set or append to q
            }
            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.childrenUrl.replace(':fid', params.folderId).replace(":id", ""),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveChildList, IDriveChild[]> = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then((resp: { data: IDriveChildList }) => {    			                                                // on complete
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                               // push each new file
                    }   // Nb can't use concat as that creates a new array
                }
            }, undefined,
                (resp: { data: IDriveChildList }) => {                                                                       // on notify, ie a single page of results
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                                   // push each new file
                    }   // Nb can't use concat as that creates a new array
                });
            return responseObject;
        }


		/**
		 * Implements Insert for children, ie. adding a file to a folder
		 *
		 * See https://developers.google.com/drive/v2/reference/children/insert for semantics including the params object
		 *
		 * Optionally (default true) it will store the ID returned in the Drive response in the file object that was passed to it.
		 * This is done since it is almost always what an app needs to do, and by doing it in this method, saves the developer from
		 * writing any promise.then logic
		 *
		 * @param params contains the folderId
		 * @param child  Child resource with at least an ID
		 * @returns IDriveResponseObject
		 */
        childrenInsert(params: { folderId: string }, child: IDriveChild): IDriveResponseObject<IDriveChild, IDriveChild> {
            if (!params || !params.folderId) {
                var s = "[D763] Missing params.folderId";
                return this.self.reject(s);
            }
            if (!child || !child.id) {
                var s = "[D767] Missing childId";
                return this.self.reject(s);
            }
            var configObject: mng.IRequestConfig = {
                method: 'POST',
                url: this.self.childrenUrl.replace(':fid', params.folderId).replace(":id", ""),
                data: child
            };

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<IDriveChild, IDriveChild> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveChild>) => {                                            // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
                this.self.transcribeProperties(resp.data, responseObject);
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }


		/**
		 * Implements children.delete
		 *
		 * @param params folderID
		 * @returns IDriveResponseObject
		 */
        childrenDelete(params: { folderId: string; childId: string }) {
            if (!params || !params.folderId) {
                var s = "[D799] Missing fileId";
                return this.self.reject(s);
            }
            if (!params || !params.childId) {
                var s = "[D803] Missing childId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'delete',
                url: this.self.childrenUrl.replace(':fid', params.folderId).replace(":id", params.childId),
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveChild, IDriveChild> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveChild | string>) => {                                     // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
            });
            return responseObject;
        }



		/*
		    P A R E N T S
		 */


		/**
		 * Implements Get for getting a parents object
		 * See https://developers.google.com/drive/v2/reference/parents/get for semantics including the params object
		 *
		 * @param params
		 * @returns {IDriveResponseObject}
		 */
        parentsGet(params: IDriveParentGetParameters): IDriveResponseObject<IDriveParent | string, IDriveParent | string> {
            if (!params || !params.fileId) {
                var s = "[D874] Missing params.fileId";
                return this.self.reject(s);
            }
            if (!params.parentId) {
                var s = "[D878] Missing parentId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.parentsUrl.replace(':cid', params.fileId).replace(":id", params.parentId),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveParent | string, IDriveParent | string> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveParent | string>) => {                                    // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                              // if file, transcribe properties
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }


		/**
		 * Implements parents.List
		 * Validates that Dev hasn't inadvertently excluded nextPageToken from response, displaying a warning if missing.
		 * Previously this fired an error, but there is a scenario where this is valid. Specifically, if Dev wants to
		 * just return the first n matches (which are generally the n most recent), he can do this by setting maxResults
		 * and omitting the pageToken.
		 *
		 * responseObject.data contains an array of all results across all pages
		 *
		 * The promise will fire its notify for each page with data containing the raw http response object
		 * with an embedded items array. The final page will fire the resolve.
		 *
		 * @param params see https://developers.google.com/drive/v2/reference/parents/list
		 * @param excludeTrashed
		 * @returns IDriveResponseObject
		 */
        parentsList(params: IDriveParentListParameters, excludeTrashed: boolean): IDriveResponseObject<IDriveParentList, IDriveParent[]> {
            if (params && params.fields && params.fields.indexOf('nextPageToken') == -1) {
                this.self.$log.warn('[D712] You have tried to list parents with specific fields, but forgotten to include "nextPageToken" which will crop your results to just one page.');
            }
            if (excludeTrashed) {                                                                                       // if wants to exclude trashed
                var trashed = 'trashed = false';
                params.q = params.q ? params.q + ' and ' + trashed : trashed;                                           // set or append to q
            }
            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.parentsUrl.replace(':cid', params.fileId).replace(":id", ""),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveParentList, IDriveParent[]> = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then((resp: { data: IDriveParentList }) => {    			                                                // on complete
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                                   // push each new file
                    }   // Nb can't use concat as that creates a new array
                }
            }, undefined,
                (resp: { data: IDriveParentList }) => {                                                                        // on notify, ie a single page of results
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                                   // push each new file
                    }   // Nb can't use concat as that creates a new array
                });
            return responseObject;
        }


		/**
		 * Implements Insert for parents, ie. adding a file to a folder
		 *
		 * See https://developers.google.com/drive/v2/reference/parents/insert for semantics including the params object
		 *
		 * Optionally (default true) it will store the ID returned in the Drive response in the file object that was passed to it.
		 * This is done since it is almost always what an app needs to do, and by doing it in this method, saves the developer from
		 * writing any promise.then logic
		 *
		 * @param params contains fileID
		 * @param parent  Parent resource with at least an ID
		 * @returns IDriveResponseObject
		 */
        parentsInsert(params: { fileId: string }, parent: IDriveParent): IDriveResponseObject<IDriveParent, IDriveParent> {
            if (!params || !params.fileId) {
                var s = "[D971] Missing params.fileId";
                return this.self.reject(s);
            }
            if (!parent || !parent.id) {
                var s = "[D975] Missing parentId";
                return this.self.reject(s);
            }
            var configObject: mng.IRequestConfig = {
                method: 'POST',
                url: this.self.parentsUrl.replace(':cid', params.fileId).replace(":id", ""),
                data: parent
            };

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<IDriveParent, IDriveParent> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveParent>) => {                                           // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
                this.self.transcribeProperties(resp.data, responseObject);
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }


		/**
		 * Implements parents.delete
		 *
		 * @param params folderID
		 * @returns IDriveResponseObject
		 */
        parentsDelete(params: { fileId: string; parentId: string }) {
            if (!params || !params.fileId) {
                var s = "[D1007] Missing fileId";
                return this.self.reject(s);
            }
            if (!params || !params.parentId) {
                var s = "[D1010] Missing parentId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'delete',
                url: this.self.parentsUrl.replace(':cid', params.fileId).replace(":id", params.parentId),
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveParent, IDriveParent> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveParent | string>) => {                                    // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
            });
            return responseObject;
        }





		/*
		 P E R M I S S I O N S
		 */


		/**
		 * Implements Get for getting a permissions object
		 * See https://developers.google.com/drive/v2/reference/permissions/get for semantics including the params object
		 *
		 * @param params
		 * @returns {IDriveResponseObject}
		 */
        permissionsGet(params: IDrivePermissionGetParameters): IDriveResponseObject<IDrivePermission | string, IDrivePermission | string> {
            if (!params || !params.fileId) {
                var s = "[D1045] Missing params.fileId";
                return this.self.reject(s);
            }
            if (!params.permissionId) {
                var s = "[D1049] Missing permissionId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(":id", params.permissionId),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDrivePermission | string, IDrivePermission | string> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDrivePermission | string>) => {                                    // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                              // if file, transcribe properties
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }


		/**
		 * Implements permissions.List
		 * Validates that Dev hasn't inadvertently excluded nextPageToken from response, displaying a warning if missing.
		 * Previously this fired an error, but there is a scenario where this is valid. Specifically, if Dev wants to
		 * just return the first n matches (which are generally the n most recent), he can do this by setting maxResults
		 * and omitting the pageToken.
		 *
		 * responseObject.data contains an array of all results across all pages
		 *
		 * The promise will fire its notify for each page with data containing the raw http response object
		 * with an embedded items array. The final page will fire the resolve.
		 *
		 * @param params see https://developers.google.com/drive/v2/reference/permissions/list
		 * @returns IDriveResponseObject
		 */
        permissionsList(params: IDrivePermissionListParameters): IDriveResponseObject<IDrivePermissionList, IDrivePermission[]> {
            if (params && params.fields && params.fields.indexOf('nextPageToken') == -1) {
                this.self.$log.warn('[D1091] You have tried to list permissions with specific fields, but forgotten to include "nextPageToken" which will crop your results to just one page.');
            }
            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(":id", ""),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDrivePermissionList, IDrivePermission[]> = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then((resp: { data: IDrivePermissionList }) => {    			                                                // on complete
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                                   // push each new file
                    }   // Nb can't use concat as that creates a new array
                }
            }, undefined,
                (resp: { data: IDrivePermissionList }) => {                                                                        // on notify, ie a single page of results
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                                   // push each new file
                    }   // Nb can't use concat as that creates a new array
                });
            return responseObject;
        }


		/**
		 * Implements Insert for permissions, ie. adding a file to a folder
		 *
		 * See https://developers.google.com/drive/v2/reference/permissions/insert for semantics including the params object
		 *
		 * Optionally (default true) it will store the ID returned in the Drive response in the file object that was passed to it.
		 * This is done since it is almost always what an app needs to do, and by doing it in this method, saves the developer from
		 * writing any promise.then logic
		 *
		 * @param permission  Permission resource with at least an ID
		 * @param params contains fileID
		 * @returns IDriveResponseObject
		 */
        permissionsInsert(permission: IDrivePermission, params: { fileId: string }): IDriveResponseObject<IDrivePermission, IDrivePermission> {
            if (!params || !params.fileId) {
                var s = "[D1141] Missing params.fileId";
                return this.self.reject(s);
            }
            if (!permission || !permission.type || !permission.role) {
                var s = "[D1145] Missing role or type";
                return this.self.reject(s);
            }
            var configObject: mng.IRequestConfig = {
                method: 'POST',
                url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(":id", ""),
                data: permission
            };

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<IDrivePermission, IDrivePermission> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDrivePermission>) => {                                           // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
                this.self.transcribeProperties(resp.data, responseObject);
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }


		/**
		 * Implements permissions.delete
		 *
		 * @param params fileID, permissionId
		 * @returns IDriveResponseObject
		 */
        permissionsDelete(params: { fileId: string; permissionId: string }) {
            if (!params || !params.fileId) {
                var s = "[D1177] Missing fileId";
                return this.self.reject(s);
            }
            if (!params || !params.permissionId) {
                var s = "[D1181] Missing permissionId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'delete',
                url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(":id", params.permissionId),
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDrivePermission, IDrivePermission> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDrivePermission | string>) => {                                // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
            });
            return responseObject;
        }

		/**
		 * Implements permissions Update
		 *
		 * See https://developers.google.com/drive/v2/reference/permissions/update for semantics including the params object
		 *
		 * @param permission Permission resource
		 * @param params see Google docs
		 * @returns IDriveResponseObject
		 */
        permissionsUpdate(permission: IDrivePermission, params?: IDrivePermissionUpdateParameters): IDriveResponseObject<IDrivePermission, IDrivePermission> {
            // validate there is an id somewhere, either in the passed file, or in params.fileId
            var id;
            if (params && params.permissionId) {                                                                        // if in params.fileID
                id = params.permissionId;
            } else {                                                                                                    // else
                if (permission.id) {                                                                                    // if in file object
                    id = permission.id;
                } else {                                                                                                // if no ID
                    var s = "[D1214] Missing permissionId";
                    return this.self.reject(s);
                }
            }
            var configObject: mng.IRequestConfig;
            configObject = { method: 'PUT', url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(':id', id), data: permission };

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<IDrivePermission, IDrivePermission> = {
                promise: promise,
                data: {},
                params: params,
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDrivePermission | string>) => {                                // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
                this.self.transcribeProperties(resp.data, responseObject);
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

		/**
		 * Implements permissions Patch
		 *
		 * See https://developers.google.com/drive/v2/reference/permissions/patch for semantics including the params object
		 *
		 * @param permission Permission resource
		 * @param params see Google docs
		 * @returns IDriveResponseObject
		 */
        permissionsPatch(permission: IDrivePermission, params?: IDrivePermissionUpdateParameters): IDriveResponseObject<IDrivePermission, IDrivePermission> {
            // validate there is an id somewhere, either in the passed file, or in params.fileId
            var id;
            if (params && params.permissionId) {                                                                        // if in params.fileID
                id = params.permissionId;
            } else {                                                                                                    // else
                if (permission.id) {                                                                                    // if in file object
                    id = permission.id;
                } else {                                                                                                // if no ID
                    var s = "[D1254] Missing permissionId";
                    return this.self.reject(s);
                }
            }
            var configObject: mng.IRequestConfig;
            configObject = { method: 'PATCH', url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(':id', id), data: permission };

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<IDrivePermission, IDrivePermission> = {
                promise: promise,
                data: {},
                params: params,
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDrivePermission | string>) => {                                // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
                this.self.transcribeProperties(resp.data, responseObject);
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

        /**
             * Implements permissions getIds for email
             *
             * See https://developers.google.com/drive/v2/reference/permissions/getIdForEmail for semantics including the params object
             *
             * @param email
             * @returns IDriveResponseObject
             */
        permissionsGetIdForEmail(email: string): IDriveResponseObject<{ id?: string }, { id?: string }> {
            // validate there is an id somewhere, either in the passed file, or in params.fileId
            var id;
            var configObject: mng.IRequestConfig;
            configObject = { method: 'GET', url: this.self.permissionIdsUrl.replace(':id', email) };

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<{ id?: string }, { id?: string }> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<{ id?: string } | string>) => {                                    // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
                this.self.transcribeProperties(resp.data, responseObject);
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }


		/*
		 R E V I S I O N S
		 */


		/**
		 * Implements Get for getting a revisions object
		 * See https://developers.google.com/drive/v2/reference/revisions/get for semantics including the params object
		 *
		 * @param params
		 * @returns {IDriveResponseObject}
		 */
        revisionsGet(params: IDriveRevisionGetParameters): IDriveResponseObject<IDriveRevision | string, IDriveRevision | string> {
            if (!params || !params.fileId) {
                var s = "[D1310] Missing params.fileId";
                return this.self.reject(s);
            }
            if (!params.revisionId) {
                var s = "[D1314] Missing revisionId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.revisionsUrl.replace(':fid', params.fileId).replace(":id", params.revisionId),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveRevision | string, IDriveRevision | string> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveRevision | string>) => {                                  // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers function
                this.self.transcribeProperties(resp.data, responseObject);                                              // if file, transcribe properties
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }


		/**
		 * Implements revisions.List
		 *
		 * responseObject.data contains an array of all results across all pages
		 *
		 * The promise will fire its notify for each page with data containing the raw http response object
		 * with an embedded items array. The final page will fire the resolve.
		 *
		 * @param params see https://developers.google.com/drive/v2/reference/revisions/list
		 * @returns IDriveResponseObject
		 */
        revisionsList(params: IDriveRevisionListParameters): IDriveResponseObject<IDriveRevisionList, IDriveRevision[]> {
            // if (params && params.fields && params.fields.indexOf('nextPageToken') == -1) {
            //     this.self.$log.warn('[D1355] You have tried to list revisions with specific fields, but forgotten to include "nextPageToken" which will crop your results to just one page.');
            // }
            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'GET',
                url: this.self.revisionsUrl.replace(':fid', params.fileId).replace(":id", ""),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveRevisionList, IDriveRevision[]> = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then((resp: { data: IDriveRevisionList }) => {    			                                            // on complete
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                               // push each new file
                    }   // Nb can't use concat as that creates a new array
                }
            }, undefined,
                (resp: { data: IDriveRevisionList }) => {                                                                    // on notify, ie a single page of results
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);                                                   // push each new file
                    }   // Nb can't use concat as that creates a new array
                });
            return responseObject;
        }

		/**
		 * Implements revisions.delete
		 *
		 * @param params fileID, revisionId
		 * @returns IDriveResponseObject
		 */
        revisionsDelete(params: { fileId: string; revisionId: string }) {
            if (!params || !params.fileId) {
                var s = "[D1393] Missing fileId";
                return this.self.reject(s);
            }
            if (!params || !params.revisionId) {
                var s = "[D1397] Missing revisionId";
                return this.self.reject(s);
            }

            var co: mng.IRequestConfig = {                                                                               // build request config
                method: 'delete',
                url: this.self.revisionsUrl.replace(':fid', params.fileId).replace(":id", params.revisionId),
            };
            var promise = this.self.HttpService.doHttp(co);                                                             // call HttpService
            var responseObject: IDriveResponseObject<IDriveRevision, IDriveRevision> = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveRevision | string>) => {                                  // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
            });
            return responseObject;
        }

		/**
		 * Implements revisions Update
		 *
		 * See https://developers.google.com/drive/v2/reference/revisions/update for semantics including the params object
		 *
		 * @param revision Revision resource
		 * @param params see Google docs
		 * @returns IDriveResponseObject
		 */
        revisionsUpdate(revision: IDriveRevision, params?: IDriveRevisionUpdateParameters): IDriveResponseObject<IDriveRevision, IDriveRevision> {
            // validate there is an id somewhere, either in the passed file, or in params.fileId
            var id;
            if (params && params.revisionId) {                                                                          // if in params.fileID
                id = params.revisionId;
            } else {                                                                                                    // else
                if (revision.id) {                                                                                      // if in file object
                    id = revision.id;
                } else {                                                                                                // if no ID
                    var s = "[D1435] Missing revisionId";
                    return this.self.reject(s);
                }
            }
            var configObject: mng.IRequestConfig;
            configObject = { method: 'PUT', url: this.self.revisionsUrl.replace(':fid', params.fileId).replace(':id', id), data: revision };

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<IDriveRevision, IDriveRevision> = {
                promise: promise,
                data: {},
                params: params,
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveRevision | string>) => {                                  // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
                this.self.transcribeProperties(resp.data, responseObject);
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }

		/**
		 * Implements revisions Patch
		 *
		 * See https://developers.google.com/drive/v2/reference/revisions/patch for semantics including the params object
		 *
		 * @param revision Revision resource
		 * @param params see Google docs
		 * @returns IDriveResponseObject
		 */
        revisionsPatch(revision: IDriveRevision, params?: IDriveRevisionUpdateParameters): IDriveResponseObject<IDriveRevision, IDriveRevision> {
            // validate there is an id somewhere, either in the passed file, or in params.fileId
            var id;
            if (params && params.revisionId) {                                                                          // if in params.fileID
                id = params.revisionId;
            } else {                                                                                                    // else
                if (revision.id) {                                                                                      // if in file object
                    id = revision.id;
                } else {                                                                                                // if no ID
                    var s = "[D1475] Missing revisionId";
                    return this.self.reject(s);
                }
            }
            var configObject: mng.IRequestConfig;
            configObject = { method: 'PATCH', url: this.self.revisionsUrl.replace(':fid', params.fileId).replace(':id', id), data: revision };

            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject: IDriveResponseObject<IDriveRevision, IDriveRevision> = {
                promise: promise,
                data: {},
                params: params,
                headers: undefined
            };
            promise.then((resp: mng.IHttpPromiseCallbackArg<IDriveRevision | string>) => {                                  // on complete
                responseObject.headers = resp.headers;                                                                  // transcribe headers
                this.self.transcribeProperties(resp.data, responseObject);
                this.self.lastFile = resp.data;
            });
            return responseObject;
        }




		/*
		      C O M M O N  F U N C T I O N S
		 */



		/**
		 * reject the current request by creating a response object with a promise and rejecting it
		 * This is used to deal with validation errors prior to http submission
		 *
		 * @param reason
		 * @returns {{data: undefined, promise: IPromise<T>, headers: undefined}}
		 */
        reject(reason: any): IDriveResponseObject<any, any> {
            this.self.$log.error('ngDrive: ' + reason);
            var def = this.self.$q.defer();
            def.reject(reason);                                                                                         // which is used to reject the promise
            return { data: undefined, promise: def.promise, headers: undefined };
        }


		/**
		 * Used to build a $http config object for an upload. This will (normally) be a multipart mime body.
		 *
		 * NB This is used for the initial part of a resumable upload. Subsequent chunks are handled directly by the drive method.
		 *
		 * @param file
		 * @param params
		 * @param content
		 * @param contentHeaders see insertWithContent for a description
		 * @param isInsert true for insert, false/undefined for Update
		 * @returns a $http config object
		 *
		 * @throws D115 resumables not supported
		 * @throws D125 safety check there is a mime type
		 */
        buildUploadConfigObject(file: IDriveFile,
            params: IDriveFileInsertParameters | IDriveFileUpdateParameters,
            content: string,
            contentHeaders: string | {},
            isInsert: boolean): mng.IRequestConfig {

            //// check the media is base64 encoded
            //if (base64EncodedContent.match(/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/) == null) {
            //	throw ("[D142] content does not appear to be base64 encoded.");
            //}

            // check the dev provided a mime type for media or multipart
            if ((params.uploadType == 'multipart' || params.uploadType == 'media' || params.uploadType == 'resumable')
                && (isInsert && (!file || !file.mimeType))) {
                throw ("[D148] file metadata is missing mandatory mime type");
            }

            // deal with optional content headers
            var otherHeaders = "";
            //console.warn(contentHeaders);
            if (contentHeaders) {                                                                                           // if there are content headers specified
                if (typeof contentHeaders === 'string') {                                                                     // if a simple string, interpret it as Content-Transfer-Encoding
                    otherHeaders += 'Content-Transfer-Encoding: ' + contentHeaders + '\r\n';
                } else {
                    for (var key in contentHeaders) {                                                                           // if an object
                        otherHeaders += key + ': ' + contentHeaders[key] + '\r\n';                                                    // set each header
                    }
                }
            }
            //console.warn(otherHeaders);


            //			var base64Data = window['tools'].base64Encode(fileContent);
            var body: string|{};
            if (params.uploadType == 'multipart') {
                var boundary = '-------3141592ff65358979323846';
                var delimiter = "\r\n--" + boundary + "\r\n";
                var mimeHeader = '';
                if (isInsert) {                                                                                         // only set a mime header for inserts
                    mimeHeader = 'Content-Type: ' + file.mimeType + '\r\n';                                             // updates uses existing file
                }
                var close_delim = "\r\n--" + boundary + "--";
                body =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(file) +
                delimiter +
                otherHeaders +
                mimeHeader + '\r\n' +
                content +
                close_delim;
                //params['alt'] = 'json';
                var headers = {};
                headers['Content-Type'] = 'multipart/mixed; boundary="-------3141592ff65358979323846"'
            }

            if (params.uploadType == 'media') {
                body = content;
                var headers = {};
                if (isInsert) {
                    headers['Content-Type'] = file.mimeType;
                }
                //headers['Content-Transfer-Encoding'] = 'BASE64';
            }

            if (params.uploadType == 'resumable') {
                var headers = {};
                body = file;
                if (isInsert) {
                    headers['X-Upload-Content-Type'] = file.mimeType;
                }
                // if (typeof contentHeaders === 'string') {                                                                     // if a simple string, interpret it as Content-Transfer-Encoding
                // headers['Content-Transfer-Encoding'] = contentHeaders;     DOESN'T WORK IN GOOGLE DRIVE!!!!
                // headers['X-Upload-Content-Transfer-Encoding'] = contentHeaders;
                // }
            }

            // return the finished config object
            return { method: undefined, url: undefined, params: params, data: body, headers: headers }
        }


		/**
		 * instantiate each property of src object into dest object
		 * Used to transcribe properties from the returned JSON object to the responseObject so as not to break
		 * any object assignments the the view model
		 *
		 * @param src
		 * @param dest
		 */
        transcribeProperties(src, dest) {
            if (!dest.data) {
                dest.data = {};
            }
            if (typeof src == "object") {
                Object.keys(src).map(function(key) {
                    dest.data[key] = src[key]
                });
            } else {
                dest = src;
            }

        }
    }
}


// see https://developers.google.com/drive/web/scopes
// these are provided only a a convenience to the developer. They are not used by the library
//ngDrive.DRIVE_SCOPES = {
//	drive: "https://www.googleapis.com/auth/drive",
//	drive_file: "https://www.googleapis.com/auth/drive.file",
//	apps_readonly: "https://www.googleapis.com/auth/drive.apps.readonly",
//	readonly: "https://www.googleapis.com/auth/drive.readonly",
//	readonly_metadata: "https://www.googleapis.com/auth/drive.readonly.metadata",
//	install: "https://www.googleapis.com/auth/drive.install",
//	appfolder: "https://www.googleapis.com/auth/drive.appfolder",
//	scripts: "https://www.googleapis.com/auth/drive.scripts"
//};

declare var angular: mng.IAngularStatic;
angular.module('ngm.ngDrive')
    .service('DriveService', ngDrive.DriveService);
