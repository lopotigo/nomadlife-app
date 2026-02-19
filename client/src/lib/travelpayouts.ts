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

export function searchKiwiFlights(fromCity?: string, toCity?: string, date?: string) {
  let targetUrl = "https://www.kiwi.com/en/search/results";
  const params: string[] = [];
  if (fromCity) params.push(`flyFrom=${encodeURIComponent(fromCity)}`);
  if (toCity) params.push(`to=${encodeURIComponent(toCity)}`);
  if (date) params.push(`departure=${date}`);
  if (params.length > 0) targetUrl += "?" + params.join("&");

  const url = TP_MARKER ? buildTpRedirect(targetUrl, "kiwi") : targetUrl;
  window.open(url, "_blank");
}

export function searchRentalCars(city: string, pickupDate?: string) {
  let targetUrl = `https://www.rentalcars.com/search-results?location=${encodeURIComponent(city)}`;
  if (pickupDate) targetUrl += `&puDay=${pickupDate}`;

  const url = TP_MARKER ? buildTpRedirect(targetUrl, "rentalcars") : targetUrl;
  window.open(url, "_blank");
}

export function searchTransfers(fromCity: string, toCity?: string) {
  let targetUrl = `https://www.gettransfer.com/en?from=${encodeURIComponent(fromCity)}`;
  if (toCity) targetUrl += `&to=${encodeURIComponent(toCity)}`;

  const url = TP_MARKER ? buildTpRedirect(targetUrl, "transfer") : targetUrl;
  window.open(url, "_blank");
}

export function searchInsurance() {
  const targetUrl = "https://www.insubuy.com/travel-medical-insurance/";
  const url = TP_MARKER ? buildTpRedirect(targetUrl, "insurance") : targetUrl;
  window.open(url, "_blank");
}

export function openNordVPN() {
  const targetUrl = "https://nordvpn.com/";
  const url = TP_MARKER ? buildTpRedirect(targetUrl, "nordvpn") : targetUrl;
  window.open(url, "_blank");
}

export function getAffiliateLinks(city: string, checkin?: string, checkout?: string) {
  const cityEnc = encodeURIComponent(city);
  const links = [];

  let hotelUrl = `https://search.hotellook.com/?destination=${cityEnc}&adults=1`;
  if (checkin) hotelUrl += `&checkIn=${checkin}`;
  if (checkout) hotelUrl += `&checkOut=${checkout}`;
  links.push({
    provider: "Hotellook",
    category: "hotels",
    url: TP_MARKER ? buildTpRedirect(hotelUrl, "hotels") : hotelUrl,
    label: `Hotel a ${city}`,
    icon: "hotel",
  });

  let flightUrl = `https://www.aviasales.com/search?destination_name=${cityEnc}&adults=1`;
  links.push({
    provider: "Aviasales",
    category: "flights",
    url: TP_MARKER ? buildTpRedirect(flightUrl, "flights") : flightUrl,
    label: `Voli per ${city}`,
    icon: "plane",
  });

  let kiwiUrl = `https://www.kiwi.com/en/search/results?to=${cityEnc}`;
  links.push({
    provider: "Kiwi.com",
    category: "flights",
    url: TP_MARKER ? buildTpRedirect(kiwiUrl, "kiwi") : kiwiUrl,
    label: `Voli low-cost per ${city}`,
    icon: "plane",
  });

  let carUrl = `https://www.rentalcars.com/search-results?location=${cityEnc}`;
  links.push({
    provider: "Rentalcars",
    category: "cars",
    url: TP_MARKER ? buildTpRedirect(carUrl, "rentalcars") : carUrl,
    label: `Noleggio auto a ${city}`,
    icon: "car",
  });

  let transferUrl = `https://www.gettransfer.com/en?from=${cityEnc}`;
  links.push({
    provider: "GetTransfer",
    category: "transfer",
    url: TP_MARKER ? buildTpRedirect(transferUrl, "transfer") : transferUrl,
    label: `Transfer da ${city}`,
    icon: "bus",
  });

  links.push({
    provider: "Insubuy",
    category: "insurance",
    url: TP_MARKER ? buildTpRedirect("https://www.insubuy.com/travel-medical-insurance/", "insurance") : "https://www.insubuy.com/travel-medical-insurance/",
    label: "Assicurazione viaggio",
    icon: "shield",
  });

  links.push({
    provider: "NordVPN",
    category: "vpn",
    url: TP_MARKER ? buildTpRedirect("https://nordvpn.com/", "nordvpn") : "https://nordvpn.com/",
    label: "VPN per WiFi sicuro",
    icon: "lock",
  });

  return links;
}
