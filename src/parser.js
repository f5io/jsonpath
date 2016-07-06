import { map } from './utils';

export default parser;

function parser(tokens) {
  const ops = tokens.reduce((...args) => {
    const [ , { parse, type } ] = args;
    try {
      return parse(...args);
    } catch(e) {
      throw new Error(`Unknown token type: ${type}`);
    }
  }, []);
  return ops;
};