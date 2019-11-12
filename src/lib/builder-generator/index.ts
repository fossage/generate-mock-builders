/*======================================================
                     IMPORTS / SET UP
======================================================*/
import pluralize from 'pluralize';
import { isObject, isArray, each } from 'lodash';

import {
  camelize,
  getValidKey,
  generateWhitespace,
  stringifyPrimitive,
  getBracesFromStructuredData,
  isStartOrEndOfStructuredData,
} from '../utils';

import { GenericObject } from '../types';

type DataCollectionValue = string | number | null | GenericObject | [];

// aliasing isObject to avoid confusion about the fact
// that both isObject({}) === true and isObject([]) === true
const isStructuredData = isObject;

/*======================================================
                    CLASS DEFINITION
======================================================*/
export default class BuilderGenerator {
  builders: GenericObject = {};

  constructor(seedData: GenericObject) {
    this._generateBuilders(seedData);
  }

  _generateBuilders(
    dataCollection: GenericObject | any[],
    keyPrefix = '',
    spaces = 2,
    rootCollection = null
  ) {
    let output = '';
    const indent = generateWhitespace(spaces);
    const collectionIsArray = isArray(dataCollection);
    const [openingBrace, closingBrace] = getBracesFromStructuredData(
      dataCollection
    );

    output += openingBrace;

    each(dataCollection, (val: DataCollectionValue, key: string | number) => {
      output += `\n${indent}`;
      output += !collectionIsArray ? `${getValidKey(key)}: ` : '';
      const rCollection = rootCollection || key;

      if (isStructuredData(val)) {
        const valIsArray = isArray(val);
        const braces = getBracesFromStructuredData(val);
        const resourceName = collectionIsArray
          ? keyPrefix
          : camelize([keyPrefix, key]);

        const builderName = camelize(['build', resourceName]);

        // We sort the object to make it easier to diff as we simply compare lines
        if (!valIsArray) val = this._sortObject(val);

        if (!this.builders[rCollection]) {
          this.builders[rCollection] = {};
        }

        const body = valIsArray
          ? this._generateBuilders(
              val,
              pluralize.singular(resourceName),
              4,
              rCollection
            )
          : this._generateBuilders(val, resourceName, 4, rCollection);

        const builderExisits = !!this.builders[rCollection][resourceName];

        const defaultBody = builderExisits
          ? this.builders[rCollection][resourceName].defaultBody
          : body;

        output += `${builderName}(${this._diff({
          braces,
          newBody: body,
          defaultBody,
          indent,
        })})`;

        if (!builderExisits) {
          this.builders[rCollection][resourceName] = {
            builderName,
            defaultVal: val,
            defaultBody: body,
            builderDef: this._getBuilderDef({
              body,
              valIsArray,
              builderName,
            }),
          };
        }
      } else {
        output += stringifyPrimitive(val);
      }

      output += ',';
    });

    output += `\n${closingBrace}`;
    return output;
  }

  _getBuilderDef({ valIsArray, builderName, body }) {
    return `function ${builderName}(${
      valIsArray ? 'overrides' : 'overrides = {}'
    }) {
  ${
    valIsArray
      ? `return overrides || ${body}`
      : `return Object.assign(${body}, overrides)`
  }
}`;
  }

  _sortObject(obj: GenericObject) {
    const primitiveVals = {};
    const structuredData = {};

    each(obj, (val, key) => {
      isStructuredData(val)
        ? (structuredData[key] = val)
        : (primitiveVals[key] = val);
    });

    // The reason we put primitive values first is because, during the diffing
    // phase these are the only things we want to compare. Its easy to skip comparison
    // on the lines where we see a deeper level of indentation so we put those lines
    // last to ensure we're comparing things correctly.
    return { ...primitiveVals, ...structuredData };
  }

  _diff({ newBody, defaultBody, braces, indent }) {
    if (newBody === defaultBody) return '';
    const [openingBrace, closingBrace] = braces;
    let out = openingBrace;

    // closing and opening brace will be added before and after loop so remove them from diffable lines
    const defaultLines = defaultBody.split('\n').slice(1, -1);
    const newBodyLines = newBody.split('\n').slice(1, -1);

    newBodyLines.forEach((newBodyLine: string, i: number) => {
      // If the indentation level is > 4, we know were comparing something
      // at a deeper level which has already been diffed, so just use it
      if (
        !/^\s{4}\w+/.test(newBodyLine) ||
        isStartOrEndOfStructuredData(newBodyLine) ||
        newBodyLine !== defaultLines[i]
      ) {
        out += `\n  ${newBodyLine}`;
      }
    });

    out += `\n${indent}${closingBrace}`;
    return out;
  }
}
