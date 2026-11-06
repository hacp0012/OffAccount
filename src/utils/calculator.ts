interface ParsedValue {
  value: number;
  isPercentage: boolean;
}

export function evaluateCalculatorExpression(expression: string): number {
  let position = 0;
  const input = expression.replace(/,/g, '.').replace(/\s/g, '');

  const parseExpression = (): ParsedValue => {
    let result = parseTerm();

    while (input[position] === '+' || input[position] === '-') {
      const operator = input[position++];
      const right = parseTerm();
      const rightValue = right.isPercentage ? result.value * right.value / 100 : right.value;
      result = {
        value: operator === '+' ? result.value + rightValue : result.value - rightValue,
        isPercentage: false,
      };
    }

    return result;
  };

  const parseTerm = (): ParsedValue => {
    let result = parseUnary();

    while (input[position] === '*' || input[position] === '/') {
      const operator = input[position++];
      const right = parseUnary();
      const leftValue = result.isPercentage ? result.value / 100 : result.value;
      const rightValue = right.isPercentage ? right.value / 100 : right.value;
      if (operator === '/' && rightValue === 0) throw new Error('Division par zéro.');
      result = {
        value: operator === '*' ? leftValue * rightValue : leftValue / rightValue,
        isPercentage: false,
      };
    }

    return result;
  };

  const parseUnary = (): ParsedValue => {
    if (input[position] === '+' || input[position] === '-') {
      const sign = input[position++] === '-' ? -1 : 1;
      const value = parseUnary();
      return { ...value, value: sign * value.value };
    }
    return parsePrimary();
  };

  const parsePrimary = (): ParsedValue => {
    let result: ParsedValue;
    if (input[position] === '(') {
      position += 1;
      result = parseExpression();
      if (input[position] !== ')') throw new Error('Parenthèse fermante manquante.');
      position += 1;
    } else {
      const match = input.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) throw new Error('Expression invalide.');
      position += match[0].length;
      result = { value: Number(match[0]), isPercentage: false };
    }

    if (input[position] === '%') {
      position += 1;
      result = { ...result, isPercentage: true };
    }
    return result;
  };

  if (!input) throw new Error('Saisissez une expression.');
  const result = parseExpression();
  if (position !== input.length) throw new Error('Expression invalide.');
  const value = result.isPercentage ? result.value / 100 : result.value;
  if (!Number.isFinite(value)) throw new Error('Résultat non valide.');
  return value;
}
