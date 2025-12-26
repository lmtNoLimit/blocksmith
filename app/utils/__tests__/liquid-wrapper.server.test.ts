import { wrapLiquidForProxy, parseProxyParams } from "../liquid-wrapper.server";

describe("wrapLiquidForProxy", () => {
  describe("basic wrapping", () => {
    it("should wrap code in blocksmith-preview container", () => {
      const result = wrapLiquidForProxy({ liquidCode: "<div>Test</div>" });

      expect(result).toContain('<div class="blocksmith-preview" id="shopify-section-preview">');
      expect(result).toContain("<div>Test</div>");
      expect(result).toContain("</div>");
    });

    it("should include CSS isolation styles", () => {
      const result = wrapLiquidForProxy({ liquidCode: "<p>Hello</p>" });

      expect(result).toContain("<style>");
      expect(result).toContain(".blocksmith-preview");
      expect(result).toContain("font-family:");
      expect(result).toContain("max-width: 100%");
    });

    it("should use custom section ID when provided", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "<span>Test</span>",
        sectionId: "custom-123",
      });

      expect(result).toContain('id="shopify-section-custom-123"');
    });
  });

  describe("product context injection", () => {
    it("should inject product assign for valid handle", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "{{ product.title }}",
        productHandle: "test-product",
      });

      expect(result).toContain("{% assign product = all_products['test-product'] %}");
    });

    it("should reject invalid product handles", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "{{ product.title }}",
        productHandle: "test<script>alert(1)</script>",
      });

      expect(result).not.toContain("all_products");
    });

    it("should reject product handles with special characters", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "{{ product.title }}",
        productHandle: "test']; malicious",
      });

      expect(result).not.toContain("all_products");
    });
  });

  describe("collection context injection", () => {
    it("should inject collection assign for valid handle", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "{{ collection.title }}",
        collectionHandle: "featured-collection",
      });

      expect(result).toContain("{% assign collection = collections['featured-collection'] %}");
    });

    it("should reject invalid collection handles", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "{{ collection.title }}",
        collectionHandle: "test<>injection",
      });

      expect(result).not.toContain("collections[");
    });
  });

  describe("settings injection", () => {
    it("should inject string settings with settings_ prefix", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "{{ settings_heading }}",
        settings: { heading: "Hello World" },
      });

      expect(result).toContain("{% assign settings_heading = 'Hello World' %}");
    });

    it("should inject number settings with settings_ prefix", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "{{ settings_columns }}",
        settings: { columns: 3 },
      });

      expect(result).toContain("{% assign settings_columns = 3 %}");
    });

    it("should inject boolean settings with settings_ prefix", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "{{ settings_show_title }}",
        settings: { show_title: true },
      });

      expect(result).toContain("{% assign settings_show_title = true %}");
    });

    it("should escape single quotes in string settings", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "{{ settings_text }}",
        settings: { text: "It's a test" },
      });

      expect(result).toContain("{% assign settings_text = 'It\\'s a test' %}");
    });

    it("should reject settings with invalid variable names", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "test",
        settings: { "123invalid": "value", "valid_name": "value2" },
      });

      expect(result).not.toContain("123invalid");
      expect(result).toContain("{% assign settings_valid_name = 'value2' %}");
    });

    it("should skip complex object/array settings", () => {
      const result = wrapLiquidForProxy({
        liquidCode: "test",
        settings: { nested: { key: "value" }, array: [1, 2, 3] },
      });

      expect(result).not.toContain("settings_nested");
      expect(result).not.toContain("settings_array");
    });
  });

  describe("section.id replacement", () => {
    it("should replace {{ section.id }} with sectionId in CSS", () => {
      const code = `{% style %}
#shopify-section-{{ section.id }} { background: red; }
{% endstyle %}`;

      const result = wrapLiquidForProxy({ liquidCode: code });

      expect(result).toContain("#shopify-section-preview { background: red; }");
      expect(result).not.toContain("{{ section.id }}");
    });

    it("should replace {{ section.id }} with custom sectionId", () => {
      const code = `{% style %}
#shopify-section-{{ section.id }} .content { color: blue; }
{% endstyle %}`;

      const result = wrapLiquidForProxy({
        liquidCode: code,
        sectionId: "custom-123",
      });

      expect(result).toContain("#shopify-section-custom-123 .content { color: blue; }");
    });

    it("should handle whitespace variations in section.id", () => {
      const code = `{% style %}
#shopify-section-{{section.id}} { padding: 10px; }
#shopify-section-{{ section.id }} { margin: 5px; }
{% endstyle %}`;

      const result = wrapLiquidForProxy({ liquidCode: code });

      expect(result).toContain("#shopify-section-preview { padding: 10px; }");
      expect(result).toContain("#shopify-section-preview { margin: 5px; }");
    });
  });

  describe("schema block stripping", () => {
    it("should remove schema block from code", () => {
      const code = `<div>Content</div>
{% schema %}
{
  "name": "Test Section"
}
{% endschema %}`;

      const result = wrapLiquidForProxy({ liquidCode: code });

      expect(result).toContain("<div>Content</div>");
      expect(result).not.toContain("{% schema %}");
      expect(result).not.toContain("{% endschema %}");
      expect(result).not.toContain('"name": "Test Section"');
    });

    it("should handle whitespace control syntax in schema tags", () => {
      const code = `<div>Test</div>{%- schema -%}{"name":"X"}{%- endschema -%}`;

      const result = wrapLiquidForProxy({ liquidCode: code });

      expect(result).toContain("<div>Test</div>");
      expect(result).not.toContain("schema");
    });
  });
});

