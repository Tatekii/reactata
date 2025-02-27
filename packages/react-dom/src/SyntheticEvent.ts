import { Container } from "hostConfig"
import { Props } from "shared/ReactTypes"

/**
 * 支持的事件
 */
export const validEventTypeList = ["click"]

interface SyntheticEvent extends Event {
	__stopPropagation: boolean
}

type EventCallback = (e: Event) => void

interface Paths {
	capture: EventCallback[]
	bubble: EventCallback[]
}

export const elementPropsKey = "__props"

export interface DOMElement extends Element {
	[elementPropsKey]: Props
}

/**
 * DOM元素上挂载参数
 * @param node
 * @param props
 */
export function updateFiberProps(node: DOMElement, props: Props | null) {
	const _props: Record<string, any> = {}

	for (const key in props) {
		if (key === "children") continue

		if (/^on[A-Z].*/.test(key)) {
			_props[key] = props[key]
			// 各种on事件属性
			// } else if (key === "style") {
			// 	// 行内样式展开

			// 	const _style = node.getAttribute

			// 	Object.keys(props[key]).forEach((styleName) => {
			// 		node.setAttribute() .style[styleName] = node[key][styleName]
			// 	})
		} else {
			Object.assign(node, {
				[key]: props[key],
			})
		}
	}

	console.log(node, props, _props)

	node[elementPropsKey] = _props
}

/**
 * 初始化事件
 * @param container
 * @param eventType
 * @returns
 */
export function initEvent(container: Container, eventType: string) {
	if (!validEventTypeList.includes(eventType)) {
		console.warn("initEvent 未实现的事件类型", eventType)
		return
	}
	if (__DEV__) {
		console.log("初始化事件", eventType)
	}

	container.addEventListener(eventType, (e: Event) => {
		dispatchEvent(container, eventType, e)
	})
}

/**
 *
 * 自定义的事件触发器
 * @param container
 * @param eventType
 * @param e
 * @returns
 */
function dispatchEvent(container: Container, eventType: string, e: Event) {
	const targetElement = e.target
	if (targetElement == null) {
		console.warn("事件不存在targetElement", e)
		return
	}
	// 收集沿途事件
	const { bubble, capture } = collectPaths(targetElement as DOMElement, container, eventType)

	console.log('dispatch event',bubble,capture);
	

	// 构造合成事件
	const syntheticEvent = createSyntheticEvent(e)

	// 遍历捕获 capture 事件
	triggerEventFlow(capture, syntheticEvent)

	// 遍历冒泡 bubble 事件
	if (!syntheticEvent.__stopPropagation) {
		triggerEventFlow(bubble, syntheticEvent)
	}
}

function collectPaths(targetElement: DOMElement, container: Container, eventType: string) {
	const paths: Paths = {
		capture: [],
		bubble: [],
	}

	// 收集
	while (targetElement && targetElement !== container) {
		const elementProps = targetElement[elementPropsKey]
		if (elementProps) {
			const callbackNameList = getEventCallbackNameFromEventType(eventType)
			if (callbackNameList) {
				callbackNameList.forEach((callbackName, i) => {
					const callback = elementProps[callbackName]
					if (callback) {
						if (i == 0) {
							paths.capture.unshift(callback)
						} else {
							paths.bubble.push(callback)
						}
					}
				})
			}
		}
		targetElement = targetElement.parentNode as DOMElement
	}

	return paths
}

function getEventCallbackNameFromEventType(eventType: string): string[] | undefined {
	return {
		click: ["onClickCapture", "onClick"],
	}[eventType]
}

/**
 * 构建合成事件
 * 保存原本的阻止冒泡
 * @param e
 * @returns
 */
function createSyntheticEvent(e: Event) {
	const syntheticEvent = e as SyntheticEvent
	syntheticEvent.__stopPropagation = false

	const originStopPropagation = e.stopPropagation

	syntheticEvent.stopPropagation = () => {
		syntheticEvent.__stopPropagation = true
		if (originStopPropagation) {
			originStopPropagation()
		}
	}

	return syntheticEvent
}

/**
 * 触发事件流
 * @param paths
 * @param syntheticEvent
 */
function triggerEventFlow(paths: EventCallback[], syntheticEvent: SyntheticEvent) {
	for (let i = 0; i < paths.length; i++) {
		const callback = paths[i]
		callback.call(null, syntheticEvent)
		if (syntheticEvent.__stopPropagation) {
			break
		}
	}
}
