export interface MatchResult {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export async function findSymbols(
  imageSource: HTMLCanvasElement | HTMLImageElement,
  templateBox: { x: number; y: number; width: number; height: number },
  threshold: number = 0.75
): Promise<MatchResult[]> {
  const cv = (window as any).cv;
  if (!cv) throw new Error("OpenCV is not loaded yet.");

  const sourceWidth = 'width' in imageSource && typeof imageSource.width === 'number' ? imageSource.width : (imageSource as any).naturalWidth;
  const sourceHeight = 'height' in imageSource && typeof imageSource.height === 'number' ? imageSource.height : (imageSource as any).naturalHeight;

  // Ensure box is within canvas bounds
  const x = Math.max(0, Math.floor(templateBox.x));
  const y = Math.max(0, Math.floor(templateBox.y));
  const width = Math.min(sourceWidth - x, Math.floor(templateBox.width));
  const height = Math.min(sourceHeight - y, Math.floor(templateBox.height));

  if (width <= 0 || height <= 0) return [];

  const src = cv.imread(imageSource);
  let template = new cv.Mat();
  const result = new cv.Mat();

  try {
    // Crop the template from the source
    const rect = new cv.Rect(x, y, width, height);
    template = src.roi(rect);

    // Convert to grayscale for better matching
    const srcGray = new cv.Mat();
    const templateGray = new cv.Mat();
    cv.cvtColor(src, srcGray, cv.COLOR_RGBA2GRAY, 0);
    cv.cvtColor(template, templateGray, cv.COLOR_RGBA2GRAY, 0);

    // Perform template matching
    cv.matchTemplate(srcGray, templateGray, result, cv.TM_CCOEFF_NORMED);

    // Find all matches above threshold using local maxima detection (NMS)
    const matches: MatchResult[] = [];
    const resultData = result.data32F;
    const cols = result.cols;

    for (let i = 0; i < result.rows; i++) {
      for (let j = 0; j < result.cols; j++) {
        const confidence = resultData[i * cols + j];
        if (confidence >= threshold) {
          matches.push({
            x: j,
            y: i,
            width: width,
            height: height,
            confidence: confidence,
          });
        }
      }
    }

    // Non-Maximum Suppression (NMS)
    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    const finalMatches: MatchResult[] = [];
    const iouThreshold = 0.3; // If overlap > 30%, it's the same object

    for (const match of matches) {
      let isDuplicate = false;
      for (const finalMatch of finalMatches) {
        // Calculate Intersection over Union (IoU)
        const x1 = Math.max(match.x, finalMatch.x);
        const y1 = Math.max(match.y, finalMatch.y);
        const x2 = Math.min(match.x + match.width, finalMatch.x + finalMatch.width);
        const y2 = Math.min(match.y + match.height, finalMatch.y + finalMatch.height);

        const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const area1 = match.width * match.height;
        const area2 = finalMatch.width * finalMatch.height;
        const union = area1 + area2 - intersection;

        if (intersection / union > iouThreshold) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        finalMatches.push(match);
      }
    }

    srcGray.delete();
    templateGray.delete();

    return finalMatches;
  } finally {
    src.delete();
    template.delete();
    result.delete();
  }
}