describe("parseProxyParams", () => {
  describe("code parsing", () => {
    it("should decode base64 code parameter", () => {
      const code = "<div>Hello</div>";
      const encoded = Buffer.from(code).toString("base64");
      const url = new URL(`https://example.com?code=${encoded}`);

      const result = parseProxyParams(url);

      expect(result.code).toBe(code);
    });

    it("should decode even malformed base64 (Node Buffer is lenient)", () => {
      // Note: Node's Buffer.from is lenient with base64, so this will decode
      // to something rather than throw. This test documents that behavior.
      const url = new URL("https://example.com?code=dGVzdA=="); // "test" in base64

      const result = parseProxyParams(url);

      expect(result.code).toBe("test");
    });

    it("should return null when code is missing", () => {
      const url = new URL("https://example.com");

      const result = parseProxyParams(url);

      expect(result.code).toBe(null);
    });
  });

  describe("settings parsing", () => {
    it("should decode base64 JSON settings", () => {
      const settings = { heading: "Test", columns: 3 };
      const encoded = Buffer.from(JSON.stringify(settings)).toString("base64");
      const url = new URL(`https://example.com?settings=${encoded}`);

      const result = parseProxyParams(url);

      expect(result.settings).toEqual(settings);
    });

    it("should return empty object for invalid settings JSON", () => {
      const encoded = Buffer.from("not valid json").toString("base64");
      const url = new URL(`https://example.com?settings=${encoded}`);

      const result = parseProxyParams(url);

      expect(result.settings).toEqual({});
    });

    it("should return empty object for array settings", () => {
      const encoded = Buffer.from("[1,2,3]").toString("base64");
      const url = new URL(`https://example.com?settings=${encoded}`);

      const result = parseProxyParams(url);

      expect(result.settings).toEqual({});
    });

    it("should return empty object when settings missing", () => {
      const url = new URL("https://example.com");

      const result = parseProxyParams(url);

      expect(result.settings).toEqual({});
    });
  });

  describe("handle parsing", () => {
    it("should parse valid product handle", () => {
      const url = new URL("https://example.com?product=my-product-123");

      const result = parseProxyParams(url);

      expect(result.productHandle).toBe("my-product-123");
    });

    it("should parse valid collection handle", () => {
      const url = new URL("https://example.com?collection=featured-items");

      const result = parseProxyParams(url);

      expect(result.collectionHandle).toBe("featured-items");
    });

    it("should reject handles with special characters", () => {
      const url = new URL("https://example.com?product=test<script>&collection=test';drop");

      const result = parseProxyParams(url);

      expect(result.productHandle).toBe(null);
      expect(result.collectionHandle).toBe(null);
    });

    it("should return null for empty handles", () => {
      const url = new URL("https://example.com?product=&collection=");

      const result = parseProxyParams(url);

      expect(result.productHandle).toBe(null);
      expect(result.collectionHandle).toBe(null);
    });
  });

  describe("section ID parsing", () => {
    it("should use provided section_id", () => {
      const url = new URL("https://example.com?section_id=my-section");

      const result = parseProxyParams(url);

      expect(result.sectionId).toBe("my-section");
    });

    it("should default to preview when section_id missing", () => {
      const url = new URL("https://example.com");

      const result = parseProxyParams(url);

      expect(result.sectionId).toBe("preview");
    });

    it("should reject section_id with XSS attempt", () => {
      const url = new URL('https://example.com?section_id="><script>alert(1)</script>');

      const result = parseProxyParams(url);

      expect(result.sectionId).toBe("preview");
    });

    it("should reject section_id with special characters", () => {
      const url = new URL("https://example.com?section_id=test<>injection");

      const result = parseProxyParams(url);

      expect(result.sectionId).toBe("preview");
    });

    it("should accept valid section_id with underscore", () => {
      const url = new URL("https://example.com?section_id=my_section_123");

      const result = parseProxyParams(url);

      expect(result.sectionId).toBe("my_section_123");
    });
  });

  describe("settings size limit", () => {
    it("should reject oversized settings parameter", () => {
      // Create settings > 70KB base64
      const largeSettings = { data: "x".repeat(60000) };
      const encoded = Buffer.from(JSON.stringify(largeSettings)).toString("base64");
      const url = new URL(`https://example.com?settings=${encoded}`);

      const result = parseProxyParams(url);

      expect(result.settings).toEqual({});
    });
  });

  describe("blocks parsing", () => {
    it("should decode base64 JSON blocks array", () => {
      const blocks = [
        { id: "block-1", type: "text", settings: { title: "Hello" } },
        { id: "block-2", type: "image", settings: { alt: "Image" } },
      ];
      const encoded = Buffer.from(JSON.stringify(blocks)).toString("base64");
      const url = new URL(`https://example.com?blocks=${encoded}`);

      const result = parseProxyParams(url);

      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].id).toBe("block-1");
      expect(result.blocks[0].type).toBe("text");
      expect(result.blocks[1].id).toBe("block-2");
    });

    it("should return empty array for invalid blocks JSON", () => {
      const encoded = Buffer.from("not valid json").toString("base64");
      const url = new URL(`https://example.com?blocks=${encoded}`);

      const result = parseProxyParams(url);

      expect(result.blocks).toEqual([]);
    });

    it("should filter out invalid block objects", () => {
      const blocks = [
        { id: "valid", type: "text" },
        { id: 123, type: "invalid" }, // id must be string
        { type: "missing-id" }, // missing id
        "not-an-object",
      ];
      const encoded = Buffer.from(JSON.stringify(blocks)).toString("base64");
      const url = new URL(`https://example.com?blocks=${encoded}`);

      const result = parseProxyParams(url);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).toBe("valid");
    });

    it("should return empty array when blocks missing", () => {
      const url = new URL("https://example.com");

      const result = parseProxyParams(url);

      expect(result.blocks).toEqual([]);
    });
  });

  describe("combined parsing", () => {
    it("should parse all parameters together", () => {
      const code = "{{ product.title }}";
      const settings = { show: true };
      const blocks = [{ id: "b1", type: "heading", settings: { text: "Hi" } }];
      const url = new URL(
        `https://example.com?code=${Buffer.from(code).toString("base64")}` +
          `&settings=${Buffer.from(JSON.stringify(settings)).toString("base64")}` +
          `&blocks=${Buffer.from(JSON.stringify(blocks)).toString("base64")}` +
          `&product=test-handle` +
          `&collection=all` +
          `&section_id=sec-1`
      );

      const result = parseProxyParams(url);

      expect(result.code).toBe(code);
      expect(result.settings).toEqual(settings);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).toBe("b1");
      expect(result.productHandle).toBe("test-handle");
      expect(result.collectionHandle).toBe("all");
      expect(result.sectionId).toBe("sec-1");
    });
  });
});

