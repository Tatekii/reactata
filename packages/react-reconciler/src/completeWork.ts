import { appendInitialChild, Container, createInstance, createTextInstance } from "hostConfig"
import { FiberNode } from "./fiber"
import {  Fragment, FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags"
import { NoFlags, Update } from "./fiberFlags"

// 收集更新 flags,构建DOM结构
export const completeWork = (workInProgress: FiberNode) => {
	const newProps = workInProgress.pendingProps
	const current = workInProgress.alternate

	console.log('completeWork',workInProgress);
	
	switch (workInProgress.tag) {
		case HostRoot:
			bubbleProperties(workInProgress)
			return null

		case HostComponent:
			if (current !== null && workInProgress.stateNode !== null) {
				//  组件的更新阶段
				updateHostComponent(current, workInProgress);
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
				//  组件的更新阶段
				updateHostText(current, workInProgress);
			} else {
				// 首屏渲染阶段
				// 构建 DOM
				const instance = createTextInstance(newProps.content)
				workInProgress.stateNode = instance
			}

			bubbleProperties(workInProgress)
			return null

		case FunctionComponent:
			bubbleProperties(workInProgress)
			return null

		case Fragment:
			bubbleProperties(workInProgress)
			return null

		default:
			if (__DEV__) {
				console.warn("completeWork 未实现的类型", workInProgress)
			}
			break
	}
}

/**
 *
 * @param parent
 * @param workInProgress
 * @returns
 */
function appendAllChildren(parent: Container, workInProgress: FiberNode) {
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



/**
 * 对比文字更新
 * @param current 
 * @param workInProgress 
 */
function updateHostText(current: FiberNode, workInProgress: FiberNode) {
	const oldText = current.memorizedProps!.content;
	const newText = workInProgress.pendingProps.content;
	if (oldText !== newText) {
		markUpdate(workInProgress);
	}
}


/**
 * 对比DOM标签更新
 * @param current 
 * @param workInProgress 
 */
function updateHostComponent(current: FiberNode, workInProgress: FiberNode) {
	const oldProps = current.memorizedProps;
	const newProps = workInProgress.pendingProps;

	if (oldProps !== newProps) {
		markUpdate(workInProgress);
	}
}

// 为 Fiber 节点增加 Update flags
function markUpdate(workInProgress: FiberNode) {
	workInProgress.flags |= Update;
}