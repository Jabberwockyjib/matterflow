"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceholderToken } from "./tiptap/placeholder-extension";
import type { JSONContent } from "@/lib/email-templates/types";

interface TiptapEditorProps {
  content: JSONContent;
  onChange: (html: string, json: JSONContent) => void;
  placeholder?: string;
}

export interface TiptapEditorHandle {
  insertPlaceholder: (token: string) => void;
}

export const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  function TiptapEditor({ content, onChange, placeholder = "Start typing..." }, ref) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-600 underline",
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
        PlaceholderToken,
      ],
      content,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        const json = editor.getJSON() as JSONContent;
        onChange(html, json);
      },
      editorProps: {
        attributes: {
          class:
            "prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none",
        },
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        insertPlaceholder: (token: string) => {
          editor?.commands.insertPlaceholder(token);
        },
      }),
      [editor]
    );

    const setLink = useCallback(() => {
      if (!editor) return;

      const previousUrl = editor.getAttributes("link").href;
      const url = window.prompt("Enter URL:", previousUrl || "https://");

      // User cancelled
      if (url === null) return;

      // Empty string removes the link
      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }

      // Set the link
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }, [editor]);

    if (!editor) {
      return (
        <div className="border rounded-md">
          <div className="border-b bg-slate-50 p-2 h-[42px]" />
          <div className="min-h-[200px] p-4 text-slate-400">Loading editor...</div>
        </div>
      );
    }

    return (
      <div className="border rounded-md">
        {/* Toolbar */}
        <div className="border-b bg-slate-50 p-1 flex items-center gap-1 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "bg-slate-200" : ""}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive("italic") ? "bg-slate-200" : ""}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive("underline") ? "bg-slate-200" : ""}
            title="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={setLink}
            className={editor.isActive("link") ? "bg-slate-200" : ""}
            title="Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive("bulletList") ? "bg-slate-200" : ""}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive("orderedList") ? "bg-slate-200" : ""}
            title="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor Content */}
        <EditorContent editor={editor} />
      </div>
    );
  }
);
