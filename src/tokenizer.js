import { getMatch } from './rules';

export default tokenizer;

function tokenizer(input, output = []) {
  if (input.length === 0) return output;

  try {
    const { type, length, value, parse } = getMatch(input);
    output.push({ type, value, parse });
    return tokenizer(input.slice(length), output);
  } catch(e) {
    console.error(e);
    throw new Error('Found no matching rule.');
  }
};