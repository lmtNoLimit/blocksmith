import { ShopifyDrop } from './base/ShopifyDrop';

/**
 * ForloopDrop - Loop iteration metadata
 * Available inside {% for %} loops as 'forloop'
 */
export class ForloopDrop extends ShopifyDrop {
  private _index: number;
  private _length: number;
  private _name: string;
  private _parentloop: ForloopDrop | null;

  constructor(index: number, length: number, name = 'item', parentloop: ForloopDrop | null = null) {
    super();
    this._index = index;
    this._length = length;
    this._name = name;
    this._parentloop = parentloop;
  }

  /** 1-based index */
  get index(): number { return this._index + 1; }

  /** 0-based index */
  get index0(): number { return this._index; }

  /** Reverse 1-based index */
  get rindex(): number { return this._length - this._index; }

  /** Reverse 0-based index */
  get rindex0(): number { return this._length - this._index - 1; }

  /** True if first iteration */
  get first(): boolean { return this._index === 0; }

  /** True if last iteration */
  get last(): boolean { return this._index === this._length - 1; }

  /** Total iterations */
  get length(): number { return this._length; }

  /** Parent forloop (for nested loops) */
  get parentloop(): ForloopDrop | null { return this._parentloop; }

  /** Loop variable name */
  get name(): string { return this._name; }
}
