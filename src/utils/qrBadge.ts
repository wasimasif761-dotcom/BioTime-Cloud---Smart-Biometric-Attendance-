import QRCode from 'qrcode';
import jsQR from 'jsqr';

/**
 * Generates an offline Data URL image for an employee QR badge.
 */
export async function generateQrBadgeUrl(payload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      color: {
        dark: '#020617', // slate-950
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return '';
  }
}

/**
 * Scans a frame from a live video element using jsqr.
 * Returns the decoded string if a QR badge was detected, or null.
 */
export function scanQrFromVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string | null {
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
    return null;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });

  if (code && code.data && code.data.trim().length > 0) {
    return code.data.trim();
  }

  return null;
}

// ----------------------------------------------------
// MOBILE WEBAUTHN (Built-in Phone TouchID / FaceID / Biometric)
// ----------------------------------------------------

/**
 * Checks if the phone supports built-in platform biometric authentication (TouchID, FaceID, Android Fingerprint).
 */
export async function isPlatformBiometricsAvailable(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    !window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
  ) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Triggers phone's native biometric prompt (Fingerprint / Face Unlock) to register an employee.
 */
export async function registerPhoneBiometrics(
  employeeId: string,
  employeeName: string
): Promise<string | null> {
  if (!window.PublicKeyCredential) return null;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new TextEncoder().encode(employeeId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Isam Economics Smart Kiosk',
        },
        user: {
          id: userId,
          name: employeeId,
          displayName: employeeName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // device fingerprint/face
          userVerification: 'required',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (credential && credential.id) {
      return credential.id;
    }
    return null;
  } catch (err) {
    console.warn('WebAuthn registration error/cancelled:', err);
    return null;
  }
}

/**
 * Verifies the user using phone's native fingerprint/FaceID sensor.
 */
export async function verifyPhoneBiometrics(credentialId?: string): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const options: CredentialRequestOptions = {
      publicKey: {
        challenge,
        userVerification: 'required',
        timeout: 60000,
      },
    };

    if (credentialId) {
      // Decode credential id if specified
      const rawId = new TextEncoder().encode(credentialId);
      options.publicKey!.allowCredentials = [
        {
          id: rawId,
          type: 'public-key',
          transports: ['internal'],
        },
      ];
    }

    const assertion = await navigator.credentials.get(options);
    return !!assertion;
  } catch (err) {
    console.warn('WebAuthn verification error/cancelled:', err);
    return false;
  }
}
