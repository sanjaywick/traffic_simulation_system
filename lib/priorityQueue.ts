interface QueueElement<T> {
  element: T
  priority: number
}

export default class PriorityQueue<T> {
  private items: QueueElement<T>[] = []

  enqueue(element: T, priority: number): void {
    const queueElement: QueueElement<T> = { element, priority }
    let added = false

    for (let i = 0; i < this.items.length; i++) {
      if (queueElement.priority < this.items[i].priority) {
        this.items.splice(i, 0, queueElement)
        added = true
        break
      }
    }

    if (!added) {
      this.items.push(queueElement)
    }
  }

  dequeue(): QueueElement<T> | null {
    if (this.isEmpty()) {
      return null
    }
    return this.items.shift()!
  }

  isEmpty(): boolean {
    return this.items.length === 0
  }
}
