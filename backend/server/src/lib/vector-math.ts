export function add(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]!);
}

export function scale(v: number[], s: number): number[] {
  return v.map((x) => x * s);
}

export function zeros(length: number): number[] {
  return new Array(length).fill(0);
}

// z(qk, qinit) = softmax over cosine similarity scores.
export function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((acc, v) => acc + v, 0);
  return exps.map((v) => v / sum);
}
