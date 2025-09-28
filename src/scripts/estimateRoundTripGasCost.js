// ======= Tunables for gas estimate (can be overridden via props) =======
const DEFAULT_AVG_GAS_PRICE = 3.75; // $/gal
const DEFAULT_CAR_MPG = 28;         // miles per gallon
const DEFAULT_AVG_SPEED = 55;       // mph (used when distance is unknown)
// ======================================================================
// Estimate round-trip gas cost from driving time (or distance if provided)
// Parse strings like "3 hr 20 min", "2h", "4 hours 5 minutes" → hours as Number
function parseDrivingHours(str) {
  if (typeof str === 'number') return str;
  if (!str || typeof str !== 'string') return 0;
  const s = str.toLowerCase();
  const hrMatch = s.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)/);
  const minMatch = s.match(/(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)/);

  let hours = 0;
  if (hrMatch) hours += parseFloat(hrMatch[1]);
  if (minMatch) hours += parseFloat(minMatch[1]) / 60;

  // fallback "3:30" => 3.5
  if (!hrMatch && !minMatch) {
    const colon = s.match(/(\d+):(\d{1,2})/);
    if (colon) {
      hours = parseInt(colon[1], 10) + parseInt(colon[2], 10) / 60;
    }
  }

  return isNaN(hours) ? 0 : hours;
}


function estimateRoundTripGasCost({
  drivingTime,
  avgSpeed = DEFAULT_AVG_SPEED,
  mpg = DEFAULT_CAR_MPG,
  gasPrice = DEFAULT_AVG_GAS_PRICE,
  distanceMiles,
}) {
  let oneWayMiles = 0;

  if (typeof distanceMiles === 'number' && distanceMiles > 0) {
    oneWayMiles = distanceMiles;
  } else {
    const hours = parseDrivingHours(drivingTime);
    oneWayMiles = hours * avgSpeed;
  }

  const roundTripMiles = oneWayMiles * 2;
  const gallons = roundTripMiles / mpg;
  const cost = gallons * gasPrice;
  console.log(cost);
  return isNaN(cost) ? 0 : cost;
}

export default estimateRoundTripGasCost;