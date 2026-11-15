/**
 * The retired personal street. The pieces stay split so this source does not
 * contain the address. Tests use it to assert the address is absent.
 */
const STREET_NAME = ["Wap", "oot"].join("");
const STREET_NUMBER = ["40", "31"].join("");

export const RETIRED_STREET = new RegExp(`${STREET_NAME}|${STREET_NUMBER}`, "i");
