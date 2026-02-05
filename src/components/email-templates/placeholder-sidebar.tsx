"use client";

import { cn } from "@/lib/utils";
import type { EmailTemplateType } from "@/lib/email-templates/types";
import {
  getAvailablePlaceholders,
  getUnavailablePlaceholders,
  groupPlaceholdersByCategory,
  PLACEHOLDER_CATEGORY_LABELS,
  type PlaceholderCategory,
  type PlaceholderToken,
} from "@/lib/email-templates/placeholders";

interface PlaceholderSidebarProps {
  emailType: EmailTemplateType;
  onInsert: (token: string) => void;
}

/**
 * Sidebar component displaying available placeholder tokens for the email editor.
 * Shows available tokens as clickable buttons grouped by category, with unavailable
 * tokens displayed grayed out at the bottom.
 */
export function PlaceholderSidebar({
  emailType,
  onInsert,
}: PlaceholderSidebarProps) {
  const availableTokens = getAvailablePlaceholders(emailType);
  const unavailableTokens = getUnavailablePlaceholders(emailType);

  const groupedAvailable = groupPlaceholdersByCategory(availableTokens);
  const groupedUnavailable = groupPlaceholdersByCategory(unavailableTokens);

  // Get categories that have available tokens
  const availableCategories = (
    Object.keys(groupedAvailable) as PlaceholderCategory[]
  ).filter((cat) => groupedAvailable[cat].length > 0);

  // Get categories that have unavailable tokens
  const unavailableCategories = (
    Object.keys(groupedUnavailable) as PlaceholderCategory[]
  ).filter((cat) => groupedUnavailable[cat].length > 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900">Placeholders</h3>
        <p className="mt-1 text-sm text-slate-500">
          Click to insert into the editor
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Available placeholders by category */}
        {availableCategories.map((category) => (
          <PlaceholderCategory
            key={category}
            label={PLACEHOLDER_CATEGORY_LABELS[category]}
            tokens={groupedAvailable[category]}
            onInsert={onInsert}
            disabled={false}
          />
        ))}

        {/* Unavailable placeholders section */}
        {unavailableCategories.length > 0 && (
          <>
            {/* Separator */}
            <div className="my-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">Not available</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Unavailable tokens by category */}
            {unavailableCategories.map((category) => (
              <PlaceholderCategory
                key={`unavailable-${category}`}
                label={PLACEHOLDER_CATEGORY_LABELS[category]}
                tokens={groupedUnavailable[category]}
                onInsert={onInsert}
                disabled={true}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

interface PlaceholderCategoryProps {
  label: string;
  tokens: PlaceholderToken[];
  onInsert: (token: string) => void;
  disabled: boolean;
}

/**
 * A category section containing placeholder token buttons
 */
function PlaceholderCategory({
  label,
  tokens,
  onInsert,
  disabled,
}: PlaceholderCategoryProps) {
  if (tokens.length === 0) return null;

  return (
    <div className="mb-4">
      <h4
        className={cn(
          "mb-2 text-xs font-medium uppercase tracking-wide",
          disabled ? "text-slate-300" : "text-slate-500"
        )}
      >
        {label}
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map((token) => (
          <PlaceholderButton
            key={token.token}
            token={token}
            onClick={() => onInsert(token.token)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

interface PlaceholderButtonProps {
  token: PlaceholderToken;
  onClick: () => void;
  disabled: boolean;
}

/**
 * A clickable placeholder token button with tooltip
 */
function PlaceholderButton({ token, onClick, disabled }: PlaceholderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={token.description}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        disabled
          ? "cursor-not-allowed bg-slate-100 text-slate-400"
          : "bg-blue-100 text-blue-700 hover:bg-blue-200 active:bg-blue-300"
      )}
    >
      {token.label}
    </button>
  );
}
