const TP_MARKER = import.meta.env.VITE_TRAVELPAYOUTS_MARKER || "";

function buildTpRedirect(targetUrl: string, subId?: string): string {
  if (!TP_MARKER) return targetUrl;
  const marker = subId ? `${TP_MARKER}.${subId}` : TP_MARKER;
  return `https://tp.media/r?marker=${marker}&trs=nomadlife&p=4370&u=${encodeURIComponent(targetUrl)}`;
}

export function searchFlights(fromCity?: string, toCity?: string, date?: string) {
  let targetUrl = "https://www.aviasales.com/search";
  const params: string[] = [];
  if (fromCity) params.push(`origin_name=${encodeURIComponent(fromCity)}`);
  if (toCity) params.push(`destination_name=${encodeURIComponent(toCity)}`);
  if (date) params.push(`depart_date=${date}`);
  params.push("adults=1");
  params.push("trip_class=0");
  if (params.length > 0) targetUrl += "?" + params.join("&");

  const url = TP_MARKER ? buildTpRedirect(targetUrl, "flights") : targetUrl;
  window.open(url, "_blank");
}

export function searchHotels(city: string, checkin?: string, checkout?: string) {
  let targetUrl = `https://search.hotellook.com/?destination=${encodeURIComponent(city)}`;
  if (checkin) targetUrl += `&checkIn=${checkin}`;
  if (checkout) targetUrl += `&checkOut=${checkout}`;
  targetUrl += "&adults=1";

  const url = TP_MARKER ? buildTpRedirect(targetUrl, "hotels") : targetUrl;
  window.open(url, "_blank");
}
