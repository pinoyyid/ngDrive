angular.module('ngm.ngDrive', []);
/// <reference path="../ngdrive_ts_declaration_files/drive_interfaces.d.ts"/>
'use strict';
var ngDrive;
(function (ngDrive) {
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
            this.self.$log.error('ngDrive: ' + reason);
            var def = this.self.$q.defer();
            def.reject(reason);
            return { data: undefined, promise: def.promise, headers: undefined };
        };
        DriveService.prototype.buildUploadConfigObject = function (file, params, content, contentHeaders, isInsert) {
            //// check the media is base64 encoded
            //if (base64EncodedContent.match(/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/) == null) {
            //	throw ("[D142] content does not appear to be base64 encoded.");
            //}
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
    ngDrive.DriveService = DriveService;
})(ngDrive || (ngDrive = {}));
angular.module('ngm.ngDrive')
    .service('DriveService', ngDrive.DriveService);
/// <reference path="../ngdrive_ts_declaration_files/angular_cropped.d.ts"/>
'use strict';
var ngDrive;
(function (ngDrive) {
    var HttpService = (function () {
        function HttpService($log, $http, $timeout, $interval, $q, OauthService) {
            this.$log = $log;
            this.$http = $http;
            this.$timeout = $timeout;
            this.$interval = $interval;
            this.$q = $q;
            this.OauthService = OauthService;
            this.sig = 'HttpService';
            this.RETRY_COUNT = 10;
            this.INTERVAL_NORMAL = 10;
            this.INTERVAL_THROTTLE = 500;
            this.INTERVAL_MAX = 1500;
            this.isQueueMode = false;
            this.queue = [];
            this.testStatus = 'foo';
            this.skipOauthCozTesting = false;
            this.def401 = $q.defer();
        }
        HttpService.prototype.getOauthService = function () {
            return this.OauthService;
        };
        HttpService.prototype.get$http = function () {
            return this.$http;
        };
        HttpService.prototype.doHttp = function (configObject) {
            var def = this.$q.defer();
            if (this.isQueueMode) {
                this.add2q(configObject, def, this.RETRY_COUNT);
            }
            else {
                this._doHttp(configObject, def, this.RETRY_COUNT);
            }
            return def.promise;
        };
        HttpService.prototype.add2q = function (configObject, def, retryCounter) {
            var _this = this;
            this.queue.push({ c: configObject, d: def, r: retryCounter });
            if (!this.queuePromise) {
                this.queuePromise = this.$interval(function () {
                    _this.dq();
                }, this.queueInterval);
            }
        };
        HttpService.prototype.throttleDown = function () {
            var _this = this;
            if (this.queueInterval == this.INTERVAL_NORMAL) {
                this.queueInterval = this.INTERVAL_THROTTLE;
            }
            if (this.queuePromise) {
                this.$interval.cancel(this.queuePromise);
            }
            this.queueInterval = this.INTERVAL_MAX;
            this.queuePromise = this.$interval(function () {
                _this.dq();
            }, this.queueInterval);
        };
        HttpService.prototype.throttleUp = function () {
            var _this = this;
            if (this.queueInterval == this.INTERVAL_NORMAL) {
                return;
            }
            if (this.queuePromise) {
                this.$interval.cancel(this.queuePromise);
            }
            this.queueInterval = this.queueInterval * 0.8;
            if (this.queueInterval < this.INTERVAL_NORMAL) {
                this.queueInterval = this.INTERVAL_NORMAL;
            }
            this.queuePromise = this.$interval(function () {
                _this.dq();
            }, this.queueInterval);
        };
        HttpService.prototype.dq = function () {
            if (this.queue.length == 0) {
                this.queueInterval = this.INTERVAL_NORMAL;
                this.$interval.cancel(this.queuePromise);
                this.queuePromise = undefined;
                return;
            }
            var obj = this.queue[0];
            this.queue.splice(0, 1);
            this._doHttp(obj.c, obj.d, obj.r);
        };
        HttpService.prototype._doHttp = function (configObject, def, retryCounter) {
            var _this = this;
            if (!configObject.headers) {
                configObject.headers = {};
            }
            if (this.skipOauthCozTesting) {
                this.do$http({ access_token: 'unit test access token' }, configObject, def, retryCounter);
            }
            else {
                this.OauthService.getAccessToken().then(function (token) {
                    _this.do$http(token, configObject, def, retryCounter);
                    return;
                }, function (error) {
                    def.reject('401 no access token ' + error);
                });
            }
        };
        HttpService.prototype.do$http = function (token, configObject, def, retryCounter) {
            var _this = this;
            configObject.headers['Authorization'] = 'Bearer ' + token.access_token;
            var httpPromise = this.$http(configObject);
            httpPromise.then(function (resp) {
                _this.throttleUp();
                if (resp.data && resp.data.nextPageToken) {
                    def.notify({
                        data: resp.data,
                        configObject: configObject,
                        headers: resp.headers,
                        status: resp.status,
                        statusText: resp.statusText
                    });
                    if (!configObject.params) {
                        configObject.params = {};
                    }
                    configObject.params.pageToken = resp.data.nextPageToken;
                    return _this._doHttp(configObject, def, retryCounter);
                }
                def.resolve({
                    data: resp.data,
                    configObject: configObject,
                    headers: resp.headers,
                    status: resp.status,
                    statusText: resp.statusText
                });
            });
            httpPromise.catch(function (resp) {
                if (resp.status > 299 && resp.status < 310) {
                    def.resolve({
                        data: resp.data,
                        configObject: configObject,
                        headers: resp.headers,
                        status: resp.status,
                        statusText: resp.statusText
                    });
                }
                else {
                    _this.errorHandler(resp.data, resp.status, resp.headers, resp.config, resp.statusText, def, retryCounter);
                }
            });
        };
        HttpService.prototype.errorHandler = function (data, status, headers, configObject, statusText, def, retryCounter) {
            var _this = this;
            if (!data || data == null) {
                data = { error: { message: '[H242] null response. Possible network failure.' } };
            }
            if (status == 404) {
                def.reject(status + " " + data.error.message);
                return;
            }
            if (status == 401) {
                this.$log.warn("[H116] Need to acquire a new Access Token and resubmit");
                this.OauthService.refreshAccessToken(this.def401).then(function () {
                    console.log('401 resolved so repeat');
                    _this._doHttp(configObject, def, retryCounter);
                }, function (err) {
                    def.reject(err);
                });
                return;
            }
            if (status == 501) {
                if (--retryCounter > 0) {
                    this.sleep(1000).then(function () {
                        _this._doHttp(configObject, def, retryCounter);
                    });
                }
                else {
                    def.reject(status + ' ' + data.error.message);
                }
                return;
            }
            if (status == 403 && data.error.message.toLowerCase().indexOf('rate limit') > -1) {
                this.$log.warn('[H153] 403 rate limit. requeuing retryConter = ' + retryCounter);
                this.throttleDown();
                this.add2q(configObject, def, retryCounter);
                return;
            }
            def.reject(status + " " + data.error.message);
        };
        HttpService.prototype.sleep = function (ms) {
            var def = this.$q.defer();
            this.$timeout(function () {
                def.resolve(0);
            }, ms);
            return def.promise;
        };
        HttpService.$inject = ['$log', '$http', '$timeout', '$interval', '$q', 'OauthService'];
        return HttpService;
    })();
    ngDrive.HttpService = HttpService;
})(ngDrive || (ngDrive = {}));
angular.module('ngm.ngDrive')
    .service('HttpService', ngDrive.HttpService);
