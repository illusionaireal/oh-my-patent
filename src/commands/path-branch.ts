/**
 * PathBranch - 分支创建 API
 *
 * 提供头脑风暴路径的分支管理功能，支持：
 * - 从指定节点创建分支
 * - 列出所有分支
 * - 获取分支详情
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { loadPath, loadNode, saveNode, initBrainstormDirectory } from '../core/path-persistence.js';
import { BrainstormPath, BrainstormNode } from '../core/brainstorm-path.js';
import { ensureInside as ensureBranchPathInside } from '../core/path-safety.js';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 分支状态
 */
export type BranchStatus = 'active' | 'completed' | 'abandoned';

/**
 * 分支信息
 */
export interface BranchInfo {
  branchId: string;
  parentPathId: string;
  branchPointNodeId: string;
  branchReason: string;
  createdAt: string;
  status: BranchStatus;
}

/**
 * 分支创建结果
 */
export interface BranchResult {
  branchId: string;
  parentPathId: string;
  branchPointNodeId: string;
  branchReason: string;
  message: string;
}

/**
 * 分支详情
 */
export interface BranchDetail extends BranchInfo {
  nodes: string[];
  currentNodeId: string;
}

/**
 * 分支索引
 */
interface BranchIndex {
  branches: BranchInfo[];
  lastBranchNumber: number;
}

// ============================================================================
// 常量定义
// ============================================================================

const BRANCHES_DIR = 'branches';
const INDEX_FILE = 'index.json';

const BRANCH_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const PATH_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

// Path ID: max 128, Branch ID: max 160 to accommodate suffix like "-branch-123"
const MAX_PATH_ID_LENGTH = 128;
const MAX_BRANCH_ID_LENGTH = 160;

export function isValidBranchId(branchId: string): boolean {
  return typeof branchId === 'string' && branchId.length > 0 && branchId.length <= MAX_BRANCH_ID_LENGTH && BRANCH_ID_PATTERN.test(branchId);
}

export function isValidPathId(pathId: string): boolean {
  return typeof pathId === 'string' && pathId.length > 0 && pathId.length <= MAX_PATH_ID_LENGTH && PATH_ID_PATTERN.test(pathId);
}

function assertValidBranchId(branchId: string): void {
  if (!isValidBranchId(branchId)) {
    throw new Error(`Invalid branchId: ${branchId}. Must match ${BRANCH_ID_PATTERN.source}, 1-${MAX_BRANCH_ID_LENGTH} chars`);
  }
}

function assertValidPathId(pathId: string): void {
  if (!isValidPathId(pathId)) {
    throw new Error(`Invalid pathId: ${pathId}. Must match ${PATH_ID_PATTERN.source}, 1-${MAX_PATH_ID_LENGTH} chars`);
  }
}



// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取分支目录路径
 *
 * @param projectPath - 项目根目录路径
 * @returns 分支目录路径
 */
function getBranchesDir(projectPath: string): string {
  return path.join(projectPath, '.brainstorm', BRANCHES_DIR);
}

/**
 * 获取分支索引文件路径
 *
 * @param projectPath - 项目根目录路径
 * @returns 分支索引文件路径
 */
function getBranchIndexPath(projectPath: string): string {
  return path.join(getBranchesDir(projectPath), INDEX_FILE);
}

/**
 * 获取分支文件路径
 *
 * @param projectPath - 项目根目录路径
 * @param branchId - 分支ID
 * @returns 分支文件路径
 */
function getBranchFilePath(projectPath: string, branchId: string): string {
  assertValidBranchId(branchId);
  const filePath = path.join(getBranchesDir(projectPath), `${branchId}.json`);
  ensureBranchPathInside(getBranchesDir(projectPath), filePath);
  return filePath;
}

/**
 * 初始化分支目录结构
 *
 * @param projectPath - 项目根目录路径
 */
async function initBranchDirectory(projectPath: string): Promise<void> {
  const branchesDir = getBranchesDir(projectPath);
  await fs.mkdir(branchesDir, { recursive: true });
}

/**
 * 加载分支索引
 *
 * @param projectPath - 项目根目录路径
 * @returns 分支索引，如果文件不存在则返回空索引
 */
async function loadBranchIndex(projectPath: string): Promise<BranchIndex> {
  const indexPath = getBranchIndexPath(projectPath);

  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    const data = JSON.parse(content);

    // 验证数据结构
    if (!data.branches || !Array.isArray(data.branches)) {
      return { branches: [], lastBranchNumber: 0 };
    }

    return {
      branches: data.branches,
      lastBranchNumber: data.lastBranchNumber || 0,
    };
  } catch (error) {
    // 文件不存在
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { branches: [], lastBranchNumber: 0 };
    }
    throw error;
  }
}

