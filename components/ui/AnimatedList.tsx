"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

type AnimatedItemProps = {
  children: ReactNode;
  delay?: number;
  index: number;
  onMouseEnter: () => void;
  onClick: () => void;
  className?: string;
};

function AnimatedItem({ children, delay = 0, index, onMouseEnter, onClick, className }: AnimatedItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });

  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, delay }}
      className={cn("mb-3 cursor-pointer last:mb-0", className)}
    >
      {children}
    </motion.div>
  );
}

type AnimatedListProps<T> = {
  items?: T[];
  onItemSelect?: (item: T, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  listClassName?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
  maxVisibleItems?: number;
  emptyState?: ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  renderItem?: (item: T, index: number, selected: boolean) => ReactNode;
};

const defaultItems = [
  "Item 1",
  "Item 2",
  "Item 3",
  "Item 4",
  "Item 5",
  "Item 6",
  "Item 7",
  "Item 8",
  "Item 9",
  "Item 10",
  "Item 11",
  "Item 12",
  "Item 13",
  "Item 14",
  "Item 15"
];

export default function AnimatedList<T = string>({
  items = defaultItems as T[],
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  listClassName = "",
  itemClassName = "",
  displayScrollbar = true,
  initialSelectedIndex = -1,
  maxVisibleItems,
  emptyState,
  getItemKey,
  renderItem
}: AnimatedListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(0);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  const handleItemMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleItemClick = useCallback(
    (item: T, index: number) => {
      setSelectedIndex(index);
      onItemSelect?.(item, index);
    },
    [onItemSelect]
  );

  const handleScroll = useCallback(() => {
    const container = listRef.current;

    if (!container) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1));
  }, []);

  useLayoutEffect(() => {
    const container = listRef.current;

    if (!container || !maxVisibleItems || items.length <= maxVisibleItems) {
      setMaxHeight(null);
      window.requestAnimationFrame(handleScroll);
      return;
    }

    const measure = () => {
      const itemNodes = container.querySelectorAll<HTMLElement>("[data-index]");
      const first = itemNodes[0];
      const last = itemNodes[maxVisibleItems - 1];

      if (!first || !last) {
        setMaxHeight(null);
        return;
      }

      setMaxHeight(last.offsetTop + last.offsetHeight - first.offsetTop);
      window.requestAnimationFrame(handleScroll);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.querySelectorAll<HTMLElement>("[data-index]").forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [handleScroll, items.length, maxVisibleItems]);

  useEffect(() => {
    handleScroll();
  }, [handleScroll, items.length, maxHeight]);

  useEffect(() => {
    if (!enableArrowNavigation) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const container = listRef.current;

      if (!container || !container.contains(document.activeElement)) {
        return;
      }

      if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
        event.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((current) => Math.min(current + 1, items.length - 1));
      } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
        event.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((current) => Math.max(current - 1, 0));
      } else if (event.key === "Enter" && selectedIndex >= 0 && selectedIndex < items.length) {
        event.preventDefault();
        onItemSelect?.(items[selectedIndex], selectedIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableArrowNavigation, items, onItemSelect, selectedIndex]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) {
      return;
    }

    const container = listRef.current;
    const selectedItem = container.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);

    if (selectedItem) {
      const extraMargin = 50;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;

      if (itemTop < container.scrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
      } else if (itemBottom > container.scrollTop + container.clientHeight - extraMargin) {
        container.scrollTo({ top: itemBottom - container.clientHeight + extraMargin, behavior: "smooth" });
      }
    }

    setKeyboardNav(false);
  }, [keyboardNav, selectedIndex]);

  const scrollStyle: CSSProperties = {
    scrollbarWidth: displayScrollbar ? "thin" : "none",
    scrollbarColor: "#11110f #f6f1e7"
  };

  if (maxHeight) {
    scrollStyle.maxHeight = maxHeight;
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div
        ref={listRef}
        className={cn(
          maxHeight ? "overflow-y-auto pr-2" : "overflow-visible",
          displayScrollbar
            ? "sound-library-scroll"
            : "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          listClassName
        )}
        onScroll={handleScroll}
        style={scrollStyle}
        tabIndex={enableArrowNavigation ? 0 : undefined}
      >
        {items.length > 0
          ? items.map((item, index) => (
              <AnimatedItem
                key={getItemKey?.(item, index) ?? index}
                delay={0.1}
                index={index}
                onMouseEnter={() => handleItemMouseEnter(index)}
                onClick={() => handleItemClick(item, index)}
                className={itemClassName}
              >
                {renderItem ? (
                  renderItem(item, index, selectedIndex === index)
                ) : (
                  <div
                    className={cn(
                      "border-2 border-ink bg-white p-4 shadow-hard",
                      selectedIndex === index && "bg-bone"
                    )}
                  >
                    <p className="m-0 font-display text-sm font-black uppercase text-ink">{String(item)}</p>
                  </div>
                )}
              </AnimatedItem>
            ))
          : emptyState}
      </div>

      {showGradients ? (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-bone via-bone/80 to-transparent transition-opacity duration-300 ease-out"
            style={{ opacity: topGradientOpacity }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-bone via-bone/80 to-transparent transition-opacity duration-300 ease-out"
            style={{ opacity: bottomGradientOpacity }}
          />
        </>
      ) : null}
    </div>
  );
}
