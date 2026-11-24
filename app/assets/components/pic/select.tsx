"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronDown, Check } from "lucide-react";
import styles from "@/app/style/pic/controls.module.css";

export type PicSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type PicSelectProps = {
  id?: string;
  value: string;
  options: PicSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  required?: boolean;
  width?: "full" | "auto";
};

export default function PicSelect({
  id,
  value,
  options,
  onValueChange,
  placeholder = "Pilih pilihan",
  ariaLabel,
  disabled = false,
  width = "auto",
}: PicSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const selectedOption = options.find(
    (option) => option.value === value
  );

  function openMenu() {
    if (disabled || options.length === 0) return;

    const selectedIndex = options.findIndex(
      (option) => option.value === value && !option.disabled
    );

    const firstEnabled = options.findIndex(
      (option) => !option.disabled
    );

    setActiveIndex(
      selectedIndex >= 0 ? selectedIndex : Math.max(firstEnabled, 0)
    );
    setIsOpen(true);
  }

  function selectOption(option: PicSelectOption) {
    if (option.disabled) return;

    onValueChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [isOpen, activeIndex]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (event.key === "Tab") {
      setIsOpen(false);
      return;
    }

    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp"
    ) {
      event.preventDefault();

      const direction = event.key === "ArrowDown" ? 1 : -1;
      let nextIndex = activeIndex;

      for (let attempt = 0; attempt < options.length; attempt++) {
        nextIndex =
          (nextIndex + direction + options.length) % options.length;

        if (!options[nextIndex].disabled) break;
      }

      setActiveIndex(nextIndex);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();

      const enabledIndexes = options
        .map((option, index) => ({ option, index }))
        .filter(({ option }) => !option.disabled)
        .map(({ index }) => index);

      if (enabledIndexes.length > 0) {
        setActiveIndex(
          event.key === "Home"
            ? enabledIndexes[0]
            : enabledIndexes[enabledIndexes.length - 1]
        );
      }
    }
  }

  const wrapperClass = [
    styles.selectWrapper,
    width === "full" ? styles.selectWrapperFull : "",
  ].filter(Boolean).join(" ");

  return (
    <div ref={wrapperRef} className={wrapperClass}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => isOpen ? setIsOpen(false) : openMenu()}
        className={`${styles.selectButton} ${
          isOpen ? styles.selectButtonOpen : ""
        }`}
      >
        <span>{selectedOption?.label ?? placeholder}</span>

        <ChevronDown
          size={17}
          className={isOpen ? styles.selectIconOpen : styles.selectIcon}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="listbox"
          aria-label={ariaLabel ?? placeholder}
          className={styles.selectMenu}
          onKeyDown={handleKeyDown}
        >
          {options.map((option, index) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                tabIndex={activeIndex === index ? 0 : -1}
                className={`${styles.selectOption} ${
                  selected ? styles.selectOptionSelected : ""
                }`}
                onClick={() => selectOption(option)}
              >
                <span>{option.label}</span>

                {selected && (
                  <Check size={16} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
