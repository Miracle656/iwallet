declare module 'snarkjs' {
  export type Groth16Proof = {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  export const groth16: {
    fullProve(
      input: Record<string, string | string[]>,
      wasmPath: string,
      zkeyPath: string,
    ): Promise<{ proof: Groth16Proof; publicSignals: string[] }>;
  };
}