/// <reference path="../ngdrive_ts_declaration_files/drive_interfaces.d.ts"/>
'use strict';
var ngDrive;
(function (ngDrive) {
    (function (TokenRefreshPolicy) {
        TokenRefreshPolicy[TokenRefreshPolicy["ON_DEMAND"] = 0] = "ON_DEMAND";
        TokenRefreshPolicy[TokenRefreshPolicy["PRIOR_TO_EXPIRY"] = 1] = "PRIOR_TO_EXPIRY";
    })(ngDrive.TokenRefreshPolicy || (ngDrive.TokenRefreshPolicy = {}));
    var TokenRefreshPolicy = ngDrive.TokenRefreshPolicy;
    var OauthService = (function () {
        function OauthService(scopes, clientId, tokenRefreshPolicy, immediateMode, ownGetAccessTokenFunction, testingRefreshToken, testingAccessToken, testingClientSecret, popupBlockedFunction, $log, $window, $http, $timeout, $q) {
            //console.log("OAuth instantiated with " + scopes);
            //$log.log("scopes", this.scopes);
            //$log.log("trp", this.tokenRefreshPolicy);drivdrivee
            //console.log('oauth cons');
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
                this.$log.info('[O97] Warning: getAccesToken called without a deferred. This is possibly a mistake if called from your own code as it means multiple overlapping calls won\'t resolve');
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
    ngDrive.OauthService = OauthService;
})(ngDrive || (ngDrive = {}));
ngDrive['Config'] = function () {
    var scopes;
    var clientID;
    var tokenRefreshPolicy = ngDrive.TokenRefreshPolicy.ON_DEMAND;
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
            return new ngDrive.OauthService(scopes, clientID, tokenRefreshPolicy, immediateMode, getAccessTokenFunction, testingRefreshToken, testingAccessToken, testingClientSecret, popupBlockedFunction, $log, $window, $http, $timeout, $q);
        }
    };
};
//# sourceMappingURL=module.js.map