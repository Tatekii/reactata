// packages/react-reconciler/src/fiber.ts
import { Props, Key, Ref, ReactElementType } from "shared/ReactTypes"
import { Fragment, FunctionComponent, HostComponent, WorkTag } from "./workTags"
import { NoFlags, Flags } from "./fiberFlags"
import { Container } from "hostConfig"
import { Lane, Lanes, NoLane, NoLanes } from "./fiberLanes"

/** fiber节点 */
export class FiberNode {
	tag: WorkTag
	key: Key
	stateNode: any
	type: any
	return: FiberNode | null
	sibling: FiberNode | null
	child: FiberNode | null
	index: number
	ref: Ref
	pendingProps: Props
	memorizedProps: Props | null
	memorizedState: any
	alternate: FiberNode | null
	flags: Flags
	deletions:Array<FiberNode>|null
	subtreeFlags: Flags
	updateQueue: unknown

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		// 类型
		this.tag = tag
		this.key = key
		this.ref = null
		this.stateNode = null // 节点对应的实际 DOM 节点或组件实例
		this.type = null // 节点的类型，可以是原生 DOM 元素、函数组件或类组件等

		// 构成树状结构
		this.return = null // 指向节点的父节点
		this.sibling = null // 指向节点的下一个兄弟节点
		this.child = null // 指向节点的第一个子节点
		this.index = 0 // 索引

		// 作为工作单元
		this.pendingProps = pendingProps // 表示节点的新属性，用于在协调过程中进行更新
		this.memorizedProps = null // 已经更新完的属性
		this.memorizedState = null // 更新完成后新的 State

		this.alternate = null // 上一次更新的fiberNode
		this.flags = NoFlags // 表示节点的副作用类型，如更新、插入、删除等
		this.subtreeFlags = NoFlags // 表示子节点的副作用类型，如更新、插入、删除等
		this.updateQueue = null // 更新计划队列
		this.deletions = null
	}
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	pendingLanes: Lanes; // 待处理的更新
	finishedLane: Lane; // 已完成的更更新
	
	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		// 将根节点的 stateNode 属性指向 FiberRootNode，用于表示整个 React 应用的根节点
		hostRootFiber.stateNode = this;
		// 指向更新完成之后的 hostRootFiber
		this.finishedWork = null;

		this.pendingLanes = NoLanes;
		this.finishedLane = NoLane;
	}
}

/**
 * 根据 FiberRootNode.current 创建 workInProgress 树
 * @param current
 * @param pendingProps
 * @returns
 */
export const createWorkInProgress = (current: FiberNode, pendingProps: Props): FiberNode => {
	let workInProgress = current.alternate

	if (workInProgress == null) {
		// 首屏渲染时（mount）
		workInProgress = new FiberNode(current.tag, pendingProps, current.key)
		workInProgress.stateNode = current.stateNode

		// 双缓存
		// current与workInProgress
		workInProgress.alternate = current
		current.alternate = workInProgress
	} else {
		// 非首屏渲染时（update）
		workInProgress.pendingProps = pendingProps
		// 清空effect
		workInProgress.flags = NoFlags
		workInProgress.subtreeFlags = NoFlags
	}

	workInProgress.type = current.type
	workInProgress.updateQueue = current.updateQueue
	workInProgress.child = current.child
	workInProgress.memorizedProps = current.memorizedProps
	workInProgress.memorizedState = current.memorizedState

	return workInProgress
}

/**
 * 根据reactElement创建fiberNode
 * @param element
 * @returns
 */
export function createFiberFromElement(element: ReactElementType): FiberNode {

	console.log("createFiberFromElement", element)

	const { type, key, props } = element

	let fiberTag: WorkTag = FunctionComponent

	if (typeof type == "string") {
		// DOM标签节点
		fiberTag = HostComponent
	} else if (typeof type !== "function" && __DEV__) {
		console.warn("未定义的 type 类型", element)
	}

	const fiber = new FiberNode(fiberTag, props, key)

	fiber.type = type

	return fiber
}


/**
 * 根据fragment创建fiberNode
 * @param elements 
 * @param key 
 * @returns 
 */
export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
	const fiber = new FiberNode(Fragment, elements, key);
	return fiber;
}