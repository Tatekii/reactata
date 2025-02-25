import { Container, appendChildToContainer } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import {
	ChildDeletion,
	MutationMask,
	NoFlags,
	Placement,
	Update
} from './fiberFlags';
import { HostComponent, HostRoot, HostText } from './workTags';

let nextEffect: FiberNode | null = null;

/**
 * 按照深度优先搜索，执行effect后return
 * @param finishedWork 
 */
export const commitMutationEffects = (finishedWork: FiberNode) => {

	nextEffect = finishedWork;

	while (nextEffect !== null) {

		const child: FiberNode | null = nextEffect.child;

        // 有子节点并且子节点有mutation副作用
		if (
			(nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			nextEffect = child;
		} else {
			// 无子节点或子节点没有mutation副作用
			up: while (nextEffect !== null) {

				commitMutationEffectsOnFiber(nextEffect);

				const sibling: FiberNode | null = nextEffect.sibling;

				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}

				nextEffect = nextEffect.return;
			}
		}
	}
};

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	const flags = finishedWork.flags;

	if ((flags & Placement) !== NoFlags) {
        // 插入操作
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
	}
	if ((flags & Update) !== NoFlags) {
		// TODO Update
		finishedWork.flags &= ~Update;
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		// TODO ChildDeletion
		finishedWork.flags &= ~ChildDeletion;
	}
};

// 执行 DOM 插入操作，将 FiberNode 对应的 DOM 插入 parent DOM 中
const commitPlacement = (finishedWork: FiberNode) => {
	if (__DEV__) {
		console.log('执行 Placement 操作', finishedWork);
	}
	const hostParent = getHostParent(finishedWork);
	if (hostParent !== null) {
		appendPlacementNodeIntoContainer(finishedWork, hostParent);
	}
};

/**
 * 获取fiber节点的DOM父节点
 * @param fiber 
 * @returns 
 */
const getHostParent = (fiber: FiberNode): Container | null => {

	let parent = fiber.return;

	while (parent !== null) {
		const parentTag = parent.tag;
		// 处理 Root 节点
		if (parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
		// 处理原生 DOM 元素节点
		if (parentTag === HostComponent) {
			return parent.stateNode as Container;
		} else {
            //
			parent = parent.return;
		}
	}
	if (__DEV__) {
		console.warn('未找到 host parent', fiber);
	}
	return null;
};


/**
 * 
 * @param finishedWork 
 * @param hostParent 
 */
const appendPlacementNodeIntoContainer = (
	finishedWork: FiberNode,
	hostParent: Container
) => {
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
        // TODO
		appendChildToContainer(finishedWork.stateNode, hostParent);
	} else {
		const child = finishedWork.child;
		if (child !== null) {
			appendPlacementNodeIntoContainer(child, hostParent);
			let sibling = child.sibling;
			while (sibling !== null) {
				appendPlacementNodeIntoContainer(sibling, hostParent);
				sibling = sibling.sibling;
			}
		}
	}
};
