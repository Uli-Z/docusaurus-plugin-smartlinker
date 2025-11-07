export function handlePostBuild(args: {
  postBuildLogger: { isLevelEnabled(level: string): boolean; info: Function; debug: Function };
  stats: {
    resolvedCount: number;
    noteCount: number;
    scannedFileCount: number;
    reusedPrimedFiles: boolean;
    registryBytes: number;
    indexBuildMs: number;
    termProcessingMs: number;
  };
  consumeTermProcessingMs: () => number;
  consumeIndexBuildMs: () => number;
}) {
  const { postBuildLogger, stats, consumeTermProcessingMs, consumeIndexBuildMs } = args;
  const termProcessingMs = consumeTermProcessingMs();
  const indexBuildMs = consumeIndexBuildMs();
  stats.termProcessingMs = termProcessingMs;
  stats.indexBuildMs = indexBuildMs;

  if (postBuildLogger.isLevelEnabled('info')) {
    postBuildLogger.info('SmartLink build complete', {
      entryCount: stats.resolvedCount,
      noteCount: stats.noteCount,
      filesScanned: stats.scannedFileCount,
      reusedPrimedFiles: stats.reusedPrimedFiles,
      registryBytes: stats.registryBytes,
      indexBuildMs: stats.indexBuildMs,
      termProcessingMs: stats.termProcessingMs,
    });
  }

  if (postBuildLogger.isLevelEnabled('debug')) {
    postBuildLogger.debug('Term processing duration', {
      termProcessingMs,
    });
    postBuildLogger.debug('Index build duration', {
      indexBuildMs,
    });
  }
}

