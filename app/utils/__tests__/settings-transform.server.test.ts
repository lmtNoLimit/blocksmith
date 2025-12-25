import {
  generateSettingsAssigns,
  generateBlocksAssigns,
  rewriteSectionSettings,
  rewriteBlocksIteration,
} from "../settings-transform.server";

describe("generateSettingsAssigns", () => {
  describe("string settings", () => {
    it("should generate assign for string value", () => {
      const assigns = generateSettingsAssigns({ title: "Hello World" });

      expect(assigns).toContain("{% assign settings_title = 'Hello World' %}");
    });

    it("should escape single quotes in strings", () => {
      const assigns = generateSettingsAssigns({ text: "It's a test" });

      expect(assigns).toContain("{% assign settings_text = 'It\\'s a test' %}");
    });

    it("should escape backslashes in strings", () => {
      const assigns = generateSettingsAssigns({ path: "C:\\Users\\test" });

      expect(assigns).toContain("{% assign settings_path = 'C:\\\\Users\\\\test' %}");
    });

    it("should escape newlines in strings", () => {
      const assigns = generateSettingsAssigns({ multiline: "line1\nline2" });

      expect(assigns).toContain("{% assign settings_multiline = 'line1\\nline2' %}");
    });
  });

  describe("number settings", () => {
    it("should generate assign for integer", () => {
      const assigns = generateSettingsAssigns({ columns: 3 });

      expect(assigns).toContain("{% assign settings_columns = 3 %}");
    });

    it("should generate assign for float", () => {
      const assigns = generateSettingsAssigns({ opacity: 0.5 });

      expect(assigns).toContain("{% assign settings_opacity = 0.5 %}");
    });

    it("should generate assign for negative number", () => {
      const assigns = generateSettingsAssigns({ offset: -10 });

      expect(assigns).toContain("{% assign settings_offset = -10 %}");
    });
  });

  describe("boolean settings", () => {
    it("should generate assign for true", () => {
      const assigns = generateSettingsAssigns({ show_title: true });

      expect(assigns).toContain("{% assign settings_show_title = true %}");
    });

    it("should generate assign for false", () => {
      const assigns = generateSettingsAssigns({ hide_footer: false });

      expect(assigns).toContain("{% assign settings_hide_footer = false %}");
    });
  });

  describe("null/undefined settings", () => {
    it("should generate nil for null value", () => {
      const assigns = generateSettingsAssigns({ empty: null as unknown as string });

      expect(assigns).toContain("{% assign settings_empty = nil %}");
    });

    it("should generate nil for undefined value", () => {
      const assigns = generateSettingsAssigns({ missing: undefined as unknown as string });

      expect(assigns).toContain("{% assign settings_missing = nil %}");
    });
  });

  describe("key sanitization", () => {
    it("should skip keys starting with numbers", () => {
      const assigns = generateSettingsAssigns({
        "123invalid": "value",
        valid_key: "value2",
      });

      expect(assigns.join("\n")).not.toContain("123invalid");
      expect(assigns).toContain("{% assign settings_valid_key = 'value2' %}");
    });

    it("should replace special characters with underscore", () => {
      const assigns = generateSettingsAssigns({ "my-key": "value" });

      expect(assigns).toContain("{% assign settings_my_key = 'value' %}");
    });

    it("should accept underscore-prefixed keys", () => {
      const assigns = generateSettingsAssigns({ _private: "secret" });

      expect(assigns).toContain("{% assign settings__private = 'secret' %}");
    });
  });

  describe("complex types", () => {
    it("should skip array values", () => {
      const assigns = generateSettingsAssigns({
        items: ["a", "b"] as unknown as string,
      });

      expect(assigns.join("\n")).not.toContain("items");
    });

    it("should skip object values", () => {
      const assigns = generateSettingsAssigns({
        nested: { key: "value" } as unknown as string,
      });

      expect(assigns.join("\n")).not.toContain("nested");
    });
  });
});