/**
 * 保存分支索引
 *
 * @param projectPath - 项目根目录路径
 * @param index - 分支索引数据
 */
async function saveBranchIndex(projectPath: string, index: BranchIndex): Promise<void> {
  await initBranchDirectory(projectPath);

  const indexPath = getBranchIndexPath(projectPath);
  const content = JSON.stringify(index, null, 2);
  await fs.writeFile(indexPath, content, 'utf-8');
}

/**
 * 保存分支路径
 *
 * @param projectPath - 项目根目录路径
 * @param branchId - 分支ID
 * @param branchPath - 分支路径数据
 */
async function saveBranchPath(
  projectPath: string,
  branchId: string,
  branchPath: BrainstormPath
): Promise<void> {
  assertValidBranchId(branchId);
  await initBranchDirectory(projectPath);

  const filePath = getBranchFilePath(projectPath, branchId);
  const content = JSON.stringify(branchPath, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * 加载分支路径
 *
 * @param projectPath - 项目根目录路径
 * @param branchId - 分支ID
 * @returns 分支路径数据，如果文件不存在则返回 null
 */
async function loadBranchPath(
  projectPath: string,
  branchId: string
): Promise<BrainstormPath | null> {
  assertValidBranchId(branchId);
  const filePath = getBranchFilePath(projectPath, branchId);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    return data as BrainstormPath;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * 生成分支ID
 *
 * @param originalPathId - 原始路径ID
 * @param branchNumber - 分支序号
 * @returns 分支ID
 */
function generateBranchId(originalPathId: string, branchNumber: number): string {
  // Validate original path ID to prevent traversal via tampered path.json
  assertValidPathId(originalPathId);
  // 从原始路径ID中提取基础部分
  // 例如: path-1712345678 -> path-1712345678-branch-1
  return `${originalPathId}-branch-${branchNumber}`;
}

// ============================================================================
// 公共 API
// ============================================================================

/**
 * 从指定节点创建分支
 *
 * @param projectPath - 项目根目录路径
 * @param nodeId - 分支点节点ID（如 "round-2"）
 * @param branchReason - 分支原因说明
 * @returns 分支创建结果
 * @throws 如果原路径不存在或分支点节点不存在
 *
 * @example
 * ```typescript
 * const result = await createBranchFromNode(
 *   '/path/to/project',
 *   'round-2',
 *   '探索不同的创新方向'
 * );
 * console.log(result.branchId); // "path-1712345678-branch-1"
 * ```
 */
export async function createBranchFromNode(
  projectPath: string,
  nodeId: string,
  branchReason: string
): Promise<BranchResult> {
  // 1. 加载原路径
  const originalPath = await loadPath(projectPath);
  if (!originalPath) {
    throw new Error(`No path found in project: ${projectPath}`);
  }

  // 2. 找到分支点节点
  const nodeIndex = originalPath.nodes.indexOf(nodeId);
  if (nodeIndex === -1) {
    throw new Error(`Node ${nodeId} not found in path`);
  }

  // 3. 加载分支索引并生成新的分支ID
  await initBranchDirectory(projectPath);
  const index = await loadBranchIndex(projectPath);
  const branchNumber = index.lastBranchNumber + 1;
  const branchId = generateBranchId(originalPath.id, branchNumber);

  // 3.1 关键修复：生成完整 branchId 后、任何文件写入前完成校验，避免长 ID 导致孤儿文件
  // 原逻辑在 saveBranchPath 才校验，此时节点文件已写入，会遗留不在索引中的分支目录
  assertValidBranchId(branchId);

  // 4. 复制该节点及之前所有节点到新路径
  const nodesToCopy = originalPath.nodes.slice(0, nodeIndex + 1);
  const branchPath: BrainstormPath = {
    id: branchId,
    projectId: originalPath.projectId,
    topic: originalPath.topic,
    createdAt: new Date().toISOString(),
    status: 'active',
    nodes: nodesToCopy,
    edges: originalPath.edges.filter(
      edge => nodesToCopy.includes(edge.fromNodeId) && nodesToCopy.includes(edge.toNodeId)
    ),
    currentNodeId: nodeId,
  };

  // 5. 保存分支路径节点文件 + 6. 保存元数据 + 7. 更新索引
  // 包裹 try-catch，失败时清理已写入的孤儿文件，满足“失败不产生文件”
  try {
    for (const copiedNodeId of nodesToCopy) {
      const node = await loadNode(projectPath, copiedNodeId);
      if (node) {
        const branchNodesDir = path.join(getBranchesDir(projectPath), branchId, 'nodes');
        ensureBranchPathInside(getBranchesDir(projectPath), branchNodesDir);
        await fs.mkdir(branchNodesDir, { recursive: true });

        const nodeFilePath = path.join(branchNodesDir, `round-${node.round}.json`);
        const nodeContent = JSON.stringify(node, null, 2);
        await fs.writeFile(nodeFilePath, nodeContent, 'utf-8');
      }
    }

    await saveBranchPath(projectPath, branchId, branchPath);

    const branchInfo: BranchInfo = {
      branchId,
      parentPathId: originalPath.id,
      branchPointNodeId: nodeId,
      branchReason,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    index.branches.push(branchInfo);
    index.lastBranchNumber = branchNumber;
    await saveBranchIndex(projectPath, index);
  } catch (error) {
    // 清理孤儿文件：分支目录和分支元数据文件
    try {
      const branchNodesDir = path.join(getBranchesDir(projectPath), branchId);
      ensureBranchPathInside(getBranchesDir(projectPath), branchNodesDir);
      await fs.rm(branchNodesDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    try {
      const filePath = getBranchFilePath(projectPath, branchId);
      await fs.unlink(filePath);
    } catch {
      // ignore if not exists
    }
    throw error;
  }

  return {
    branchId,
    parentPathId: originalPath.id,
    branchPointNodeId: nodeId,
    branchReason,
    message: `Successfully created branch ${branchId} from node ${nodeId}`,
  };
}

/**
 * 列出所有分支
 *
 * @param projectPath - 项目根目录路径
 * @returns 分支信息数组
 *
 * @example
 * ```typescript
 * const branches = await listBranches('/path/to/project');
 * branches.forEach(branch => {
 *   console.log(`${branch.branchId}: ${branch.branchReason}`);
 * });
 * ```
 */
export async function listBranches(projectPath: string): Promise<BranchInfo[]> {
  const index = await loadBranchIndex(projectPath);
  return index.branches;
}

/**
 * 获取分支详情
 *
 * @param projectPath - 项目根目录路径
 * @param branchId - 分支ID
 * @returns 分支详情，如果分支不存在则返回 null
 *
 * @example
 * ```typescript
 * const detail = await getBranchDetail('/path/to/project', 'path-1712345678-branch-1');
 * if (detail) {
 *   console.log(`Branch nodes: ${detail.nodes.join(', ')}`);
 *   console.log(`Current: ${detail.currentNodeId}`);
 * }
 * ```
 */
export async function getBranchDetail(
  projectPath: string,
  branchId: string
): Promise<BranchDetail | null> {
  assertValidBranchId(branchId);
  // 1. 加载分支索引，查找分支信息
  const index = await loadBranchIndex(projectPath);
  const branchInfo = index.branches.find(b => b.branchId === branchId);

  if (!branchInfo) {
    return null;
  }

  // 2. 加载分支路径
  const branchPath = await loadBranchPath(projectPath, branchId);
  if (!branchPath) {
    return null;
  }

  // 3. 构建并返回分支详情
  return {
    ...branchInfo,
    nodes: branchPath.nodes,
    currentNodeId: branchPath.currentNodeId,
  };
}

/**
 * 更新分支状态
 *
 * @param projectPath - 项目根目录路径
 * @param branchId - 分支ID
 * @param status - 新状态
 * @returns 是否更新成功
 */
export async function updateBranchStatus(
  projectPath: string,
  branchId: string,
  status: BranchStatus
): Promise<boolean> {
  assertValidBranchId(branchId);
  const index = await loadBranchIndex(projectPath);
  const branchInfo = index.branches.find(b => b.branchId === branchId);

  if (!branchInfo) {
    return false;
  }

  branchInfo.status = status;
  await saveBranchIndex(projectPath, index);

  // 同时更新分支路径文件中的状态
  const branchPath = await loadBranchPath(projectPath, branchId);
  if (branchPath) {
    branchPath.status = status;
    await saveBranchPath(projectPath, branchId, branchPath);
  }

  return true;
}

/**
 * 删除分支
 *
 * @param projectPath - 项目根目录路径
 * @param branchId - 分支ID
 * @returns 是否删除成功
 */
export async function deleteBranch(projectPath: string, branchId: string): Promise<boolean> {
  assertValidBranchId(branchId);
  const index = await loadBranchIndex(projectPath);
  const branchIndex = index.branches.findIndex(b => b.branchId === branchId);

  if (branchIndex === -1) {
    return false;
  }

  // 从索引中移除
  index.branches.splice(branchIndex, 1);
  await saveBranchIndex(projectPath, index);

  // 删除分支路径文件
  const filePath = getBranchFilePath(projectPath, branchId);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  // 删除分支节点目录
  const branchNodesDir = path.join(getBranchesDir(projectPath), branchId);
  ensureBranchPathInside(getBranchesDir(projectPath), branchNodesDir);
  try {
    await fs.rm(branchNodesDir, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return true;
}
