/**
 * PathPersistence - 路径持久化功能
 *
 * 用于将头脑风暴路径数据持久化到文件系统，支持：
 * - 路径主文件保存/加载
 * - 节点文件按轮次存储
 * - 创新点快照存储
 * - .brainstorm 目录结构初始化
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { atomicWriteFile } from './atomic-write.js';
import {
  BRAINSTORM_DIR,
  PATH_FILE,
  NODES_DIR,
  SNAPSHOTS_DIR,
} from './path-constants.js';
import {
  BrainstormPath,
  BrainstormNode,
  InnovationSnapshot,
  isValidBrainstormPath,
  isValidBrainstormNode,
} from './brainstorm-path.js';

// ============================================================================
// 常量定义
// ============================================================================

// 目录/文件名常量集中于 `./path-constants.js`（REQ-040），此处不再重复声明。

// ============================================================================
// 公共 API
// ============================================================================

/**
 * 初始化 .brainstorm 目录结构
 *
 * @param projectPath - 项目根目录路径
 */
export async function initBrainstormDirectory(projectPath: string): Promise<void> {
  const brainstormPath = path.join(projectPath, BRAINSTORM_DIR);
  const nodesPath = path.join(brainstormPath, NODES_DIR);
  const snapshotsPath = path.join(brainstormPath, SNAPSHOTS_DIR);

  // 创建目录结构（递归创建）
  await fs.mkdir(nodesPath, { recursive: true });
  await fs.mkdir(snapshotsPath, { recursive: true });
}

/**
 * 保存路径到 .brainstorm/path.json
 *
 * @param brainstormPath - 路径数据
 * @param projectPath - 项目根目录路径
 */
export async function savePath(
  brainstormPath: BrainstormPath,
  projectPath: string
): Promise<void> {
  const filePath = path.join(projectPath, BRAINSTORM_DIR, PATH_FILE);

  // 确保目录存在
  await initBrainstormDirectory(projectPath);

  const content = JSON.stringify(brainstormPath, null, 2);
  // 原子写入（REQ-016：临时文件 + rename，杜绝截断文件与 Windows unlink 窗口）
  await atomicWriteFile(filePath, content, { mkdir: false });
}

/**
 * 加载路径
 *
 * @param projectPath - 项目根目录路径
 * @returns 路径数据，如果文件不存在则返回 null
 */
