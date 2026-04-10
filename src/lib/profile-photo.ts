const OUTPUT_SIZE = 960;

type DetectedFace = {
  boundingBox: DOMRectReadOnly;
};

type FaceDetectorConstructor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
  detect(image: CanvasImageSource): Promise<DetectedFace[]>;
};

type WindowWithFaceDetector = Window & {
  FaceDetector?: FaceDetectorConstructor;
};

export async function prepareProfilePhoto(file: File) {
  const image = await loadImageFromFile(file);
  const crop = await detectFaceCrop(image).catch(() => null);
  const safeCrop = crop ?? getFallbackCrop(image.naturalWidth, image.naturalHeight);
  return renderCroppedImage(image, safeCrop, file.type);
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image."));
    };
    image.src = objectUrl;
  });
}

async function detectFaceCrop(image: HTMLImageElement) {
  const FaceDetector = (window as WindowWithFaceDetector).FaceDetector;
  if (!FaceDetector) {
    return null;
  }

  const detector = new FaceDetector({
    fastMode: true,
    maxDetectedFaces: 1,
  });
  const faces = await detector.detect(image);
  const face = faces[0];

  if (!face) {
    return null;
  }

  const { x, y, width, height } = face.boundingBox;
  const centerX = x + width / 2;
  const centerY = y + height * 0.42;
  const size = Math.min(
    Math.max(width * 2.6, height * 2.6, image.naturalWidth * 0.38),
    Math.min(image.naturalWidth, image.naturalHeight),
  );

  return clampCrop({
    x: centerX - size / 2,
    y: centerY - size / 2,
    size,
  }, image.naturalWidth, image.naturalHeight);
}

function getFallbackCrop(width: number, height: number) {
  const size = Math.min(width, height);
  return clampCrop(
    {
      x: (width - size) / 2,
      y: Math.max((height - size) * 0.18, 0),
      size,
    },
    width,
    height,
  );
}

function clampCrop(crop: { x: number; y: number; size: number }, width: number, height: number) {
  const size = Math.min(crop.size, width, height);
  return {
    x: Math.min(Math.max(crop.x, 0), Math.max(width - size, 0)),
    y: Math.min(Math.max(crop.y, 0), Math.max(height - size, 0)),
    size,
  };
}

function renderCroppedImage(image: HTMLImageElement, crop: { x: number; y: number; size: number }, mimeType: string) {
  return new Promise<File>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Canvas is not available."));
      return;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const outputType = mimeType === "image/png" ? "image/png" : "image/jpeg";
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to render image."));
        return;
      }

      const extension = outputType === "image/png" ? "png" : "jpg";
      resolve(new File([blob], `profile-${Date.now()}.${extension}`, { type: outputType }));
    }, outputType, 0.92);
  });
}
