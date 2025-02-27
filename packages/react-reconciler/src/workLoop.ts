// packages/react-reconciler/src/workLoop.ts
import { scheduleMicroTask } from "hostConfig"
import { beginWork } from "./beginWork"
import { commitMutationEffects } from "./commitWork"
import { completeWork } from "./completeWork"
import { createWorkInProgress, FiberNode, FiberRootNode } from "./fiber"
import { MutationMask, NoFlags } from "./fiberFlags"
import { Lane, NoLane, SyncLane } from "./fiberLane"
import { getHighestPriorityLane, mergeLanes } from "./fiberLanes"
import { flushSyncCallback, scheduleSyncCallback } from "./syncTaskQueue"
import { HostRoot } from "./workTags"

/**
 * 当前工作中的fiber
 */
let workInProgress: FiberNode | null = null

/**
 * 当前执行中的任务级别
 */
let workInProgressRenderLane: Lane = NoLane

function renderRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriorityLane(root.pendingLanes)

	if (nextLane !== SyncLane) {
		// NOTE 其他比 SyncLane 低的优先级或 NoLane，重新调度
		ensureRootIsScheduled(root)
		return
	}

	prepareFreshStack(root, lane)

	try {
		workLoop()
	} catch (e) {
		console.warn(e)
		workInProgress = null
	}

	const finishedWork = root.current.alternate

	root.finishedWork = finishedWork
	root.finishedLane = lane

	workInProgressRenderLane = NoLane

	commitRoot(root)
}

// 初始化
// workInProgress指向根节点
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	workInProgress = createWorkInProgress(root.current, {})
	workInProgressRenderLane = lane
}

// 深度优先遍历，向下递归子节点
function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress)
	}
}

function performUnitOfWork(fiber: FiberNode) {
	// 比较并返回子 FiberNode
	const next = beginWork(fiber, workInProgressRenderLane)

	fiber.memorizedProps = fiber.pendingProps

	if (next == null) {
		// 没有子节点，则遍历兄弟节点或父节点
		completeUnitOfWork(fiber)
	} else {
		// 有子节点，继续向下深度遍历
		workInProgress = next
	}
}

// 遍历执行DOM结构构建
function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber
	do {
		const next = completeWork(node) as FiberNode | null
		if (next !== null) {
			workInProgress = next
			return
		}

		// 有兄弟节点
		const sibling = node.sibling
		if (sibling !== null) {
			workInProgress = sibling
			return
		}
		// 否则向上返回，遍历父节点
		node = node.return
		// workInProgress 最终指向根节点
		workInProgress = node
	} while (node !== null)
}

// 调度更新
export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateFromFiberToRoot(fiber)

	markRootUpdated(root, lane)

	// renderRoot(root)
	ensureRootIsScheduled(root)
}

// 从触发更新的节点向上遍历到 FiberRootNode
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber

	while (node.return !== null) {
		node = node.return
	}

	if (workInProgress !== null) {
		console.error("render阶段结束时 workInProgress 须不为 null")
	}

	if (node.tag == HostRoot) {
		return node.stateNode
	}
	return null
}

/**
 将更新的优先级(lane)记录到根节点上
 */
function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

/**
 * commit阶段
 * @param root
 * @returns
 */
function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork

	if (finishedWork === null) {
		return
	}

	if (__DEV__) {
		console.log("commit 阶段开始")
	}

	root.finishedWork = null

	const subtreeHasEffects = (finishedWork.subtreeFlags & MutationMask) !== NoFlags

	const rootHasEffects = (finishedWork.flags & MutationMask) !== NoFlags

	if (subtreeHasEffects || rootHasEffects) {
		// beforeMutation

		// mutation
		commitMutationEffects(finishedWork)

		root.current = finishedWork

		// layout
	} else {
		root.current = finishedWork
	}
}

function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes)

	if (updateLane == NoLane) return

	if (updateLane === SyncLane) {
		//同步任务，用微任务调度，尽快执行
		scheduleSyncCallback(renderRoot.bind(null, root, updateLane))

		scheduleMicroTask(flushSyncCallback)
	} else {
		//TODO
	}
}
