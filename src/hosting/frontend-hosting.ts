import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

export interface FrontendHostingPaths {
  distRoot: string;
  websiteDist: string;
  adminDist: string;
  creatorDist: string;
}

interface HostingLogger {
  log(message: string): void;
}

const REQUIRED_FRONTEND_FILES = [
  'src/main.js',
  'website/index.html',
  'admin/index.html',
  'creator/index.html',
] as const;

const BACKEND_ROUTE_PREFIXES = [
  '/api',
  '/socket.io',
  '/uploads',
  '/health',
  '/metrics',
  '/docs',
] as const;

function isWithinRoutePrefix(requestPath: string, prefix: string): boolean {
  return requestPath === prefix || requestPath.startsWith(`${prefix}/`);
}

function isBackendOwnedPath(requestPath: string): boolean {
  return BACKEND_ROUTE_PREFIXES.some((prefix) => {
    return isWithinRoutePrefix(requestPath, prefix);
  });
}

function hasCompleteBuild(distRoot: string): boolean {
  return REQUIRED_FRONTEND_FILES.every((relativePath) => {
    return fs.existsSync(path.join(distRoot, relativePath));
  });
}

export function resolveFrontendHostingPaths(): FrontendHostingPaths {
  const candidates = [
    process.env.FRONTEND_DIST_ROOT,
    path.resolve(process.cwd(), 'dist'),
    path.resolve(__dirname, '../..'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const uniqueCandidates = [
    ...new Set(candidates.map((candidate) => path.resolve(candidate))),
  ];
  const distRoot = uniqueCandidates.find(hasCompleteBuild);

  if (!distRoot) {
    const diagnostics = uniqueCandidates
      .map((candidate) => {
        const missing = REQUIRED_FRONTEND_FILES.filter((relativePath) => {
          return !fs.existsSync(path.join(candidate, relativePath));
        });

        return `${candidate} (missing: ${missing.join(', ')})`;
      })
      .join('; ');

    throw new Error(
      `Frontend build is incomplete. Run "npm run build" before starting the full application. Checked: ${diagnostics}`,
    );
  }

  return {
    distRoot,
    websiteDist: path.join(distRoot, 'website'),
    adminDist: path.join(distRoot, 'admin'),
    creatorDist: path.join(distRoot, 'creator'),
  };
}

export function registerFrontendHosting(
  expressApp: express.Express,
  paths: FrontendHostingPaths,
  logger: HostingLogger,
): void {
  const staticOptions = {
    fallthrough: true,
    index: 'index.html',
    redirect: true,
  };

  const adminStatic = express.static(paths.adminDist, staticOptions);
  const creatorStatic = express.static(paths.creatorDist, staticOptions);
  const websiteStatic = express.static(paths.websiteDist, staticOptions);

  expressApp.use('/admin', adminStatic);
  expressApp.use('/creator', creatorStatic);
  expressApp.use((request, response, next) => {
    const requestPath = request.path;
    if (
      isWithinRoutePrefix(requestPath, '/admin') ||
      isWithinRoutePrefix(requestPath, '/creator') ||
      isBackendOwnedPath(requestPath)
    ) {
      return next();
    }

    return websiteStatic(request, response, next);
  });

  expressApp.use(
    (
      request: express.Request,
      response: express.Response,
      next: express.NextFunction,
    ) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return next();
      }

      const requestPath = request.path;

      if (isBackendOwnedPath(requestPath)) {
        return next();
      }

      if (path.extname(requestPath) !== '') {
        return next();
      }

      if (isWithinRoutePrefix(requestPath, '/admin')) {
        return response.sendFile(path.join(paths.adminDist, 'index.html'));
      }

      if (isWithinRoutePrefix(requestPath, '/creator')) {
        return response.sendFile(path.join(paths.creatorDist, 'index.html'));
      }

      return response.sendFile(path.join(paths.websiteDist, 'index.html'));
    },
  );

  logger.log(`Frontend hosting root resolved to ${paths.distRoot}`);
  logger.log(`Landing Website available from ${paths.websiteDist}`);
  logger.log(`Admin Portal available from ${paths.adminDist}`);
  logger.log(`Creator Studio available from ${paths.creatorDist}`);
}
