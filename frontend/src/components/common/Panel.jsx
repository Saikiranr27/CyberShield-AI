import React, { memo } from "react";
import { COLORS } from "../../constants/theme.js";
import { cn } from "../../utils/helpers.js";

/**
 * Reusable glassmorphic panel used across the dashboard for every widget.
 * Memoized since dashboard panels re-render often while sibling state
 * (terminal logs, module status) updates on a timer.
 */
function Panel({ title, icon: Icon, iconColor, children, className = "", as: Tag = "section" }) {
  return (
    <Tag className={cn("cs-glass rounded-xl p-4 md:p-5", className)} aria-label={title}>
      {title && (
        <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-white/50 mb-4">
          {Icon && <Icon size={13} style={{ color: iconColor || COLORS.cyan }} aria-hidden="true" />}
          <h3 className="font-mono text-xs tracking-widest text-white/50 m-0">{title}</h3>
        </div>
      )}
      {children}
    </Tag>
  );
}

export default memo(Panel);
