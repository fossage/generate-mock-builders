/*======================================================
                     IMPORTS / SET UP
======================================================*/
import requestPromise, { OptionsWithUrl } from 'request-promise';

interface Options extends OptionsWithUrl {
  url: string;
}

export interface ApiType {
  get: (o: Options) => Promise<any>;
  put: (o: Options) => Promise<any>;
  post: (o: Options) => Promise<any>;
  patch: (o: Options) => Promise<any>;
  delete: (o: Options) => Promise<any>;
  setApiRootPath: (p: string) => void;
}

/*======================================================
                     MODULE DEFINITION
======================================================*/
const Api = {
  _apiRootPath: '',

  setApiRootPath(rootPath: string) {
    Api._apiRootPath = rootPath;
  },

  get(options: Options) {
    options = {
      ...Api._defaultOptions(options),
      method: 'GET',
    };
    return requestPromise(options);
  },

  post(options: Options) {
    options = {
      ...Api._defaultOptions(options),
      method: 'POST',
    };
    return requestPromise(options);
  },

  put(options: Options) {
    options = {
      ...Api._defaultOptions(options),
      method: 'PUT',
    };
    return requestPromise(options);
  },

  patch(options: Options) {
    options = {
      ...Api._defaultOptions(options),
      method: 'PATCH',
    };
    return requestPromise(options);
  },

  delete(options: Options) {
    options = {
      ...Api._defaultOptions(options),
      method: 'DELETE',
    };
    return requestPromise(options);
  },

  _getUrl(urlSubset: string): string {
    return `${Api._apiRootPath}/${urlSubset}`;
  },

  _defaultOptions(options: Options) {
    return {
      jar: true,
      ...options,
      url: `${Api._getUrl(options.url)}`,
      json: true,
    };
  },
};

export default Api;
