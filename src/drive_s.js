'use strict';
var NgGapi;
(function (NgGapi) {
    var DriveService = (function () {
        function DriveService($log, $timeout, $q, HttpService) {
            this.$log = $log;
            this.$timeout = $timeout;
            this.$q = $q;
            this.HttpService = HttpService;
            this.sig = 'DriveService';
            this.files = {
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
            this.about = {
                self: this,
                get: this.aboutGet
            };
            this.changes = {
                self: this,
                get: this.changesGet,
                list: this.changesList,
                watch: this.changesWatch
            };
            this.children = {
                self: this,
                get: this.childrenGet,
                del: this.childrenDelete,
                insert: this.childrenInsert,
                list: this.childrenList
            };
            this.parents = {
                self: this,
                get: this.parentsGet,
                del: this.parentsDelete,
                insert: this.parentsInsert,
                list: this.parentsList
            };
            this.permissions = {
                self: this,
                get: this.permissionsGet,
                del: this.permissionsDelete,
                insert: this.permissionsInsert,
                update: this.permissionsUpdate,
                patch: this.permissionsPatch,
                list: this.permissionsList,
                getIdForEmail: this.permissionsGetIdForEmail
            };
            this.revisions = {
                self: this,
                get: this.revisionsGet,
                del: this.revisionsDelete,
                update: this.revisionsUpdate,
                patch: this.revisionsPatch,
                list: this.revisionsList
            };
            this.self = this;
            this.RESOURCE_TOKEN = 'reSource';
            this.urlBase = 'https://www.googleapis.com/drive/v2/' + this.RESOURCE_TOKEN + '/:id';
            this.filesUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'files');
            this.filesUploadUrl = 'https://www.googleapis.com/upload/drive/v2/files';
            this.changesUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'changes');
            this.aboutUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'about');
            this.childrenUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'files/:fid/children');
            this.parentsUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'files/:cid/parents');
            this.permissionsUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'files/:fid/permissions');
            this.permissionIdsUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'permissionIds');
            this.revisionsUrl = this.urlBase.replace(this.RESOURCE_TOKEN, 'files/:fid/revisions');
            this.urlTrashSuffix = '/trash';
            this.urlUntrashSuffix = '/untrash';
            this.urlWatchSuffix = '/watch';
            this.urlTouchSuffix = '/touch';
            this.lastFile = { id: 'noid' };
        }
        DriveService.prototype.getHttpService = function () {
            return this.HttpService;
        };
        DriveService.prototype.aboutGet = function (params) {
            var _this = this;
            var co = {
                method: 'GET',
                url: this.self.aboutUrl.replace(':id', ''),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
            });
            return responseObject;
        };
        DriveService.prototype.changesGet = function (params) {
            var _this = this;
            var co = {
                method: 'GET',
                url: this.self.changesUrl.replace(':id', '' + params.changeId)
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
            });
            return responseObject;
        };
        DriveService.prototype.changesList = function (params) {
            if (params && params.fields && params.fields.indexOf('nextPageToken') == -1) {
                this.self.$log.warn('[D145] You have tried to list changes with specific fields, but forgotten to include "nextPageToken" which will crop your results to just one page.');
            }
            var co = {
                method: 'GET',
                url: this.self.changesUrl.replace(':id', ''),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then(function (resp) {
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);
                    }
                }
            }, undefined, function (resp) {
                var l = resp.data.items.length;
                for (var i = 0; i < l; i++) {
                    responseObject.data.push(resp.data.items[i]);
                }
            });
            return responseObject;
        };
        DriveService.prototype.changesWatch = function (resource) {
            var _this = this;
            this.self.$log.warn('[D137] NB files.watch is not available as a CORS endpoint for browser clients.');
            var co = {
                method: 'POST',
                url: this.self.changesUrl.replace(':id', '') + this.self.urlWatchSuffix,
                data: resource
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: undefined,
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.filesGet = function (params) {
            var _this = this;
            var co = {
                method: 'GET',
                url: this.self.filesUrl.replace(':id', params.fileId),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                if (params.alt == 'media') {
                    responseObject.data['media'] = resp.data;
                }
                else {
                    _this.self.transcribeProperties(resp.data, responseObject);
                    _this.self.lastFile = resp.data;
                }
            });
            return responseObject;
        };
        DriveService.prototype.filesList = function (params, excludeTrashed) {
            if (params && params.fields && params.fields.indexOf('nextPageToken') == -1) {
                this.self.$log.warn('[D82] You have tried to list files with specific fields, but forgotten to include "nextPageToken" which will crop your results to just one page.');
            }
            if (excludeTrashed) {
                var trashed = 'trashed = false';
                params.q = params.q ? params.q + ' and ' + trashed : trashed;
            }
            var co = {
                method: 'GET',
                url: this.self.filesUrl.replace(':id', ''),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then(function (resp) {
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);
                    }
                }
            }, undefined, function (resp) {
                var l = resp.data.items.length;
                for (var i = 0; i < l; i++) {
                    responseObject.data.push(resp.data.items[i]);
                }
            });
            return responseObject;
        };
        DriveService.prototype.filesInsertWithContent = function (file, params, content, contentHeaders, storeId) {
            var _this = this;
            var configObject;
            if (!params || !params.uploadType) {
                var s = "[D314] Missing params (which must contain uploadType)";
                return this.self.reject(s);
            }
            if (!content) {
                var s = "[D318] Missing content";
                return this.self.reject(s);
            }
            try {
                configObject = this.self.buildUploadConfigObject(file, params, content, contentHeaders, true);
                configObject.method = 'POST';
                configObject.url = this.self.filesUploadUrl;
            }
            catch (ex) {
                return this.self.reject(ex);
            }
            if (params.uploadType == 'resumable') {
                return this.self._resumableUpload(file, params, content, contentHeaders, configObject, storeId, undefined);
            }
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                if (storeId == undefined || storeId == true) {
                    file.id = resp.data.id;
                }
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype._resumableUpload = function (file, params, content, contentHeaders, configObject, storeId, resumableDef) {
            var _this = this;
            params.resumableStart = params.resumableStart ? params.resumableStart : 0;
            params.resumableChunkLength = params.resumableChunkLength ? params.resumableChunkLength : 256 * 1024;
            if (!resumableDef) {
                resumableDef = this.self.$q.defer();
            }
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: resumableDef.promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                if (resp && resp.data && resp.data.id) {
                    _this.self.transcribeProperties(resp.data, responseObject);
                    _this.self.lastFile = resp.data;
                    if (storeId == undefined || storeId == true) {
                        file.id = resp.data.id;
                    }
                    resumableDef.resolve(resp);
                    return responseObject;
                }
                resumableDef.notify(params.resumableStart);
                if (resp.headers('location') && resp.headers('location') != null) {
                    configObject.url = resp.headers('location');
                }
                configObject.data = content.substr(params.resumableStart, params.resumableChunkLength);
                configObject.transformRequest = undefined;
                configObject.headers['Content-Type'] = file.mimeType;
                configObject.headers['Content-Range'] = 'bytes ' + params.resumableStart + '-' + (params.resumableStart + configObject.data.length - 1) + '/' + content.length;
                configObject.data = _this.str2ab(configObject.data);
                params.resumableStart += params.resumableChunkLength;
                return _this.self._resumableUpload(file, params, content, contentHeaders, configObject, storeId, resumableDef);
            }).catch(function (resp) {
                console.error('[D446] Error', resp);
                resumableDef.reject(resp);
                return responseObject;
            });
            return responseObject;
        };
        DriveService.prototype.str2ab = function (str) {
            var buf = new ArrayBuffer(str.length);
            var bufView = new Uint8Array(buf);
            for (var i = 0, strLen = str.length; i < strLen; i++) {
                bufView[i] = str.charCodeAt(i);
            }
            return buf;
        };
        DriveService.prototype.filesInsert = function (file, storeId) {
            var _this = this;
            var configObject = {
                method: 'POST',
                url: this.self.filesUrl.replace(':id', ''),
                data: file
            };
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                if (storeId == undefined || storeId == true) {
                    file.id = resp.data.id;
                }
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.filesUpdate = function (file, params, content, contentHeaders) {
            var _this = this;
            var id;
            if (params && params.fileId) {
                id = params.fileId;
            }
            else {
                if (file.id) {
                    id = file.id;
                }
                else {
                    var s = "[D193] Missing fileId";
                    return this.self.reject(s);
                }
            }
            var configObject;
            if (!params || !params.uploadType) {
                configObject = { method: 'PUT', url: this.self.filesUrl.replace(':id', id), data: file };
            }
            else {
                try {
                    configObject = this.self.buildUploadConfigObject(file, params, content, contentHeaders, false);
                    configObject.method = 'PUT';
                    configObject.url = this.self.filesUploadUrl + '/' + params.fileId;
                }
                catch (ex) {
                    return this.self.reject(ex);
                }
            }
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.filesPatch = function (params) {
            var _this = this;
            if (!params || !params.fileId) {
                var s = "[D230] Missing fileId";
                return this.self.reject(s);
            }
            var co = {
                method: 'PATCH',
                url: this.self.filesUrl.replace(':id', params.fileId),
                data: params.resource
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.filesTrash = function (params) {
            var _this = this;
            if (!params || !params.fileId) {
                var s = "[D225] Missing fileId";
                return this.self.reject(s);
            }
            var co = {
                method: 'POST',
                url: this.self.filesUrl.replace(':id', params.fileId) + this.self.urlTrashSuffix
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.filesUntrash = function (params) {
            var _this = this;
            if (!params || !params.fileId) {
                var s = "[D251] Missing fileId";
                return this.self.reject(s);
            }
            var co = {
                method: 'POST',
                url: this.self.filesUrl.replace(':id', params.fileId) + this.self.urlUntrashSuffix
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.filesDelete = function (params) {
            if (!params || !params.fileId) {
                var s = "[D222] Missing fileId";
                return this.self.reject(s);
            }
            var co = {
                method: 'delete',
                url: this.self.filesUrl.replace(':id', params.fileId)
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
            });
            return responseObject;
        };
        DriveService.prototype.filesWatch = function (params, resource) {
            var _this = this;
            this.self.$log.warn('[D334] NB files.watch is not available as a CORS endpoint for browser clients.');
            if (!params || !params.fileId) {
                var s = "[D302] Missing id";
                return this.self.reject(s);
            }
            var co = {
                method: 'POST',
                url: this.self.filesUrl.replace(':id', params.fileId) + this.self.urlWatchSuffix,
                params: params,
                data: resource
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: undefined,
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.filesTouch = function (params) {
            var _this = this;
            if (!params || !params.fileId) {
                var s = "[D329] Missing fileId";
                return this.self.reject(s);
            }
            var co = {
                method: 'POST',
                url: this.self.filesUrl.replace(':id', params.fileId) + this.self.urlTouchSuffix
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.filesEmptyTrash = function () {
            var co = {
                method: 'DELETE',
                url: this.self.filesUrl.replace(':id', 'trash')
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
            });
            return responseObject;
        };
        DriveService.prototype.childrenGet = function (params) {
            var _this = this;
            if (!params || !params.folderId) {
                var s = "[D679] Missing params.folderId";
                return this.self.reject(s);
            }
            if (!params.childId) {
                var s = "[D683] Missing childId";
                return this.self.reject(s);
            }
            var co = {
                method: 'GET',
                url: this.self.childrenUrl.replace(':fid', params.folderId).replace(":id", params.childId),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.childrenList = function (params, excludeTrashed) {
            if (params && params.fields && params.fields.indexOf('nextPageToken') == -1) {
                this.self.$log.warn('[D712] You have tried to list children with specific fields, but forgotten to include "nextPageToken" which will crop your results to just one page.');
            }
            if (excludeTrashed) {
                var trashed = 'trashed = false';
                params.q = params.q ? params.q + ' and ' + trashed : trashed;
            }
            var co = {
                method: 'GET',
                url: this.self.childrenUrl.replace(':fid', params.folderId).replace(":id", ""),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then(function (resp) {
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);
                    }
                }
            }, undefined, function (resp) {
                var l = resp.data.items.length;
                for (var i = 0; i < l; i++) {
                    responseObject.data.push(resp.data.items[i]);
                }
            });
            return responseObject;
        };
        DriveService.prototype.childrenInsert = function (params, child) {
            var _this = this;
            if (!params || !params.folderId) {
                var s = "[D763] Missing params.folderId";
                return this.self.reject(s);
            }
            if (!child || !child.id) {
                var s = "[D767] Missing childId";
                return this.self.reject(s);
            }
            var configObject = {
                method: 'POST',
                url: this.self.childrenUrl.replace(':fid', params.folderId).replace(":id", ""),
                data: child
            };
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.childrenDelete = function (params) {
            if (!params || !params.folderId) {
                var s = "[D799] Missing fileId";
                return this.self.reject(s);
            }
            if (!params || !params.childId) {
                var s = "[D803] Missing childId";
                return this.self.reject(s);
            }
            var co = {
                method: 'delete',
                url: this.self.childrenUrl.replace(':fid', params.folderId).replace(":id", params.childId),
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
            });
            return responseObject;
        };
        DriveService.prototype.parentsGet = function (params) {
            var _this = this;
            if (!params || !params.fileId) {
                var s = "[D874] Missing params.fileId";
                return this.self.reject(s);
            }
            if (!params.parentId) {
                var s = "[D878] Missing parentId";
                return this.self.reject(s);
            }
            var co = {
                method: 'GET',
                url: this.self.parentsUrl.replace(':cid', params.fileId).replace(":id", params.parentId),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.parentsList = function (params, excludeTrashed) {
            if (params && params.fields && params.fields.indexOf('nextPageToken') == -1) {
                this.self.$log.warn('[D712] You have tried to list parents with specific fields, but forgotten to include "nextPageToken" which will crop your results to just one page.');
            }
            if (excludeTrashed) {
                var trashed = 'trashed = false';
                params.q = params.q ? params.q + ' and ' + trashed : trashed;
            }
            var co = {
                method: 'GET',
                url: this.self.parentsUrl.replace(':cid', params.fileId).replace(":id", ""),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then(function (resp) {
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);
                    }
                }
            }, undefined, function (resp) {
                var l = resp.data.items.length;
                for (var i = 0; i < l; i++) {
                    responseObject.data.push(resp.data.items[i]);
                }
            });
            return responseObject;
        };
        DriveService.prototype.parentsInsert = function (params, parent) {
            var _this = this;
            if (!params || !params.fileId) {
                var s = "[D971] Missing params.fileId";
                return this.self.reject(s);
            }
            if (!parent || !parent.id) {
                var s = "[D975] Missing parentId";
                return this.self.reject(s);
            }
            var configObject = {
                method: 'POST',
                url: this.self.parentsUrl.replace(':cid', params.fileId).replace(":id", ""),
                data: parent
            };
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.parentsDelete = function (params) {
            if (!params || !params.fileId) {
                var s = "[D1007] Missing fileId";
                return this.self.reject(s);
            }
            if (!params || !params.parentId) {
                var s = "[D1010] Missing parentId";
                return this.self.reject(s);
            }
            var co = {
                method: 'delete',
                url: this.self.parentsUrl.replace(':cid', params.fileId).replace(":id", params.parentId),
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
            });
            return responseObject;
        };
        DriveService.prototype.permissionsGet = function (params) {
            var _this = this;
            if (!params || !params.fileId) {
                var s = "[D1045] Missing params.fileId";
                return this.self.reject(s);
            }
            if (!params.permissionId) {
                var s = "[D1049] Missing permissionId";
                return this.self.reject(s);
            }
            var co = {
                method: 'GET',
                url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(":id", params.permissionId),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.permissionsList = function (params) {
            if (params && params.fields && params.fields.indexOf('nextPageToken') == -1) {
                this.self.$log.warn('[D1091] You have tried to list permissions with specific fields, but forgotten to include "nextPageToken" which will crop your results to just one page.');
            }
            var co = {
                method: 'GET',
                url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(":id", ""),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then(function (resp) {
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);
                    }
                }
            }, undefined, function (resp) {
                var l = resp.data.items.length;
                for (var i = 0; i < l; i++) {
                    responseObject.data.push(resp.data.items[i]);
                }
            });
            return responseObject;
        };
        DriveService.prototype.permissionsInsert = function (permission, params) {
            var _this = this;
            if (!params || !params.fileId) {
                var s = "[D1141] Missing params.fileId";
                return this.self.reject(s);
            }
            if (!permission || !permission.type || !permission.role) {
                var s = "[D1145] Missing role or type";
                return this.self.reject(s);
            }
            var configObject = {
                method: 'POST',
                url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(":id", ""),
                data: permission
            };
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.permissionsDelete = function (params) {
            if (!params || !params.fileId) {
                var s = "[D1177] Missing fileId";
                return this.self.reject(s);
            }
            if (!params || !params.permissionId) {
                var s = "[D1181] Missing permissionId";
                return this.self.reject(s);
            }
            var co = {
                method: 'delete',
                url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(":id", params.permissionId),
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
            });
            return responseObject;
        };
        DriveService.prototype.permissionsUpdate = function (permission, params) {
            var _this = this;
            var id;
            if (params && params.permissionId) {
                id = params.permissionId;
            }
            else {
                if (permission.id) {
                    id = permission.id;
                }
                else {
                    var s = "[D1214] Missing permissionId";
                    return this.self.reject(s);
                }
            }
            var configObject;
            configObject = { method: 'PUT', url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(':id', id), data: permission };
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: promise,
                data: {},
                params: params,
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.permissionsPatch = function (permission, params) {
            var _this = this;
            var id;
            if (params && params.permissionId) {
                id = params.permissionId;
            }
            else {
                if (permission.id) {
                    id = permission.id;
                }
                else {
                    var s = "[D1254] Missing permissionId";
                    return this.self.reject(s);
                }
            }
            var configObject;
            configObject = { method: 'PATCH', url: this.self.permissionsUrl.replace(':fid', params.fileId).replace(':id', id), data: permission };
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: promise,
                data: {},
                params: params,
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.permissionsGetIdForEmail = function (email) {
            var _this = this;
            var id;
            var configObject;
            configObject = { method: 'GET', url: this.self.permissionIdsUrl.replace(':id', email) };
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.revisionsGet = function (params) {
            var _this = this;
            if (!params || !params.fileId) {
                var s = "[D1310] Missing params.fileId";
                return this.self.reject(s);
            }
            if (!params.revisionId) {
                var s = "[D1314] Missing revisionId";
                return this.self.reject(s);
            }
            var co = {
                method: 'GET',
                url: this.self.revisionsUrl.replace(':fid', params.fileId).replace(":id", params.revisionId),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.revisionsList = function (params) {
            if (params && params.fields && params.fields.indexOf('nextPageToken') == -1) {
                this.self.$log.warn('[D1355] You have tried to list revisions with specific fields, but forgotten to include "nextPageToken" which will crop your results to just one page.');
            }
            var co = {
                method: 'GET',
                url: this.self.revisionsUrl.replace(':fid', params.fileId).replace(":id", ""),
                params: params
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: [],
                headers: undefined
            };
            promise.then(function (resp) {
                if (!!resp.data && !!resp.data.items) {
                    var l = resp.data.items.length;
                    for (var i = 0; i < l; i++) {
                        responseObject.data.push(resp.data.items[i]);
                    }
                }
            }, undefined, function (resp) {
                var l = resp.data.items.length;
                for (var i = 0; i < l; i++) {
                    responseObject.data.push(resp.data.items[i]);
                }
            });
            return responseObject;
        };
        DriveService.prototype.revisionsDelete = function (params) {
            if (!params || !params.fileId) {
                var s = "[D1393] Missing fileId";
                return this.self.reject(s);
            }
            if (!params || !params.revisionId) {
                var s = "[D1397] Missing revisionId";
                return this.self.reject(s);
            }
            var co = {
                method: 'delete',
                url: this.self.revisionsUrl.replace(':fid', params.fileId).replace(":id", params.revisionId),
            };
            var promise = this.self.HttpService.doHttp(co);
            var responseObject = {
                promise: promise,
                data: {},
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
            });
            return responseObject;
        };
        DriveService.prototype.revisionsUpdate = function (revision, params) {
            var _this = this;
            var id;
            if (params && params.revisionId) {
                id = params.revisionId;
            }
            else {
                if (revision.id) {
                    id = revision.id;
                }
                else {
                    var s = "[D1435] Missing revisionId";
                    return this.self.reject(s);
                }
            }
            var configObject;
            configObject = { method: 'PUT', url: this.self.revisionsUrl.replace(':fid', params.fileId).replace(':id', id), data: revision };
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: promise,
                data: {},
                params: params,
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.revisionsPatch = function (revision, params) {
            var _this = this;
            var id;
            if (params && params.revisionId) {
                id = params.revisionId;
            }
            else {
                if (revision.id) {
                    id = revision.id;
                }
                else {
                    var s = "[D1475] Missing revisionId";
                    return this.self.reject(s);
                }
            }
            var configObject;
            configObject = { method: 'PATCH', url: this.self.revisionsUrl.replace(':fid', params.fileId).replace(':id', id), data: revision };
            var promise = this.self.HttpService.doHttp(configObject);
            var responseObject = {
                promise: promise,
                data: {},
                params: params,
                headers: undefined
            };
            promise.then(function (resp) {
                responseObject.headers = resp.headers;
                _this.self.transcribeProperties(resp.data, responseObject);
                _this.self.lastFile = resp.data;
            });
            return responseObject;
        };
        DriveService.prototype.reject = function (reason) {
            this.self.$log.error('NgGapi: ' + reason);
            var def = this.self.$q.defer();
            def.reject(reason);
            return { data: undefined, promise: def.promise, headers: undefined };
        };
        DriveService.prototype.buildUploadConfigObject = function (file, params, content, contentHeaders, isInsert) {
            if ((params.uploadType == 'multipart' || params.uploadType == 'media' || params.uploadType == 'resumable')
                && (isInsert && (!file || !file.mimeType))) {
                throw ("[D148] file metadata is missing mandatory mime type");
            }
            var otherHeaders = "";
            if (contentHeaders) {
                if (typeof contentHeaders === 'string') {
                    otherHeaders += 'Content-Transfer-Encoding: ' + contentHeaders + '\r\n';
                }
                else {
                    for (var key in contentHeaders) {
                        otherHeaders += key + ': ' + contentHeaders[key] + '\r\n';
                    }
                }
            }
            var body;
            if (params.uploadType == 'multipart') {
                var boundary = '-------3141592ff65358979323846';
                var delimiter = "\r\n--" + boundary + "\r\n";
                var mimeHeader = '';
                if (isInsert) {
                    mimeHeader = 'Content-Type: ' + file.mimeType + '\r\n';
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
                var headers = {};
                headers['Content-Type'] = 'multipart/mixed; boundary="-------3141592ff65358979323846"';
            }
            if (params.uploadType == 'media') {
                body = content;
                var headers = {};
                if (isInsert) {
                    headers['Content-Type'] = file.mimeType;
                }
            }
            if (params.uploadType == 'resumable') {
                var headers = {};
                body = file;
                if (isInsert) {
                    headers['X-Upload-Content-Type'] = file.mimeType;
                }
            }
            return { method: undefined, url: undefined, params: params, data: body, headers: headers };
        };
        DriveService.prototype.transcribeProperties = function (src, dest) {
            if (!dest.data) {
                dest.data = {};
            }
            if (typeof src == "object") {
                Object.keys(src).map(function (key) {
                    dest.data[key] = src[key];
                });
            }
            else {
                dest = src;
            }
        };
        DriveService.$inject = ['$log', '$timeout', '$q', 'HttpService'];
        return DriveService;
    })();
    NgGapi.DriveService = DriveService;
})(NgGapi || (NgGapi = {}));
angular.module('ngm.NgGapi')
    .service('DriveService', NgGapi.DriveService);
