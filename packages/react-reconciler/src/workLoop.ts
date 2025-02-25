// packages/react-reconciler/src/workLoop.ts
import { beginWork } from "./beginWork"
import { commitMutationEffects } from "./commitWork"
import { completeWork } from "./completeWork"
import { createWorkInProgress, FiberNode, FiberRootNode } from "./fiber"
import { MutationMask, NoFlags } from "./fiberFlags"
import { HostRoot } from "./workTags"

let workInProgress: FiberNode | null = null

function renderRoot(root: FiberRootNode) {
	prepareFreshStack(root)

	try {
		workLoop()
	} catch (e) {
		console.warn(e)
		workInProgress = null
	}

	const finishedWork = root.current.alternate
	root.finishedWork = finishedWork

	commitRoot(root)
}

// 初始化
// workInProgress指向根节点
function prepareFreshStack(root: FiberRootNode) {
	workInProgress = createWorkInProgress(root.current, {})
}

// 深度优先遍历，向下递归子节点
function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress)
	}
}

function performUnitOfWork(fiber: FiberNode) {
	// 比较并返回子 FiberNode
	const next = beginWork(fiber)

	fiber.memorizedProps = fiber.pendingProps

	if (next == null) {
		// 没有子节点，则遍历兄弟节点或父节点
		completeUnitOfWork(fiber)
	} else {
		// 有子节点，继续向下深度遍历
		workInProgress = next
	}
}

// 深度优先遍历兄弟节点或父节点
function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber
	do {
		// 生成更新计划
		completeWork(node)
		// 有兄弟节点，则遍历兄弟节点
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
export function scheduleUpdateOnFiber(fiber: FiberNode) {
	const root = markUpdateFromFiberToRoot(fiber)
	renderRoot(root)
}

// 从触发更新的节点向上遍历到 FiberRootNode
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber
	while (node.return !== null) {
		node = node.return
	}
	if (node.tag == HostRoot) {
		return node.stateNode
	}
	return null
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
