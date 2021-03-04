/*======================================================
                     IMPORTS / SET UP
======================================================*/
import pluralize from 'pluralize';
import { isObject, isArray, each, upperFirst, camelCase } from 'lodash';

import {
  camelize,
  getValidKey,
  quicktypeJSON,
  generateWhitespace,
  stringifyPrimitive,
  getBracesFromStructuredData,
  isStartOrEndOfStructuredData,
} from '../utils';

import { GenericObject } from '../types';

type DataCollectionValue = string | number | null | GenericObject | [];

interface Options {
  includeTypes?: 'typescript' | 'flow';
}

// aliasing isObject to avoid confusion about the fact
// that both isObject({}) === true and isObject([]) === true
const isStructuredData = isObject;

/*======================================================
                    CLASS DEFINITION
======================================================*/
export default class BuilderGenerator {
  builders: GenericObject = {};
  _options: Options;

  constructor(seedData: GenericObject, options: Options = {}) {
    this._options = options;
    this._generateBuilders(seedData);
  }

  async getBuilders() {
    if (!this._options.includeTypes) {
      return this.builders;
    }

    const keys = Object.keys(this.builders);

    for (const key of keys) {
      const resource = this.builders[key];
      const resourceKeys = Object.keys(resource);
      const topLevelKey = resourceKeys[resourceKeys.length - 1];
      const topLevelBuilder = resource[topLevelKey];
      const body: GenericObject = topLevelBuilder.defaultVal;
      const result = await quicktypeJSON(
        this._options.includeTypes,
        topLevelKey,
        JSON.stringify(body)
      );

      const types = result.lines
        .join('\n')
        .split('// match the expected interface, even if the JSON is valid.')[1]
        .split('// Converts JSON strings to/from your types')[0];

      resource.__types = types;
    }

    return this.builders;
  }

  _generateBuilders(
    dataCollection: GenericObject | any[],
    keyPrefix = '',
    spaces = 2,
    rootCollection = null,
    parentKey: string | number = ''
  ) {
    let output = '';
    const indent = generateWhitespace(spaces);
    const collectionIsArray = isArray(dataCollection);
    const [openingBrace, closingBrace] = getBracesFromStructuredData(
      dataCollection
    );

    /**
     * ===== output =====
     * array: [
     *
     * object: {
     */
    output += openingBrace;

    each(dataCollection, (val: DataCollectionValue, key: string | number) => {
      /**
       * ===== output =====
       * array: [
       * ••
       *
       * object: {
       * ••
       */
      output += `\n${indent}`;

      /**
       * ===== output =====
       * array: [
       * ••
       *
       * object: {
       * ••key:
       */
      output += !collectionIsArray ? `${getValidKey(key)}: ` : '';
      const topLevelCollection = rootCollection || key;

      if (isStructuredData(val)) {
        const valIsArray = isArray(val);
        const braces = getBracesFromStructuredData(val);
        const resourceName = collectionIsArray
          ? keyPrefix
          : camelize([keyPrefix, key]);

        const builderName = camelize(['build', resourceName]);

        // We sort the object to make it easier to diff as we simply compare lines
        if (!valIsArray) val = this._sortObject(val);

        if (!this.builders[topLevelCollection]) {
          this.builders[topLevelCollection] = {};
        }

        const body = (() => {
          if (valIsArray) {
            const entryName = pluralize.isPlural(resourceName)
              ? pluralize.singular(resourceName)
              : `${resourceName}Entry`;

            return this._generateBuilders(
              val,
              entryName,
              4,
              topLevelCollection,
              key
            );
          } else {
            return this._generateBuilders(
              val,
              resourceName,
              4,
              topLevelCollection,
              key
            );
          }
        })();

        const builderExisits = !!this.builders[topLevelCollection][
          resourceName
        ];

        const defaultBody = builderExisits
          ? this.builders[topLevelCollection][resourceName].defaultBody
          : body;

        // These will be used as args to a builder function in the case of an object,
        // but will simply be assigned directly to the key in the case of an array
        /**
         * ===== builderArgs =====
         * array: [
         * ••buildThing(),
         * ••buildThing({override: 'foo'}),
         * ]
         *
         * object: {override: 'foo'}
         */
        const builderArgs = this._diff({
          braces,
          newBody: body,
          defaultBody,
          indent,
        });

        if (valIsArray) {
          // builderArgs will be empty if it is the first item in the array since
          // that is what we base our default body off of. In this case, just use the
          // default body.

          /**
           * ===== output =====
           * array: [
           * ••[
           * ••••buildThing(),
           * ••••buildThing({
           * ••••••override: 'foo'
           * ••••}),
           * ••]
           *
           * object: {
           * ••key: [
           * ••••buildThing(),
           * ••••buildThing({
           * ••••••override: 'foo'
           * ••••}),
           * ••]
           */
          output += builderArgs || defaultBody;
        } else {
          /**
           * ===== output =====
           * object: {
           * ••key: buildThing()
           *
           * array: [
           * ••buildeThing()
           */
          output += `${builderName}(${builderArgs})`;
        }

        if (!builderExisits) {
          this.builders[topLevelCollection][resourceName] = {
            builderName,
            defaultVal: val,
            defaultBody: body,
            builderDef: this._getBuilderDef({
              body,
              valIsArray,
              builderName,
              typeName: this._getTypeName({
                collectionIsArray,
                itemKey: key,
                parentKey,
              }),
            }),
          };
        }
      } else {
        /**
         * ===== output =====
         * array: [
         * ••'foo'
         *
         * object: {
         * ••key:•'foo'
         */
        output += stringifyPrimitive(val);
      }

      /**
       * ===== output =====
       * object: {
       * ••key: buildThing(),
       *
       * array: [
       * ••buildeThing(),
       */
      output += ',';
    });

    /**
     * ===== output =====
     * object: {
     * ••key: buildThing(),
     * ••otherKey: buildOtherThing(),
     * ••lastKey: 2,
     * }
     *
     * array: [
     * ••buildeThing(),
     * ••buildeThing({
     * ••••override: 'foo'
     * ••}),
     * ••buildeThing({
     * ••••override: 'bar'
     * ••}),
     * ]
     */
    output += `\n${closingBrace}`;
    return output;
  }

  _getTypeName({ collectionIsArray, itemKey, parentKey }) {
    // We do not include the entire path for the type name to(hopefully)
    // correctly sync the name with that returned by quicktype. For array items
    // we use the singularized version of the name of the parent array.
    return upperFirst(
      camelCase(
        String(
          collectionIsArray ? pluralize.singular(String(parentKey)) : itemKey
        )
      )
    );
  }

  _getBuilderDef({ valIsArray, builderName, body, typeName }) {
    const { includeTypes } = this._options;

    const typeArg = (() => {
      if (!includeTypes) return '';
      const utilName = includeTypes === 'typescript' ? 'Partial' : '$Shape';
      return `:${utilName}<${typeName}>`;
    })();

    const args = valIsArray ? '' : `overrides${typeArg} = {}`;

    return `function ${builderName}(${args}) {
  ${valIsArray ? `return ${body}` : `return Object.assign(${body}, overrides)`}
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
