// Metrics harness for sample runs.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import sharp from "sharp";
import { removeBackground } from "../src/removeBg";

type MetricResult = {
  filename: string;
  inputSizeKb: number;
  outputSizeKb: number;
  removeBgMs: number;
  flipMs: number;
  transparentPixelRatio: number;
};

// Resolve workspace paths for samples and output.
const projectRoot = path.resolve(__dirname, "..", "..");
const samplesDir = path.join(projectRoot, "samples");
const metricsDir = path.join(projectRoot, "backend", "metrics");
const outputDir = path.join(metricsDir, "output");

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

const createGeneratedSamples = async (): Promise<void> => {
  ensureDir(samplesDir);

  const variants = [
    {
      name: "sample-product.png",
      svg: `<svg width="900" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="900" height="600" fill="#f2f4f8"/>
        <rect x="160" y="120" width="580" height="360" rx="32" fill="#1f2937"/>
        <rect x="210" y="170" width="480" height="260" rx="24" fill="#fbbf24"/>
        <text x="450" y="330" font-size="54" text-anchor="middle" fill="#111827" font-family="Arial">Sample Product</text>
      </svg>`,
    },
    {
      name: "sample-portrait.png",
      svg: `<svg width="900" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="900" height="600" fill="#fef3c7"/>
        <circle cx="450" cy="250" r="140" fill="#0f172a"/>
        <circle cx="400" cy="220" r="16" fill="#f8fafc"/>
        <circle cx="500" cy="220" r="16" fill="#f8fafc"/>
        <rect x="380" y="320" width="140" height="24" rx="12" fill="#f8fafc"/>
        <rect x="320" y="380" width="260" height="150" rx="40" fill="#1e293b"/>
      </svg>`,
    },
    {
      name: "sample-indoor.png",
      svg: `<svg width="900" height="600" xmlns="http://www.w3.org/2000/svg">
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c7d2fe"/>
          <stop offset="100%" stop-color="#e0f2fe"/>
        </linearGradient>
        <rect width="900" height="600" fill="url(#g)"/>
        <rect x="140" y="120" width="620" height="360" rx="28" fill="#334155"/>
        <rect x="190" y="170" width="220" height="260" rx="18" fill="#f8fafc"/>
        <rect x="460" y="170" width="250" height="150" rx="18" fill="#e2e8f0"/>
        <rect x="460" y="340" width="250" height="90" rx="18" fill="#94a3b8"/>
      </svg>`,
    },
  ];

  for (const variant of variants) {
    const outputPath = path.join(samplesDir, variant.name);
    await sharp(Buffer.from(variant.svg)).png().toFile(outputPath);
  }
};

const listSampleImages = (): string[] => {
  if (!fs.existsSync(samplesDir)) {
    return [];
  }
  return fs
    .readdirSync(samplesDir)
    .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
    .map((file) => path.join(samplesDir, file));
};

const formatKb = (bytes: number) => Number((bytes / 1024).toFixed(1));

const calculateTransparencyRatio = async (buffer: Buffer): Promise<number> => {
  // Downsample for a fast, stable transparency estimate.
  const { data, info } = await sharp(buffer)
    .resize({ width: 512, height: 512, fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let transparentCount = 0;
  const totalPixels = info.width * info.height;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) {
      transparentCount += 1;
    }
  }

  return Number((transparentCount / totalPixels).toFixed(4));
};

const toMarkdown = (results: MetricResult[]): string => {
  // Write a human-friendly summary table.
  const header =
    "| File | Input (KB) | Output (KB) | remove.bg (ms) | Flip (ms) | Transparent % |\n" +
    "| --- | --- | --- | --- | --- | --- |\n";

  const rows = results
    .map((result) => {
      const percentage = `${(result.transparentPixelRatio * 100).toFixed(1)}%`;
      return `| ${result.filename} | ${result.inputSizeKb} | ${result.outputSizeKb} | ${result.removeBgMs} | ${result.flipMs} | ${percentage} |`;
    })
    .join("\n");

  return `${header}${rows}\n`;
};

const run = async () => {
  if (!process.env.REMOVE_BG_API_KEY) {
    console.error("Missing REMOVE_BG_API_KEY. Set it in backend/.env before running.");
    process.exit(1);
  }

  let sampleImages = listSampleImages();
  if (sampleImages.length === 0 && process.env.GENERATE_SAMPLE_IMAGES === "1") {
    await createGeneratedSamples();
    sampleImages = listSampleImages();
  }
  if (sampleImages.length === 0) {
    console.error("No sample images found in /samples. Add a few images and retry.");
    process.exit(1);
  }

  ensureDir(metricsDir);
  ensureDir(outputDir);

  const results: MetricResult[] = [];

  for (const filePath of sampleImages) {
    const filename = path.basename(filePath);
    const inputBuffer = fs.readFileSync(filePath);

    const removeStart = performance.now();
    const removedBuffer = await removeBackground(inputBuffer, filename);
    const removeEnd = performance.now();

    const flipStart = performance.now();
    const flippedBuffer = await sharp(removedBuffer).flop().png().toBuffer();
    const flipEnd = performance.now();

    const transparency = await calculateTransparencyRatio(flippedBuffer);

    const outputPath = path.join(outputDir, filename.replace(/\.[^.]+$/, ".png"));
    fs.writeFileSync(outputPath, flippedBuffer);

    results.push({
      filename,
      inputSizeKb: formatKb(inputBuffer.length),
      outputSizeKb: formatKb(flippedBuffer.length),
      removeBgMs: Math.round(removeEnd - removeStart),
      flipMs: Math.round(flipEnd - flipStart),
      transparentPixelRatio: transparency,
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    count: results.length,
    results,
  };

  fs.writeFileSync(
    path.join(metricsDir, "results.json"),
    JSON.stringify(output, null, 2)
  );
  fs.writeFileSync(path.join(metricsDir, "results.md"), toMarkdown(results));

  console.log(`Metrics complete. Wrote ${results.length} results to backend/metrics.`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
