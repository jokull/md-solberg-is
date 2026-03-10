import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * Wraps <table> elements in a scrollable <div> so wide tables
 * scroll horizontally on mobile instead of breaking word layout.
 */
export function rehypeWrapTables() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (
        node.tagName === "table" &&
        parent &&
        typeof index === "number"
      ) {
        const wrapper: Element = {
          type: "element",
          tagName: "div",
          properties: { className: ["table-scroll"] },
          children: [node],
        };
        parent.children[index] = wrapper;
      }
    });
  };
}
