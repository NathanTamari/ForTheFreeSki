import './PossibleTrip.css';
import estimateRoundTripGasCost from '../scripts/estimateRoundTripGasCost';
import getMultiDayTicketCost from '../scripts/getMultiDayTicketCost';
import Stars from './Stars';

// Format as $12,345.67
function currency(n) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PossibleTrip({
  name,
  drivingTime,
  ticket_cost,
  score,
  housing_cost,
  nights,
  distance_miles,
  gasPrice = 3.75,
  mpg = 28,
  avgSpeed = 55,
  guests = 1,
  hasEpicPass,
  hasIkonPass,
}) {
  const housingKnown = typeof housing_cost === 'number' && isFinite(housing_cost);
  const ticketTotal = getMultiDayTicketCost(guests, ticket_cost, nights || 1, hasEpicPass, hasIkonPass, name);
  const ticketKnown = typeof ticketTotal === 'number' && isFinite(ticketTotal);
  const gas = estimateRoundTripGasCost({
    drivingTime,
    avgSpeed,
    mpg,
    gasPrice,
    distanceMiles: typeof distance_miles === 'number' ? distance_miles : undefined,
  });

  const totalKnown = housingKnown && ticketKnown;
  const totalCost = totalKnown ? (housing_cost + ticketTotal + gas) : null;
  const costPerPerson = totalKnown && guests > 0 ? totalCost / guests : null;

  return (
    <article className="trip-card">
      <div className="card-top">
        <div className="badge">🏔️</div>
        <h3 className="title">{name}</h3>
      </div>

      <div className="chips">
        <span className="chip">🚗 {drivingTime} drive</span>
        <span className="chip">
          🎫 {ticketKnown ? currency(ticketTotal) : '—'} lift
          {nights ? ` (${nights} day${nights > 1 ? 's' : ''})` : ''}
        </span>
        <span className="chip">
          🏨 {housingKnown ? currency(housing_cost) : 'Loading…'} housing
          {nights ? ` (${nights} night${nights > 1 ? 's' : ''})` : ''}
        </span>
        <span className="chip">⛽ {currency(gas)} gas</span>
      </div>

      <Stars value={score} />

      {/* Bottom bubbles */}
      {totalKnown && (
        <>
          <div className="bubble bubble-left">
            <span className="label">Per Person</span>
            <span className="value">{currency(costPerPerson)}</span>
          </div>
          <div className="bubble bubble-right">
            <span className="label">Total Est.</span>
            <span className="value">{currency(totalCost)}</span>
          </div>
        </>
      )}
      {!totalKnown && (
        <div className="bubble bubble-right">
          <span className="label">Total Est.</span>
          <span className="value">Waiting…</span>
        </div>
      )}
    </article>
  );
}

export default PossibleTrip;
