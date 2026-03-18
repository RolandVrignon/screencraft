// @ts-expect-error gifsicle-wasm-browser is UMD, no types
import gifsicle from 'gifsicle-wasm-browser';

export interface OptimizeOptions {
  /** Lossy compression level (0 = lossless, 40 = good, 200 = max) */
  lossy: number;
  /** Optimization level: 2 or 3 (3 = slowest but smallest) */
  optimizeLevel: 2 | 3;
  /** Color palette size (32-256). Lower = smaller file */
  colors: number;
}

const defaultOptions: OptimizeOptions = {
  lossy: 40,
  optimizeLevel: 3,
  colors: 256,
};

export async function optimizeGif(
  inputBlob: Blob,
  options: Partial<OptimizeOptions> = {}
): Promise<Blob> {
  const opts = { ...defaultOptions, ...options };

  const inputBuffer = await inputBlob.arrayBuffer();

  // Build gifsicle command as a single string
  let cmd = `-O${opts.optimizeLevel} --lossy=${opts.lossy}`;
  if (opts.colors > 0 && opts.colors < 256) {
    cmd += ` --colors=${opts.colors}`;
  }
  cmd += ' in.gif -o /out/optimized.gif';

  try {
    const result = await gifsicle.run({
      input: [{ file: inputBuffer, name: 'in.gif' }],
      command: [cmd],
    });

    if (result && result.length > 0) {
      // result[0] is a File-like object with .file (Uint8Array) and .name
      const outputData = result[0].file || result[0];
      return new Blob([outputData], { type: 'image/gif' });
    }
  } catch (err) {
    console.warn('GIF optimization failed, returning original:', err);
  }

  return inputBlob;
}
