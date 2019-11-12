import { isString, isNumber, isObject, isArray, isBoolean } from 'lodash';
import { generateWhitespace } from './utils';

function parseFlowTypes(data: any, spaces = 2) {
  let flowDef = '';
  const keySpaceString = generateWhitespace(spaces);

  if (isArray(data)) {
    flowDef += `[]${parseFlowTypes(data[0], spaces)}`;
  } else if (isObject(data)) {
    flowDef += `{\n`;
    const keys = Object.keys(data);

    for (const key of keys) {
      flowDef += `${keySpaceString}${key}: `;
      const val = data[key];
      flowDef += parseFlowTypes(val, spaces + 2);
    }

    const closingSpaces = generateWhitespace(spaces - 2);
    flowDef += `${closingSpaces}}${!!closingSpaces.length ? ',\n' : ''}`;
  } else {
    flowDef += _handlePrimitives(data);
  }

  return flowDef;
}

function _handlePrimitives(val: string | number | boolean | null) {
  if (isString(val)) {
    return `?string,\n`;
  } else if (isNumber(val)) {
    return `?number,\n`;
  } else if (isBoolean(val)) {
    return `?boolean,\n`;
  } else {
    return 'null\n';
  }
}

export { parseFlowTypes };
