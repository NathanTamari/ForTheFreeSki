// Calculate multi-day lift ticket total from a base 1-day price
// Epic baseline multipliers (relative to 1-day price of 125)
import resorts from "./updated_resorts.json";

const EPIC_MULTIPLIERS = {
  1: 1.0,
  2: 240 / 125, // 1.92
  3: 350 / 125, // 2.8
  4: 453 / 125, // 3.624
  5: 550 / 125, // 4.4
  6: 640 / 125, // 5.12
  7: 723 / 125, // 5.784
};

// Build a quick lookup table once
const RESORT_BY_NAME = Object.fromEntries(
  resorts
    .filter((r) => r?.name)
    .map((r) => [String(r.name).toLowerCase(), r])
);

function getMultiDayTicketCost(
  basePrice,
  days,
  guests,
  hasEpicPass,
  hasIkonPass,
  resortName
) {
  if (!basePrice || !isFinite(basePrice) || !days || days < 1) return null;

  const g = Number(guests) || 1;

  // Look up resort in JSON
  const resort =
    typeof resortName === "string"
      ? RESORT_BY_NAME[resortName.toLowerCase()]
      : null;

  const resortEpic = !!resort?.Epic;
  const resortIkon = !!resort?.Ikon;

  // Pass only applies if resort participates
  if ((hasEpicPass && resortEpic) || (hasIkonPass && resortIkon)) {
    return 0;
  }

  // Multi-day pricing curve
  let factor;
  if (days <= 7) {
    factor = EPIC_MULTIPLIERS[days] ?? EPIC_MULTIPLIERS[7];
  } else {
    const day7Factor = EPIC_MULTIPLIERS[7];
    const avgPerDayAt7 = day7Factor / 7;
    const extraDays = days - 7;
    factor = day7Factor + extraDays * avgPerDayAt7;
  }

  return basePrice * factor * g;
}

export default getMultiDayTicketCost;
