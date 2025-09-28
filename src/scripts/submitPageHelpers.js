import { useEffect, useRef } from "react";
import AOS from "aos";
import { sort_resorts } from "./sort";

/* =========================
   Concurrency helper
   ========================= */
export async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) break;
        results[idx] = await mapper(items[idx], idx);
      }
    });
  await Promise.all(workers);
  return results;
}

/* =========================
   Sorting helpers
   ========================= */
export function getResortKey(r) {
  return r?.id ?? `${r?.name}|${r?.latitude}|${r?.longitude}`;
}

export function applySortInline(list, key, dir, getTotalCostForResort) {
  const sorted = sort_resorts(list, key, getTotalCostForResort);
  return dir === "desc" ? [...sorted].reverse() : sorted;
}

export function sameOrder(a, b, keyFn = getResortKey) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (keyFn(a[i]) !== keyFn(b[i])) return false;
  }
  return true;
}

/* =========================
   AnimatedOnMount (React component)
   ========================= */
export function AnimatedOnMount({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.setAttribute("data-aos", "zoom-in");
    el.setAttribute("data-aos-once", "true");
    el.setAttribute("data-aos-duration", "800");

    el.classList.add("aos-init");
    requestAnimationFrame(() => {
      el.classList.add("aos-animate");
    });

    // Recompute positions after attaching attributes
    AOS.refreshHard();
  }, []);

  return <div ref={ref}>{children}</div>;
}


export function FilterToggles({ toggles, onToggle }) {
  return (
    <div className="filter-toggles">
      {toggles.map((t) => (
      <label key={t.key} className="filter-toggle-pill">
        <input
        type="checkbox"
        checked={!!t.checked}
        onChange={(e) => onToggle(t.key, e.target.checked)}
        />
        {t.label}
      </label>
      ))}
    </div>
  );
  }
