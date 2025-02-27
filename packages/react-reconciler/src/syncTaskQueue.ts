// 同步任务队列
let syncQueue: ((...args: any) => void)[] | null = null
let isFlushingSyncQueue: boolean = false

/**
 * 加入同步任务队列
 * @param callback 
 */
export function scheduleSyncCallback(callback: (...args: any) => void) {
	if (syncQueue === null) {
		syncQueue = [callback]
	}
	syncQueue.push(callback)
}

/**
 * 
 */
export function flushSyncCallback() {
    // 同步任务队列不可打断
    // 只能在之前的队列清空了再执行
	if (!isFlushingSyncQueue && syncQueue) {
        // 锁上
		isFlushingSyncQueue = true

		try {
			syncQueue.forEach((callback) => callback())
		} catch (e) {
			if (__DEV__) {
				console.error("flushSyncCallback 报错", e)
			}
		} finally {
			isFlushingSyncQueue = false
			syncQueue = null
		}
	}
}