describe("generateBlocksAssigns", () => {
  describe("empty blocks", () => {
    it("should return blocks_count = 0 for empty array", () => {
      const assigns = generateBlocksAssigns([]);

      expect(assigns).toEqual(["{% assign blocks_count = 0 %}"]);
    });
  });

  describe("single block", () => {
    it("should generate block metadata", () => {
      const assigns = generateBlocksAssigns([
        { id: "block-1", type: "heading", settings: {} },
      ]);

      expect(assigns).toContain("{% assign block_0_id = 'block-1' %}");
      expect(assigns).toContain("{% assign block_0_type = 'heading' %}");
      expect(assigns).toContain("{% assign blocks_count = 1 %}");
    });

    it("should generate block settings", () => {
      const assigns = generateBlocksAssigns([
        { id: "b1", type: "text", settings: { title: "Hello", visible: true } },
      ]);

      expect(assigns).toContain("{% assign block_0_title = 'Hello' %}");
      expect(assigns).toContain("{% assign block_0_visible = true %}");
    });
  });

  describe("multiple blocks", () => {
    it("should generate numbered assigns for each block", () => {
      const assigns = generateBlocksAssigns([
        { id: "b1", type: "heading", settings: { text: "Title" } },
        { id: "b2", type: "paragraph", settings: { text: "Body" } },
        { id: "b3", type: "button", settings: { label: "Click" } },
      ]);

      expect(assigns).toContain("{% assign block_0_type = 'heading' %}");
      expect(assigns).toContain("{% assign block_0_text = 'Title' %}");
      expect(assigns).toContain("{% assign block_1_type = 'paragraph' %}");
      expect(assigns).toContain("{% assign block_1_text = 'Body' %}");
      expect(assigns).toContain("{% assign block_2_type = 'button' %}");
      expect(assigns).toContain("{% assign block_2_label = 'Click' %}");
      expect(assigns).toContain("{% assign blocks_count = 3 %}");
    });
  });

  describe("block value escaping", () => {
    it("should escape block id with special chars", () => {
      const assigns = generateBlocksAssigns([
        { id: "block's-id", type: "text", settings: {} },
      ]);

      expect(assigns).toContain("{% assign block_0_id = 'block\\'s-id' %}");
    });

    it("should escape block setting strings", () => {
      const assigns = generateBlocksAssigns([
        { id: "b1", type: "text", settings: { quote: "He said 'hello'" } },
      ]);

      expect(assigns).toContain("{% assign block_0_quote = 'He said \\'hello\\'' %}");
    });
  });
});

describe("rewriteSectionSettings", () => {
  it("should rewrite section.settings.X to settings_X in output tags", () => {
    const code = "{{ section.settings.title }}";
    const result = rewriteSectionSettings(code);

    expect(result).toBe("{{ settings_title }}");
  });

  it("should rewrite section.settings in if tags", () => {
    const code = "{% if section.settings.show %}visible{% endif %}";
    const result = rewriteSectionSettings(code);

    expect(result).toBe("{% if settings_show %}visible{% endif %}");
  });

  it("should rewrite multiple occurrences", () => {
    const code = `
{{ section.settings.title }}
{% if section.settings.show_vendor %}
  {{ section.settings.vendor_text }}
{% endif %}
`;
    const result = rewriteSectionSettings(code);

    expect(result).toContain("{{ settings_title }}");
    expect(result).toContain("{% if settings_show_vendor %}");
    expect(result).toContain("{{ settings_vendor_text }}");
  });

  it("should not rewrite non-matching patterns", () => {
    const code = "{{ product.title }} {{ collection.settings }}";
    const result = rewriteSectionSettings(code);

    expect(result).toBe(code);
  });

  it("should handle underscore in setting names", () => {
    const code = "{{ section.settings.show_add_to_cart }}";
    const result = rewriteSectionSettings(code);

    expect(result).toBe("{{ settings_show_add_to_cart }}");
  });

  it("should rewrite bracket notation with single quotes", () => {
    const code = "{{ section.settings['title'] }}";
    const result = rewriteSectionSettings(code);

    expect(result).toBe("{{ settings_title }}");
  });

  it("should rewrite bracket notation with double quotes", () => {
    const code = '{% if section.settings["show"] %}';
    const result = rewriteSectionSettings(code);

    expect(result).toBe("{% if settings_show %}");
  });

  it("should preserve filter chains after rewrite", () => {
    const code = "{{ section.settings.title | upcase | truncate: 20 }}";
    const result = rewriteSectionSettings(code);

    expect(result).toBe("{{ settings_title | upcase | truncate: 20 }}");
  });
});

