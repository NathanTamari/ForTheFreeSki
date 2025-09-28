import "./SubmitPage.css";
import { useState, useEffect, useMemo, useRef } from "react";
import dayjs from "dayjs";
import { calculateResortsDriving } from "../scripts/drivingTimeLogic";
import PossibleTrip from "../components/PossibleTrip";
import SortByDropdown from "../components/SortByDropdown";
import usePredictPrice from "../scripts/predict-price";
import AOS from "aos";
import SkeletonCard from "../components/SkeletonCard";
import "aos/dist/aos.css";
import submitVideo from "../media/submit-page-backdrop.mp4";
import estimateRoundTripGasCostLocal from "../scripts/estimateRoundTripGasCost";
import getMultiDayTicketCostLocal from "../scripts/getMultiDayTicketCost";
import { AnimatedOnMount, applySortInline, sameOrder, mapWithConcurrency, getResortKey, FilterToggles } from "../scripts/submitPageHelpers";

const PREDICT_CONCURRENCY = Number(
  process.env.REACT_APP_PRICE_CONCURRENCY || 3
);

function SubmitPage({ data, onBack }) {
  const [resorts, setResorts] = useState(() =>
    calculateResortsDriving(data.Region, data["Zip Code"])
  );

  const [prices, setPrices] = useState({});
  const [displayedKeys, setDisplayedKeys] = useState([]);
  const [pendingKeys, setPendingKeys] = useState([]);
  const [includeSmall, setIncludeSmall] = useState(true);

  const [sortKey, setSortKey] = useState("Relevant");
  const [sortDir, setSortDir] = useState("asc");

  const pendingRef = useRef([]);
  const processingRef = useRef(false);
  const timerRef = useRef(null);
  const inflightRef = useRef(new Set());
  const pricesRef = useRef(prices);

  const { predict } = usePredictPrice();
  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: "ease-out",
      once: true,
    });
  }, []);

  const nights = useMemo(() => {
    const n = dayjs(data.checkOut).diff(dayjs(data.checkIn), "day");
    return Math.max(1, n || 1);
  }, [data.checkIn, data.checkOut]);

  const getTotalCostForResort = (r) => {
    const key = getResortKey(r);
    const housing = prices[key];
    const housingKnown = typeof housing === "number" && isFinite(housing);
    const ticket = getMultiDayTicketCostLocal(r.ticket_cost, nights);
    const ticketKnown = typeof ticket === "number" && isFinite(ticket);
    if (!housingKnown || !ticketKnown) return Number.POSITIVE_INFINITY;

    const gas = estimateRoundTripGasCostLocal({
      drivingTime: r.drivingTime,
      distanceMiles:
        typeof r.distance_miles === "number" ? r.distance_miles : undefined,
    });
    const total = housing + ticket + gas;
    return Number.isFinite(total) ? total : Number.POSITIVE_INFINITY;
  };

  const visibleResorts = useMemo(() => {
    if (includeSmall) return resorts;
    return resorts.filter((r) => (r?.popularity ?? 0) > 1.5);
  }, [resorts, includeSmall]);

  const guests = data.Guests;
  const checkIn = data.checkIn;
  const checkOut = data.checkOut;

  useEffect(() => {
    if (!resorts || resorts.length === 0) return;

    let mounted = true;
    const ac = new AbortController(); 

    const missing = resorts.filter((r) => {
      const k = getResortKey(r);
      return !(k in pricesRef.current) && !inflightRef.current.has(k);
    });
    if (missing.length === 0) return;

    (async () => {
      await mapWithConcurrency(missing, PREDICT_CONCURRENCY, async (r) => {
        const key = getResortKey(r);

        if (r.latitude == null || r.longitude == null) {
          if (mounted) {
            setPrices((prev) => {
              const next = { ...prev, [key]: null };
              window.__prices = next;
              return next;
            });
          }
          return null;
        }

        inflightRef.current.add(key);
        const res = await predict({
          lat: r.latitude,
          long: r.longitude,
          guests,
          checkIn,
          checkOut,
          signal: ac.signal,
        });

        if (mounted) {
          const value =
            typeof res === "object" ? (res.ok ? res.price : null) : res;
          setPrices((prev) => {
            const next = { ...prev, [key]: value };
            window.__prices = next;
            return next;
          });
        }
        inflightRef.current.delete(key);
        return null;
      });
    })();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, [resorts, guests, checkIn, checkOut, predict]);

  // Enqueue newly priced cards
  useEffect(() => {
    const shown = new Set(displayedKeys);
    const queued = new Set(pendingRef.current);
    const newlyReady = [];

    for (const [key, price] of Object.entries(prices)) {
      const priced = typeof price === "number" && isFinite(price);
      if (priced && !shown.has(key) && !queued.has(key)) newlyReady.push(key);
    }

    if (newlyReady.length) {
      pendingRef.current = [...pendingRef.current, ...newlyReady];
      setPendingKeys(pendingRef.current);
    }
  }, [prices, displayedKeys]);

  // Reveal at most one every 0.35s
  useEffect(() => {
    if (processingRef.current) return;
    if (pendingRef.current.length === 0) return;

    processingRef.current = true;

    const processNext = () => {
      if (pendingRef.current.length === 0) {
        processingRef.current = false;
        return;
      }
      const nextKey = pendingRef.current.shift();
      setDisplayedKeys((prev) =>
        prev.includes(nextKey) ? prev : [...prev, nextKey]
      );
      setPendingKeys([...pendingRef.current]);

      timerRef.current = setTimeout(processNext, 350);
    };

    processNext();

    return () => {
      processingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pendingKeys]);

  // Initial sort once
  useEffect(() => {
    setResorts((prev) =>
      applySortInline(prev, sortKey, sortDir, getTotalCostForResort)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply sorting whenever prices/sort/nights change
  useEffect(() => {
    if (!resorts || resorts.length === 0) return;
    setResorts((prev) => {
      const next = applySortInline(prev, sortKey, sortDir, getTotalCostForResort);
      return sameOrder(prev, next) ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices, sortKey, sortDir, nights]);

  const handleSortChange = (_title, payload) => {
    const key = typeof payload === "string" ? payload : payload?.key;
    const dir = typeof payload === "string" ? sortDir : payload?.direction || "asc";
    setSortKey(key);
    setSortDir(dir);
    setResorts((prev) => applySortInline(prev, key, dir, getTotalCostForResort));
  };

  const header = useMemo(() => {
    const displayRegion = data.Region === "All" ? "U.S." : data.Region;
    let h = `Available ski trips in the ${displayRegion}`;
    h += data["Zip Code"] ? ` leaving from ${data["Zip Code"]}` : "";
    return h;
  }, [data]);

  const subheader = `${data.checkIn} → ${data.checkOut} • ${
    data.Guests
  } ${data.Guests === 1 ? "guest" : "guests"}`;

  return (
    <div className="submit-outer">
      <div className="submit-video-container" aria-hidden="true">
        <video autoPlay muted loop playsInline>
          <source src={submitVideo} type="video/mp4" />
        </video>
        <div className="submit-video-overlay" />
      </div>

      <div className="submit-page theme-alpine-plus">
        <div className="title-bar">
          <button className="back-btn" onClick={onBack}>← Back</button>
          <h2 className="hero-title">{header}</h2>
        </div>

        <div className="hero-sub">{subheader}</div>
        <div className="hero-sub">Note: queries can take up to a minute if the server has not been started in a while.</div>
        <div className="hero-controls">
          <div className="controls-row">
            <span className="sort-label" style={{ opacity: 0.9 }}>
              Sort By:
            </span>
            <SortByDropdown
              options={["Relevant", "Distance", "Price", "Most Trails"]}
              value={sortKey}
              direction={sortDir}
              onChange={handleSortChange}
              tone="onDark"
            />
            <span className="flake" aria-hidden="true">
              ❄︎
            </span>
          </div>

          <FilterToggles
            toggles={[
              { key: "includeSmall", label: "Include small mountains", checked: includeSmall },
            ]}
            onToggle={(key, checked) => {
              if (key === "includeSmall") setIncludeSmall(checked);
            }}
          />
        </div>

        {visibleResorts.length > 0 ? (
          <div className="resort-grid">
            {visibleResorts
              .filter((r) => displayedKeys.includes(getResortKey(r)))
              .map((r) => {
                const key = getResortKey(r);
                const price = prices[key];

                return (
                  <AnimatedOnMount key={key}>
                    <PossibleTrip
                      name={r.name}
                      drivingTime={r.drivingTime}
                      ticket_cost={r.ticket_cost} 
                      score={r.popularity}
                      housing_cost={price ?? "…"} 
                      nights={nights}
                      guests={data.Guests}
                    />
                  </AnimatedOnMount>
                );
              })}

            {(() => {
              const remaining = visibleResorts.length - displayedKeys.length;
              const count = Math.min(3, Math.max(0, remaining));
              return Array.from({ length: count }).map((_, i) => (
                <div key={`sk-bottom-${i}`} className="skeleton-at-end">
                  <SkeletonCard />
                </div>
              ));
            })()}
          </div>
        ) : (
          <div>
            <h1>Invalid zip code. try again</h1>
          </div>
        )}
      </div>
    </div>
  );
}

export default SubmitPage;