import { ShopifyDrop } from './base/ShopifyDrop';

interface PaginateData {
  current_page: number;
  page_size: number;
  total_items: number;
}

interface PaginatePart {
  title: string;
  url: string;
  is_link: boolean;
}

/**
 * PaginateDrop - Pagination metadata for paginated collections
 * Provides Liquid-compatible access to pagination properties
 */
export class PaginateDrop extends ShopifyDrop {
  private data: PaginateData;

  constructor(data: PaginateData) {
    super();
    this.data = data;
  }

  get current_page(): number { return this.data.current_page; }
  get current_offset(): number { return (this.data.current_page - 1) * this.data.page_size; }
  get page_size(): number { return this.data.page_size; }
  get pages(): number { return Math.ceil(this.data.total_items / this.data.page_size); }
  get items(): number { return this.data.total_items; }

  get previous(): PaginatePart | null {
    if (this.data.current_page <= 1) return null;
    return {
      title: 'Previous',
      url: `?page=${this.data.current_page - 1}`,
      is_link: true
    };
  }

  get next(): PaginatePart | null {
    if (this.data.current_page >= this.pages) return null;
    return {
      title: 'Next',
      url: `?page=${this.data.current_page + 1}`,
      is_link: true
    };
  }

  /** Array of page parts for rendering pagination UI */
  get parts(): PaginatePart[] {
    const parts: PaginatePart[] = [];
    const totalPages = this.pages;

    for (let i = 1; i <= totalPages; i++) {
      parts.push({
        title: String(i),
        url: `?page=${i}`,
        is_link: i !== this.data.current_page
      });
    }

    return parts;
  }
}
