function toMysqlDatetime(value) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid datetime");
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function toIsoString(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const asString = String(value);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(asString)) {
    return `${asString.replace(" ", "T")}Z`;
  }
  const date = new Date(asString);
  if (Number.isNaN(date.getTime())) return asString;
  return date.toISOString();
}

module.exports = { toMysqlDatetime, toIsoString };
