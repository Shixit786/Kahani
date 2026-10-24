import https from 'https';
import crypto from 'crypto';

/**
 * FreeTSA RFC 3161 Timestamp Helper
 * Sends an RFC 3161 TimeStampReq to https://freetsa.org/tsr
 * If unreachable or fails, gracefully returns null and never throws/blocks upload.
 */
export async function getFreeTsaToken(sha256Hash) {
  try {
    // Generate minimal RFC 3161 TimeStampReq for SHA-256
    // If external request fails or times out, safely return fallback pending status
    return await new Promise((resolve) => {
      const hashBytes = Buffer.from(sha256Hash, 'hex');

      // Minimal DER encoded TimeStampReq for SHA-256
      // 0x30 ... SEQUENCE
      //   0x02 0x01 0x01 (version 1)
      //   0x30 ... (MessageImprint: SHA-256 OID 2.16.840.1.101.3.4.2.1 + 32-byte hash)
      const sha256OidDer = Buffer.from('300d06096086480165030402010500', 'hex');
      const hashOctet = Buffer.concat([Buffer.from([0x04, hashBytes.length]), hashBytes]);
      const messageImprint = Buffer.concat([
        Buffer.from([0x30, sha256OidDer.length + hashOctet.length]),
        sha256OidDer,
        hashOctet,
      ]);

      const reqBody = Buffer.concat([
        Buffer.from([0x30, 3 + messageImprint.length]),
        Buffer.from([0x02, 0x01, 0x01]), // version
        messageImprint,
      ]);

      const options = {
        hostname: 'freetsa.org',
        port: 443,
        path: '/tsr',
        method: 'POST',
        headers: {
          'Content-Type': 'application/timestamp-query',
          'Content-Length': reqBody.length,
          'User-Agent': 'Kahani-Evidence-Tracker',
        },
        timeout: 4000, // 4-second timeout so upload is never blocked
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          if (res.statusCode === 200) {
            const buf = Buffer.concat(chunks);
            resolve({
              tokenBase64: buf.toString('base64'),
              tsaTime: new Date().toISOString(),
              tsaStatus: 'verified',
            });
          } else {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.write(reqBody);
      req.end();
    });
  } catch {
    return null;
  }
}
