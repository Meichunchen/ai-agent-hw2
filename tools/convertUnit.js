// 單位換算工具：支援攝氏/華氏、公里/英里、公斤/磅 三組雙向換算

export const convertUnitTool = {
  type: "function",
  function: {
    name: "convert_unit",
    description:
      "進行單位換算。支援三組單位的雙向換算：攝氏(°C) ↔ 華氏(°F)、公里(km) ↔ 英里(mile)、公斤(kg) ↔ 磅(lb)。",
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "number",
          description: "要換算的數值，例如 25",
        },
        from_unit: {
          type: "string",
          description:
            "原始單位。可使用的值：c / celsius / 攝氏、f / fahrenheit / 華氏、km / 公里、mile / mi / 英里、kg / 公斤、lb / pound / 磅",
        },
        to_unit: {
          type: "string",
          description:
            "目標單位。可使用的值：c / celsius / 攝氏、f / fahrenheit / 華氏、km / 公里、mile / mi / 英里、kg / 公斤、lb / pound / 磅",
        },
      },
      required: ["value", "from_unit", "to_unit"],
    },
  },
};

// 單位別名 → 標準代號
const UNIT_ALIASES = {
  c: "c", "°c": "c", celsius: "c", 攝氏: "c", 度c: "c",
  f: "f", "°f": "f", fahrenheit: "f", 華氏: "f", 度f: "f",
  km: "km", kilometer: "km", kilometers: "km", 公里: "km",
  mi: "mi", mile: "mi", miles: "mi", 英里: "mi",
  kg: "kg", kilogram: "kg", kilograms: "kg", 公斤: "kg",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb", 磅: "lb",
};

// 換算公式表
const CONVERTERS = {
  "c->f": (v) => (v * 9) / 5 + 32,
  "f->c": (v) => ((v - 32) * 5) / 9,
  "km->mi": (v) => v * 0.621371,
  "mi->km": (v) => v / 0.621371,
  "kg->lb": (v) => v * 2.20462,
  "lb->kg": (v) => v / 2.20462,
};

function normalize(unit) {
  if (typeof unit !== "string") return null;
  const key = unit.toLowerCase().trim();
  return UNIT_ALIASES[key] ?? null;
}

const UNIT_LABEL = {
  c: "°C（攝氏）",
  f: "°F（華氏）",
  km: "公里",
  mi: "英里",
  kg: "公斤",
  lb: "磅",
};

export async function convertUnit({ value, from_unit, to_unit }) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return {
      error: `value 必須是數字，收到的是: ${JSON.stringify(value)}`,
    };
  }

  const from = normalize(from_unit);
  const to = normalize(to_unit);

  if (!from) {
    return {
      error: `不支援的原始單位「${from_unit}」`,
      supported_units: Object.values(UNIT_LABEL),
    };
  }
  if (!to) {
    return {
      error: `不支援的目標單位「${to_unit}」`,
      supported_units: Object.values(UNIT_LABEL),
    };
  }

  if (from === to) {
    return {
      value,
      from_unit: UNIT_LABEL[from],
      to_unit: UNIT_LABEL[to],
      result: value,
      note: "原始單位與目標單位相同",
    };
  }

  const fn = CONVERTERS[`${from}->${to}`];
  if (!fn) {
    return {
      error: `不支援的單位組合：${UNIT_LABEL[from]} → ${UNIT_LABEL[to]}（只能在同類別內換算，例如溫度↔溫度、長度↔長度、重量↔重量）`,
      supported_conversions: Object.keys(CONVERTERS),
    };
  }

  const raw = fn(value);
  const result = Math.round(raw * 10000) / 10000;

  return {
    value,
    from_unit: UNIT_LABEL[from],
    to_unit: UNIT_LABEL[to],
    result,
  };
}
