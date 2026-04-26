const { Readable, pipeline } = require("stream");
const zlib = require("zlib");
const { promisify } = require("util");

const pipelineAsync = promisify(pipeline);

/**
 * Creates a Readable stream from any JSON-serialisable value.
 */
function createJsonStream(data) {
  return Readable.from([JSON.stringify(data)]);
}

/**
 * Creates a gzip transform stream.
 */
function createGzipTransform() {
  return zlib.createGzip();
}

/**
 * Pipes data → gzip → res with correct headers.
 * Demonstrates Node.js Streams + zlib compression.
 */
async function sendGzippedJson(res, data) {
  const json = JSON.stringify(data);
  const buf = Buffer.from(json, "utf8");

  res.setHeader("Content-Encoding", "gzip");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Vary", "Accept-Encoding");

  const src = Readable.from([buf]);
  const gz = createGzipTransform();

  await pipelineAsync(src, gz, res);
}

/**
 * Streams a plain text/SVG response.
 */
async function sendStream(res, contentType, textContent) {
  res.setHeader("Content-Type", contentType);
  const src = Readable.from([Buffer.from(textContent, "utf8")]);
  await pipelineAsync(src, res);
}

module.exports = {
  pipelineAsync,
  createJsonStream,
  createGzipTransform,
  sendGzippedJson,
  sendStream,
};
