import * as faceapi from '@vladmandic/face-api';
import { Employee } from '../types';

let modelsLoaded = false;
let loadingPromise: Promise<boolean> | null = null;

/**
 * Initializes face detection and recognition neural networks.
 * Loads locally from /models first (100% offline), with CDN fallback.
 */
export async function loadFaceModels(): Promise<boolean> {
  if (modelsLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // 1. Try local offline models from /models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      modelsLoaded = true;
      return true;
    } catch (localErr) {
      console.warn('Local model load failed, attempting CDN fallback:', localErr);
      try {
        const cdnUri = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(cdnUri),
          faceapi.nets.faceLandmark68Net.loadFromUri(cdnUri),
          faceapi.nets.faceRecognitionNet.loadFromUri(cdnUri),
        ]);
        modelsLoaded = true;
        return true;
      } catch (cdnErr) {
        console.error('Failed to load face recognition models:', cdnErr);
        modelsLoaded = false;
        return false;
      }
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

export function areModelsReady(): boolean {
  return modelsLoaded;
}

export interface FaceDetectionResult {
  descriptor: Float32Array;
  descriptorArray: number[];
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  score: number;
}

/**
 * Detects a face and computes the 128-dimensional facial embedding descriptor.
 */
export async function detectAndComputeFaceDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetectionResult | null> {
  const ready = await loadFaceModels();
  if (!ready) return null;

  try {
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.45,
    });

    const result = await faceapi
      .detectSingleFace(input, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!result || !result.descriptor) {
      return null;
    }

    const box = result.detection.box;

    return {
      descriptor: result.descriptor,
      descriptorArray: Array.from(result.descriptor),
      box: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      },
      score: Math.round(result.detection.score * 100),
    };
  } catch (err) {
    console.error('Error during face detection:', err);
    return null;
  }
}

/**
 * Computes Euclidean distance between two 128-float vectors.
 * A distance < 0.52 generally indicates the same person.
 */
export function calculateEuclideanDistance(
  vec1: number[] | Float32Array,
  vec2: number[] | Float32Array
): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return 1.0;
  }
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export interface MatchResult {
  employee: Employee;
  distance: number;
  confidencePercent: number;
}

/**
 * Matches a query face descriptor against all enrolled employees in IndexedDB.
 * Returns the best match if distance is below the acceptance threshold (default 0.52).
 */
export function matchFaceAgainstEmployees(
  queryDescriptor: Float32Array | number[],
  employees: Employee[],
  maxThreshold = 0.52
): MatchResult | null {
  const candidates = employees.filter(
    (emp) => emp.faceRegistered && emp.faceDescriptor && emp.faceDescriptor.length === 128
  );

  if (candidates.length === 0) {
    return null;
  }

  let bestMatch: Employee | null = null;
  let minDistance = Infinity;

  for (const emp of candidates) {
    if (!emp.faceDescriptor) continue;
    const distance = calculateEuclideanDistance(queryDescriptor, emp.faceDescriptor);
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = emp;
    }
  }

  if (bestMatch && minDistance <= maxThreshold) {
    // Confidence percentage: 0 distance = 100%, threshold distance = 70%
    const normalized = Math.max(0, 1 - minDistance / maxThreshold);
    const confidence = Math.round(70 + normalized * 30);
    return {
      employee: bestMatch,
      distance: Number(minDistance.toFixed(4)),
      confidencePercent: Math.min(100, Math.max(70, confidence)),
    };
  }

  return null;
}
