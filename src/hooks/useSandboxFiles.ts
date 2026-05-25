/* src/hooks/useSandboxFiles.ts — 沙箱文件系统 hooks（只读） */
import { useQuery } from '@tanstack/react-query';
import { listFiles, readFile } from '../api/files';
import type { FSListResponse } from '../api/types';

/** 列目录 query key 工厂 */
const fsListKey = (sandboxId: string, path: string) =>
  ['sandbox-fs-list', sandboxId, path] as const;

/** 文件内容 query key 工厂 */
const fsReadKey = (sandboxId: string, path: string) =>
  ['sandbox-fs-read', sandboxId, path] as const;

/** 列目录 */
export function useSandboxFsList(sandboxId: string, path: string) {
  return useQuery<FSListResponse>({
    queryKey: fsListKey(sandboxId, path),
    queryFn: ({ signal }) => listFiles(sandboxId, path, signal),
    enabled: sandboxId.length > 0,
  });
}

/** 读取单个文件内容（文本；返回 string） */
export function useSandboxFileContent(
  sandboxId: string,
  path: string,
  enabled: boolean,
) {
  return useQuery<string>({
    queryKey: fsReadKey(sandboxId, path),
    queryFn: async ({ signal }) => {
      const res = await readFile(sandboxId, path, signal);
      return res.text();
    },
    enabled: enabled && sandboxId.length > 0 && path.length > 0,
  });
}
