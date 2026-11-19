export type Comparator<T> = (a: T, b: T) => number;

export class PriorityQueue<T> {
  private heap: T[] = [];
  constructor(private cmp: Comparator<T>) {}

  get size(): number {
    return this.heap.length;
  }

  offer(value: T): void {
    this.heap.push(value);
    this.siftUp(this.heap.length - 1);
  }

  poll(): T | undefined {
    const n = this.heap.length;
    if (n === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop() as T;
    if (n > 1) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.heap[Symbol.iterator]();
  }

  toArray(): T[] {
    return [...this.heap];
  }

  private siftUp(idx: number): void {
    const h = this.heap;
    const cmp = this.cmp;
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (cmp(h[idx], h[parent]) < 0) {
        const tmp = h[idx];
        h[idx] = h[parent];
        h[parent] = tmp;
        idx = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(idx: number): void {
    const h = this.heap;
    const cmp = this.cmp;
    const n = h.length;
    while (true) {
      const l = idx * 2 + 1;
      const r = idx * 2 + 2;
      let best = idx;
      if (l < n && cmp(h[l], h[best]) < 0) best = l;
      if (r < n && cmp(h[r], h[best]) < 0) best = r;
      if (best === idx) break;
      const tmp = h[idx];
      h[idx] = h[best];
      h[best] = tmp;
      idx = best;
    }
  }
}
