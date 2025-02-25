import { appendInitialChild, createInstance, createTextInstance } from "hostConfig"
import { FiberNode } from "./fiber"
import { HostComponent, HostRoot, HostText } from "./workTags"
import { NoFlags } from "./fiberFlags"

// 生成更新计划，计算和收集更新 flags
export const completeWork = (workInProgress: FiberNode) => {
	const newProps = workInProgress.pendingProps
	const current = workInProgress.alternate
	switch (workInProgress.tag) {
		case HostRoot:
			bubbleProperties(workInProgress)
			return null

		case HostComponent:
			if (current !== null && workInProgress.stateNode !== null) {
				// TODO: 组件的更新阶段
			} else {
				// 首屏渲染阶段
				// 构建 DOM
				const instance = createInstance(workInProgress.type, newProps)
				appendAllChildren(instance, workInProgress)
				workInProgress.stateNode = instance
			}

			bubbleProperties(workInProgress)
			return null

		case HostText:
			if (current !== null && workInProgress.stateNode !== null) {
				// TODO: 组件的更新阶段
			} else {
				// 首屏渲染阶段
				// 构建 DOM
				const instance = createTextInstance(newProps.content)
				workInProgress.stateNode = instance
			}

			bubbleProperties(workInProgress)
			return null

		default:
			if (__DEV__) {
				console.warn("completeWork 未实现的类型", workInProgress)
			}
			return null
	}
}



/**
 * 
 * @param parent 
 * @param workInProgress 
 * @returns 
 */
function appendAllChildren(parent: FiberNode, workInProgress: FiberNode) {
	let node = workInProgress.child
	while (node !== null) {
		if (node.tag == HostComponent || node.tag == HostText) {
			// 处理原生 DOM 元素节点或文本节点
			appendInitialChild(parent, node.stateNode)
		} else if (node.child !== null) {
			// 递归处理其他类型的组件节点的子节点
			node.child.return = node
			node = node.child
			continue
		}

		if (node == workInProgress) {
			return
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === workInProgress) {
				return
			}
			node = node.return
		}
		// 处理下一个兄弟节点

		node.sibling.return = node.return
		node = node.sibling
	}
}


/**
 * 冒泡更新flags
 * @param workInProgress 
 */
function bubbleProperties(workInProgress: FiberNode) {
	// 清理子flag
	let subtreeFlags = NoFlags

	let child = workInProgress.child

	while (child !== null) {
		// | 运算符会不断自下而上合并flags
		subtreeFlags |= child.subtreeFlags
		subtreeFlags |= child.flags

		child.return = workInProgress

		// 移动到兄弟节点
		child = child.sibling
	}

	workInProgress.subtreeFlags |= subtreeFlags
}