describe("rewriteBlocksIteration", () => {
  describe("simple for loops", () => {
    it("should unroll simple for block loop", () => {
      const code = `{% for block in section.blocks %}
  <div>{{ block.settings.title }}</div>
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 3);

      expect(result).toContain("{% if blocks_count > 0 %}");
      expect(result).toContain("{{ block_0_title }}");
      expect(result).toContain("{% if blocks_count > 1 %}");
      expect(result).toContain("{{ block_1_title }}");
      expect(result).toContain("{% if blocks_count > 2 %}");
      expect(result).toContain("{{ block_2_title }}");
    });

    it("should handle whitespace control syntax", () => {
      const code = `{%- for block in section.blocks -%}
  <div>{{ block.settings.text }}</div>
{%- endfor -%}`;
      const result = rewriteBlocksIteration(code, 2);

      expect(result).toContain("{% if blocks_count > 0 %}");
      expect(result).toContain("{{ block_0_text }}");
      expect(result).toContain("{% if blocks_count > 1 %}");
      expect(result).toContain("{{ block_1_text }}");
    });

    it("should preserve content outside for loops", () => {
      const code = `<div class="header">Title</div>
{% for block in section.blocks %}
  <div>{{ block.settings.content }}</div>
{% endfor %}
<div class="footer">Footer</div>`;
      const result = rewriteBlocksIteration(code, 2);

      expect(result).toContain('<div class="header">Title</div>');
      expect(result).toContain('<div class="footer">Footer</div>');
    });
  });

  describe("block.settings transformation", () => {
    it("should transform block.settings.property to block_N_property", () => {
      const code = `{% for block in section.blocks %}
  {{ block.settings.heading }}
  {{ block.settings.description }}
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      expect(result).toContain("{{ block_0_heading }}");
      expect(result).toContain("{{ block_0_description }}");
      expect(result).toContain("{{ block_1_heading }}");
      expect(result).toContain("{{ block_1_description }}");
    });

    it("should transform bracket notation with single quotes", () => {
      const code = `{% for block in section.blocks %}
  {{ block.settings['title'] }}
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      expect(result).toContain("{{ block_0_title }}");
      expect(result).toContain("{{ block_1_title }}");
    });

    it("should transform bracket notation with double quotes", () => {
      const code = `{% for block in section.blocks %}
  {{ block.settings["title"] }}
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      expect(result).toContain("{{ block_0_title }}");
      expect(result).toContain("{{ block_1_title }}");
    });
  });

  describe("block.type and block.id transformation", () => {
    it("should transform block.type to block_N_type", () => {
      const code = `{% for block in section.blocks %}
  {% if block.type == 'heading' %}
    <h2>{{ block.settings.text }}</h2>
  {% endif %}
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      expect(result).toContain("{% if block_0_type == 'heading' %}");
      expect(result).toContain("{% if block_1_type == 'heading' %}");
    });

    it("should transform block.id to block_N_id", () => {
      const code = `{% for block in section.blocks %}
  <div id="{{ block.id }}">{{ block.settings.title }}</div>
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      expect(result).toContain('id="{{ block_0_id }}"');
      expect(result).toContain('id="{{ block_1_id }}"');
    });
  });

  describe("custom block variable names", () => {
    it("should handle custom variable name like b", () => {
      const code = `{% for b in section.blocks %}
  {{ b.settings.title }}
  {{ b.type }}
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      expect(result).toContain("{{ block_0_title }}");
      expect(result).toContain("{{ block_0_type }}");
      expect(result).toContain("{{ block_1_title }}");
      expect(result).toContain("{{ block_1_type }}");
    });

    it("should handle custom variable name like item", () => {
      const code = `{% for item in section.blocks %}
  {{ item.settings.text }}
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      expect(result).toContain("{{ block_0_text }}");
      expect(result).toContain("{{ block_1_text }}");
    });
  });

  describe("edge cases", () => {
    it("should return unchanged code if no for block loop", () => {
      const code = "{{ section.settings.title }}";
      const result = rewriteBlocksIteration(code);

      expect(result).toBe(code);
    });

    it("should handle multiple for loops", () => {
      const code = `{% for block in section.blocks %}
  {{ block.settings.title }}
{% endfor %}
<hr>
{% for block in section.blocks %}
  {{ block.settings.description }}
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      // Both loops should be unrolled
      const occurrences = (result.match(/blocks_count > 0/g) || []).length;
      expect(occurrences).toBe(2);
    });

    it("should handle loop with filters", () => {
      const code = `{% for block in section.blocks %}
  {{ block.settings.title | upcase }}
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      expect(result).toContain("{{ block_0_title | upcase }}");
      expect(result).toContain("{{ block_1_title | upcase }}");
    });

    it("should default to 10 max blocks", () => {
      const code = `{% for block in section.blocks %}
  {{ block.settings.x }}
{% endfor %}`;
      const result = rewriteBlocksIteration(code);

      expect(result).toContain("{% if blocks_count > 9 %}");
      expect(result).not.toContain("{% if blocks_count > 10 %}");
    });

    it("should handle empty loop body", () => {
      const code = `{% for block in section.blocks %}{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      expect(result).toContain("{% if blocks_count > 0 %}");
      expect(result).toContain("{% endif %}");
    });

    it("should skip transformation for nested for loops", () => {
      const code = `{% for block in section.blocks %}
  {% for item in collection.products %}
    {{ block.settings.title }}
  {% endfor %}
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      // Should return original code unchanged due to nested loop
      expect(result).toBe(code);
    });

    it("should skip transformation for nested section.blocks loops", () => {
      const code = `{% for block in section.blocks %}
  {% for inner in section.blocks %}
    {{ block.settings.title }}
  {% endfor %}
{% endfor %}`;
      const result = rewriteBlocksIteration(code, 2);

      // Should return original code unchanged due to nested loop
      expect(result).toBe(code);
    });
  });
});