export async function loadPath(projectPath: string): Promise<BrainstormPath | null> {
  const filePath = path.join(projectPath, BRAINSTORM_DIR, PATH_FILE);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // 验证数据结构
    if (!isValidBrainstormPath(data)) {
      throw new Error('Invalid BrainstormPath data structure');
    }

    return data;
  } catch (error) {
    // 文件不存在或其他读取错误
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * 保存节点到 .brainstorm/nodes/round-N.json
 *
 * @param node - 节点数据
 * @param projectPath - 项目根目录路径
 */
export async function saveNode(
  node: BrainstormNode,
  projectPath: string
): Promise<void> {
  if (!isValidBrainstormNode(node)) throw new Error('Invalid BrainstormNode data structure');
  const nodesDir = path.join(projectPath, BRAINSTORM_DIR, NODES_DIR);
  const filePath = path.join(nodesDir, `round-${node.round}.json`);

  // 确保目录存在
  await fs.mkdir(nodesDir, { recursive: true });

  // 写入 JSON 文件（格式化输出）
  const content = JSON.stringify(node, null, 2);
  // 原子写入（REQ-016）
  await atomicWriteFile(filePath, content, { mkdir: false });
}

/**
 * 加载节点
 *
 * @param projectPath - 项目根目录路径
 * @param nodeId - 节点ID（如 "round-1"）
 * @returns 节点数据，如果文件不存在则返回 null
 */
export async function loadNode(
  projectPath: string,
  nodeId: string
): Promise<BrainstormNode | null> {
  // 从 nodeId 提取轮次号（格式: "round-N"）
  const match = nodeId.match(/^round-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid node ID format: ${nodeId}. Expected format: round-N`);
  }

  const round = match[1];
  const filePath = path.join(projectPath, BRAINSTORM_DIR, NODES_DIR, `round-${round}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // 验证数据结构
    if (!isValidBrainstormNode(data)) {
      throw new Error('Invalid BrainstormNode data structure');
    }

    return data;
  } catch (error) {
    // 文件不存在
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * 保存创新点快照
 *
 * @param snapshots - 创新点快照数组
 * @param projectPath - 项目根目录路径
 * @param round - 轮次号
 */
export async function saveInnovationSnapshot(
  snapshots: InnovationSnapshot[],
  projectPath: string,
  round: number
): Promise<void> {
  const snapshotsDir = path.join(projectPath, BRAINSTORM_DIR, SNAPSHOTS_DIR);
  const filePath = path.join(snapshotsDir, `round-${round}-innovations.json`);

  // 确保目录存在
  await fs.mkdir(snapshotsDir, { recursive: true });

  // 写入 JSON 文件（格式化输出）
  const content = JSON.stringify(snapshots, null, 2);
  // 原子写入（REQ-016）
  await atomicWriteFile(filePath, content, { mkdir: false });
}

/**
 * 加载创新点快照
 *
 * @param projectPath - 项目根目录路径
 * @param round - 轮次号
 * @returns 创新点快照数组，如果文件不存在则返回 null
 */
export async function loadInnovationSnapshot(
  projectPath: string,
  round: number
): Promise<InnovationSnapshot[] | null> {
  const filePath = path.join(
    projectPath,
    BRAINSTORM_DIR,
    SNAPSHOTS_DIR,
    `round-${round}-innovations.json`
  );

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // 验证是数组
    if (!Array.isArray(data)) {
      throw new Error('Invalid InnovationSnapshot data: expected array');
    }

    return data as InnovationSnapshot[];
  } catch (error) {
    // 文件不存在
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 检查 .brainstorm 目录是否存在
 *
 * @param projectPath - 项目根目录路径
 * @returns 是否存在
 */
export async function brainstormDirectoryExists(projectPath: string): Promise<boolean> {
  const brainstormPath = path.join(projectPath, BRAINSTORM_DIR);

  try {
    const stat = await fs.stat(brainstormPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * 获取所有已保存的轮次号
 *
 * @param projectPath - 项目根目录路径
 * @returns 轮次号数组（升序）
 */
export async function getSavedRounds(projectPath: string): Promise<number[]> {
  const nodesDir = path.join(projectPath, BRAINSTORM_DIR, NODES_DIR);

  try {
    const files = await fs.readdir(nodesDir);
    const rounds: number[] = [];

    for (const file of files) {
      const match = file.match(/^round-(\d+)\.json$/);
      if (match) {
        rounds.push(parseInt(match[1], 10));
      }
    }

    return rounds.sort((a, b) => a - b);
  } catch (error) {
    // 目录不存在
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * 加载所有节点
 *
 * @param projectPath - 项目根目录路径
 * @returns 节点数组（按轮次升序）
 */
export async function loadAllNodes(projectPath: string): Promise<BrainstormNode[]> {
  const rounds = await getSavedRounds(projectPath);
  const nodes: BrainstormNode[] = [];

  for (const round of rounds) {
    const node = await loadNode(projectPath, `round-${round}`);
    if (node) {
      nodes.push(node);
    }
  }

  return nodes;
}

/**
 * 删除指定轮次的节点文件
 *
 * @param projectPath - 项目根目录路径
 * @param round - 轮次号
 */
export async function deleteNode(projectPath: string, round: number): Promise<void> {
  const filePath = path.join(projectPath, BRAINSTORM_DIR, NODES_DIR, `round-${round}.json`);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    // 文件不存在则忽略
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * 删除指定轮次的创新点快照
 *
 * @param projectPath - 项目根目录路径
 * @param round - 轮次号
 */
export async function deleteInnovationSnapshot(
  projectPath: string,
  round: number
): Promise<void> {
  const filePath = path.join(
    projectPath,
    BRAINSTORM_DIR,
    SNAPSHOTS_DIR,
    `round-${round}-innovations.json`
  );

  try {
    await fs.unlink(filePath);
  } catch (error) {
    // 文件不存在则忽略
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