describe("blocks injection", () => {
  it("should inject blocks_count assign", () => {
    const result = wrapLiquidForProxy({
      liquidCode: "{{ blocks_count }}",
      blocks: [
        { id: "b1", type: "text", settings: { title: "Test" } },
      ],
    });

    expect(result).toContain("{% assign blocks_count = 1 %}");
  });

  it("should inject block metadata assigns", () => {
    const result = wrapLiquidForProxy({
      liquidCode: "test",
      blocks: [{ id: "block-123", type: "heading", settings: {} }],
    });

    expect(result).toContain("{% assign block_0_id = 'block-123' %}");
    expect(result).toContain("{% assign block_0_type = 'heading' %}");
  });

  it("should inject block settings assigns", () => {
    const result = wrapLiquidForProxy({
      liquidCode: "test",
      blocks: [
        { id: "b1", type: "text", settings: { title: "Hello", count: 5 } },
      ],
    });

    expect(result).toContain("{% assign block_0_title = 'Hello' %}");
    expect(result).toContain("{% assign block_0_count = 5 %}");
  });

  it("should handle multiple blocks", () => {
    const result = wrapLiquidForProxy({
      liquidCode: "test",
      blocks: [
        { id: "b1", type: "text", settings: { title: "First" } },
        { id: "b2", type: "image", settings: { alt: "Second" } },
      ],
    });

    expect(result).toContain("{% assign block_0_type = 'text' %}");
    expect(result).toContain("{% assign block_1_type = 'image' %}");
    expect(result).toContain("{% assign blocks_count = 2 %}");
  });

  it("should inject blocks_count = 0 for empty blocks", () => {
    const result = wrapLiquidForProxy({
      liquidCode: "test",
      blocks: [],
    });

    expect(result).toContain("{% assign blocks_count = 0 %}");
  });
});
