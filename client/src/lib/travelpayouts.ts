const TP_MARKER = import.meta.env.VITE_TRAVELPAYOUTS_MARKER || "";

function addMarker(url: string): string {
  if (!TP_MARKER) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}marker=${TP_MARKER}`;
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

  window.open(addMarker(targetUrl), "_blank");
}

export function searchHotels(city: string, checkin?: string, checkout?: string) {
  let targetUrl = `https://search.hotellook.com/?destination=${encodeURIComponent(city)}`;
  if (checkin) targetUrl += `&checkIn=${checkin}`;
  if (checkout) targetUrl += `&checkOut=${checkout}`;
  targetUrl += "&adults=1";

  window.open(addMarker(targetUrl), "_blank");
}

export function searchKiwiFlights(fromCity?: string, toCity?: string, date?: string) {
  let targetUrl = "https://www.kiwi.com/en/search/results";
  const params: string[] = [];
  if (fromCity) params.push(`flyFrom=${encodeURIComponent(fromCity)}`);
  if (toCity) params.push(`to=${encodeURIComponent(toCity)}`);
  if (date) params.push(`departure=${date}`);
  if (params.length > 0) targetUrl += "?" + params.join("&");

  window.open(targetUrl, "_blank");
}

export function searchRentalCars(city: string, pickupDate?: string) {
  let targetUrl = `https://www.rentalcars.com/search-results?location=${encodeURIComponent(city)}`;
  if (pickupDate) targetUrl += `&puDay=${pickupDate}`;

  window.open(targetUrl, "_blank");
}

export function searchTransfers(fromCity: string, toCity?: string) {
  let targetUrl = `https://www.gettransfer.com/en?from=${encodeURIComponent(fromCity)}`;
  if (toCity) targetUrl += `&to=${encodeURIComponent(toCity)}`;

  window.open(targetUrl, "_blank");
}

export function searchInsurance() {
  window.open("https://www.insubuy.com/travel-medical-insurance/", "_blank");
}

export function openNordVPN() {
  window.open("https://nordvpn.com/", "_blank");
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
    url: addMarker(hotelUrl),
    label: `Hotel a ${city}`,
    icon: "hotel",
  });

  let flightUrl = `https://www.aviasales.com/search?destination_name=${cityEnc}&adults=1`;
  links.push({
    provider: "Aviasales",
    category: "flights",
    url: addMarker(flightUrl),
    label: `Voli per ${city}`,
    icon: "plane",
  });

  let kiwiUrl = `https://www.kiwi.com/en/search/results?to=${cityEnc}`;
  links.push({
    provider: "Kiwi.com",
    category: "flights",
    url: kiwiUrl,
    label: `Voli low-cost per ${city}`,
    icon: "plane",
  });

  let carUrl = `https://www.rentalcars.com/search-results?location=${cityEnc}`;
  links.push({
    provider: "Rentalcars",
    category: "cars",
    url: carUrl,
    label: `Noleggio auto a ${city}`,
    icon: "car",
  });

  let transferUrl = `https://www.gettransfer.com/en?from=${cityEnc}`;
  links.push({
    provider: "GetTransfer",
    category: "transfer",
    url: transferUrl,
    label: `Transfer da ${city}`,
    icon: "bus",
  });

  links.push({
    provider: "Insubuy",
    category: "insurance",
    url: "https://www.insubuy.com/travel-medical-insurance/",
    label: "Assicurazione viaggio",
    icon: "shield",
  });

  links.push({
    provider: "NordVPN",
    category: "vpn",
    url: "https://nordvpn.com/",
    label: "VPN per WiFi sicuro",
    icon: "lock",
  });

  return links;
}
