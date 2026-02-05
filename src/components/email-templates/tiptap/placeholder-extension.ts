import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PlaceholderNodeView } from "./placeholder-node-view";

export interface PlaceholderOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    placeholderToken: {
      insertPlaceholder: (token: string) => ReturnType;
    };
  }
}

export const PlaceholderToken = Node.create<PlaceholderOptions>({
  name: "placeholderToken",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      token: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-token"),
        renderHTML: (attributes: { token: string }) => ({
          "data-token": attributes.token,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="placeholder"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        { "data-type": "placeholder" },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      `{{${node.attrs.token}}}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PlaceholderNodeView);
  },

  addCommands() {
    return {
      insertPlaceholder:
        (token: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { token },
          });
        },
    };
  },
});
