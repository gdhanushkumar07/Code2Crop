import crypto from "crypto";
import WebSocket from "ws";

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WIN_EPOCH = 11644473600;
const S_TO_NS = BigInt(10000000);
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split(".")[0];
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

export const VOICE_MAP: Record<string, string> = {
  "te": "te-IN-ShrutiNeural",
  "hi": "hi-IN-SwaraNeural",
  "kn": "kn-IN-SapnaNeural",
  "ta": "ta-IN-PallaviNeural",
  "mr": "mr-IN-AarohiNeural",
  "en": "en-IN-NeerjaNeural",
};

function generateSecMsGec(): string {
  const unixTimestamp = Math.floor(Date.now() / 1000);
  let ticks = BigInt(unixTimestamp + WIN_EPOCH) * S_TO_NS;
  const fiveMinNs = BigInt(300) * S_TO_NS;
  ticks = ticks - (ticks % fiveMinNs);
  const strToHash = `${ticks}${TRUSTED_CLIENT_TOKEN}`;
  return crypto.createHash("sha256").update(strToHash, "ascii").digest("hex").toUpperCase();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function synthesize(text: string, voice: string, rate: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const gec = generateSecMsGec();
    const connId = crypto.randomUUID().replace(/-/g, "");
    const reqId = crypto.randomUUID().replace(/-/g, "");
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connId}`;

    const ws = new WebSocket(wsUrl, {
      headers: {
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
      },
    });

    const audioBuffers: Buffer[] = [];
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        reject(new Error("Edge TTS synthesis timed out after 30s"));
      }
    }, 30000);

    ws.on("open", () => {
      const configPayload = `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"${OUTPUT_FORMAT}"}}}}`;
      const configMsg = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${configPayload}`;
      ws.send(configMsg);

      const timestamp = new Date().toISOString().replace("Z", "+00:00");
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${voice}"><prosody pitch="+0Hz" rate="${rate}" volume="+0%">${escapeXml(text)}</prosody></voice></speak>`;
      const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    });

    ws.on("message", (data: WebSocket.Data, isBinary: boolean) => {
      if (isBinary && Buffer.isBuffer(data)) {
        if (data.length > 2) {
          const headerLen = data.readUInt16BE(0);
          const header = data.toString("utf8", 2, 2 + headerLen);
          if (header.includes("Path:audio")) {
            audioBuffers.push(data.subarray(2 + headerLen));
          }
        }
      } else {
        const msg = data.toString();
        if (msg.includes("Path:turn.end")) {
          clearTimeout(timeout);
          resolved = true;
          ws.close();
          resolve(Buffer.concat(audioBuffers));
        }
      }
    });

    ws.on("error", (err) => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        reject(err);
      }
    });

    ws.on("close", () => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        if (audioBuffers.length > 0) {
          resolve(Buffer.concat(audioBuffers));
        } else {
          reject(new Error("WebSocket closed without receiving audio data"));
        }
      }
    });
  });
}
