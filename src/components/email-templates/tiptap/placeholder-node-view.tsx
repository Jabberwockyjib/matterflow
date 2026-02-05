"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { PLACEHOLDER_TOKENS } from "@/lib/email-templates/placeholders";

interface PlaceholderAttributes {
  token: string;
}

export function PlaceholderNodeView({ node }: NodeViewProps) {
  const attrs = node.attrs as PlaceholderAttributes;
  const token = attrs.token;
  const placeholder = PLACEHOLDER_TOKENS.find((p) => p.token === token);

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-default"
        title={placeholder?.description || token}
      >
        {placeholder?.label || token}
      </span>
    </NodeViewWrapper>
  );
}
