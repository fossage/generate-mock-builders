import Api, { ApiType } from './api';
import { GenericObject } from '../types';

export interface OrchestratorConfig {
  apiRootPath: string;
  resources: Array<Resource[]>;
}

interface Selectors {
  [k: string]: (state: GenericObject) => any;
}

interface Resource {
  name: string;
  request: (
    a: ApiType,
    state: GenericObject,
    selectors: { [k: string]: () => any }
  ) => Promise<any>;
  selectors?: Selectors;
}

export default class RequestOrchestrator {
  _config: any;
  _state: any;
  _selectors: any;
  _customTemplates: any;
  _builders: any;
  _pendingBuilders: any;

  constructor(config: OrchestratorConfig) {
    this._config = config;
    this._state = {};
    this._selectors = {};
  }

  async run() {
    const config = this._config;
    Api.setApiRootPath(config.apiRootPath);
    if (config.beforeAll) await config.beforeAll(Api);

    for (const resourceGroup of config.resources) {
      resourceGroup.forEach(({ selectors }: Resource) => {
        if (!selectors) return;
        Object.keys(selectors).forEach(key => {
          Object.defineProperty(this._selectors, key, {
            get: () => selectors[key](this._state),
          });
        });
      });

      const responses = await Promise.all(
        resourceGroup.map(group =>
          group.request(Api, this._state, this._selectors)
        )
      );

      responses.forEach((response, i) => {
        const resourceConfig = resourceGroup[i];
        this._state[resourceConfig.name] = resourceConfig.transform
          ? resourceConfig.transform(response)
          : response;
      });
    }
  }
}
