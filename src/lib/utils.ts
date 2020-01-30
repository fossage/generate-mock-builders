import { isString, isArray } from 'lodash';
import { GenericObject } from './types';

function camelize(sections: (string | number)[]) {
  return String(
    sections.filter(Boolean).reduce((agg, next, i) => {
      next = String(next);
      return (
        agg +
        (!i ? next[0].toLowerCase() : next[0].toUpperCase()) +
        next.slice(1)
      );
    }, '')
  );
}

function generateWhitespace(num: number) {
  return new Array(num).fill(' ').join('');
}

function stringifyPrimitive(primitive: number | null | boolean | string) {
  return isString(primitive)
    ? // escape any single quotes
      `\'${primitive.replace(/(?<!\\)'/g, "\\'")}\'`
    : String(primitive);
}

function getBracesFromStructuredData(data: GenericObject | []) {
  if (isArray(data)) return ['[', ']'];
  return ['{', '}'];
}

function getStructuredDataLength(data: GenericObject | []) {
  if (isArray(data)) return data.length;
  return Object.keys(data).length;
}

function getValidKey(key: string | number) {
  try {
    const tester = {};
    tester[key] = true;
    eval('tester.' + key);
    return key;
  } catch (e) {
    return `"${key}"`;
  }
}

function isStartOrEndOfStructuredData(line: string) {
  const openingBraces = /(?:\{|\[)$/;
  const closingBraces = /^\s*(?:\}|\])/;
  return openingBraces.test(line) || closingBraces.test(line);
}

export {
  camelize,
  getValidKey,
  generateWhitespace,
  stringifyPrimitive,
  getBracesFromStructuredData,
  isStartOrEndOfStructuredData,
  getStructuredDataLength,
};
