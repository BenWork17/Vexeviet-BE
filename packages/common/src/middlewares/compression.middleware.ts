import zlib from 'zlib';
import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Lightweight gzip compression middleware for JSON API responses using built-in
 * Node `zlib`. Compresses payloads >= `thresholdBytes` (~90%+ reduction on
 * search/route/admin list payloads) without external runtime dependencies.
 */
export function createJsonCompressionMiddleware(thresholdBytes = 2048): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const acceptEncoding = req.headers['accept-encoding'];
    const acceptsGzip =
      typeof acceptEncoding === 'string' && /\bgzip\b/i.test(acceptEncoding);

    if (!acceptsGzip) {
      next();
      return;
    }

    const originalJson = res.json.bind(res);

    res.json = ((body: unknown): Response => {
      if (res.headersSent || res.getHeader('Content-Encoding')) {
        return originalJson(body);
      }

      const serialized = JSON.stringify(body);
      if (!serialized || Buffer.byteLength(serialized, 'utf8') < thresholdBytes) {
        return originalJson(body);
      }

      const compressed = zlib.gzipSync(Buffer.from(serialized, 'utf8'), {
        level: zlib.constants.Z_BEST_SPEED,
      });

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Encoding', 'gzip');
      res.vary('Accept-Encoding');
      res.setHeader('Content-Length', String(compressed.length));
      return res.send(compressed);
    }) as Response['json'];

    next();
  };
}
