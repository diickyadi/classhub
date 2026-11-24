import type { ButtonHTMLAttributes } from "react";
import styles from "@/app/style/pic/controls.module.css";

export type PicButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "warning";

type PicButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PicButtonVariant;
  size?: "small" | "medium";
  loading?: boolean;
};

export default function PicButton({
  children,
  variant = "primary",
  size = "medium",
  type = "button",
  loading = false,
  disabled,
  className = "",
  ...buttonProps
}: PicButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {children}
    </button>
  );
}
