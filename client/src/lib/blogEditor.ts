import {
  Extension,
  nodeInputRule,
  textblockTypeInputRule,
  wrappingInputRule,
} from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { blogTypographyAttributes } from "@shared/blogTypography";

const BlogTypography = Extension.create({
  name: "blogTypography",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: Object.fromEntries(
          Object.entries(blogTypographyAttributes).map(([name, config]) => [
            name,
            {
              default: null,
              parseHTML: (element: HTMLElement) => {
                const value = element.getAttribute(config.html);
                return value &&
                  (config.values as readonly string[]).includes(value)
                  ? value
                  : null;
              },
              renderHTML: (attributes: Record<string, unknown>) => {
                const value = attributes[name];
                return typeof value === "string" &&
                  (config.values as readonly string[]).includes(value)
                  ? { [config.html]: value }
                  : {};
              },
            },
          ])
        ),
      },
    ];
  },
});

// The article title is h1; the three editor heading sizes use h2, h3 and h4.
const BlogHeading = Heading.extend({
  addInputRules() {
    return [
      textblockTypeInputRule({
        find: /^([#＃]{1,3})[ \u3000]$/,
        type: this.type,
        getAttributes: match => ({ level: match[1].length + 1 }),
      }),
    ];
  },
}).configure({ levels: [2, 3, 4] });

const JapaneseMarkdown = Extension.create({
  name: "japaneseMarkdown",
  addInputRules() {
    const { nodes } = this.editor.schema;
    return [
      wrappingInputRule({
        find: /^[-－−*＊+＋][ \u3000]$/,
        type: nodes.bulletList,
      }),
      wrappingInputRule({
        find: /^([0-9０-９]{1,4})[.．、][ \u3000]$/,
        type: nodes.orderedList,
        getAttributes: match => ({ start: Number(match[1].normalize("NFKC")) }),
        joinPredicate: (match, node) =>
          Number(match[1].normalize("NFKC")) ===
          node.attrs.start + node.childCount,
      }),
      wrappingInputRule({ find: /^[>＞][ \u3000]$/, type: nodes.blockquote }),
      textblockTypeInputRule({
        find: /^(?:`{3}|｀{3})[ \u3000]$/,
        type: nodes.codeBlock,
      }),
      nodeInputRule({
        find: /^[-－]{3}[ \u3000]$/,
        type: nodes.horizontalRule,
      }),
    ];
  },
});

export function createBlogEditorExtensions() {
  return [
    StarterKit.configure({
      heading: false,
      // Automatically appended paragraphs clear input-rule undo metadata.
      // Standard Enter/arrow-key commands already let users leave each block.
      trailingNode: false,
      // Keep the schema in sync with the PHP/Node HTML allowlists.
      underline: false,
      link: {
        openOnClick: false,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { target: null, rel: null },
      },
    }),
    BlogHeading,
    BlogTypography,
    Image.configure({ inline: true, allowBase64: false }),
    Placeholder.configure({
      placeholder: "思いついたことから、書いてみよう。",
    }),
    JapaneseMarkdown,
  ];
}
