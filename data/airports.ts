export interface Airport {
  code: string;
  name: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

/**
 * Enough coverage to resolve every catalog destination plus the cities Indian
 * groups usually fly from. Used to pick a nearest airport for an origin and to
 * generate deterministic demo flights; live search resolves codes with Duffel.
 */
export const AIRPORTS: Airport[] = [
  { code: "BLR", name: "Kempegowda International", city: "Bengaluru", countryCode: "IN", latitude: 13.1986, longitude: 77.7066 },
  { code: "DEL", name: "Indira Gandhi International", city: "Delhi", countryCode: "IN", latitude: 28.5562, longitude: 77.1 },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj", city: "Mumbai", countryCode: "IN", latitude: 19.0896, longitude: 72.8656 },
  { code: "MAA", name: "Chennai International", city: "Chennai", countryCode: "IN", latitude: 12.9941, longitude: 80.1709 },
  { code: "HYD", name: "Rajiv Gandhi International", city: "Hyderabad", countryCode: "IN", latitude: 17.2403, longitude: 78.4294 },
  { code: "CCU", name: "Netaji Subhas Chandra Bose", city: "Kolkata", countryCode: "IN", latitude: 22.6547, longitude: 88.4467 },
  { code: "PNQ", name: "Pune Airport", city: "Pune", countryCode: "IN", latitude: 18.5822, longitude: 73.9197 },
  { code: "AMD", name: "Sardar Vallabhbhai Patel", city: "Ahmedabad", countryCode: "IN", latitude: 23.0772, longitude: 72.6347 },
  { code: "COK", name: "Cochin International", city: "Kochi", countryCode: "IN", latitude: 10.152, longitude: 76.4019 },
  { code: "GOX", name: "Manohar International", city: "Goa", countryCode: "IN", latitude: 15.7433, longitude: 73.8578 },
  { code: "GOI", name: "Dabolim", city: "Goa", countryCode: "IN", latitude: 15.3808, longitude: 73.8314 },
  { code: "JAI", name: "Jaipur International", city: "Jaipur", countryCode: "IN", latitude: 26.8242, longitude: 75.8122 },
  { code: "UDR", name: "Maharana Pratap", city: "Udaipur", countryCode: "IN", latitude: 24.6177, longitude: 73.8961 },
  { code: "JSA", name: "Jaisalmer", city: "Jaisalmer", countryCode: "IN", latitude: 26.8887, longitude: 70.865 },
  { code: "JDH", name: "Jodhpur", city: "Jodhpur", countryCode: "IN", latitude: 26.2511, longitude: 73.0489 },
  { code: "KUU", name: "Bhuntar", city: "Kullu", countryCode: "IN", latitude: 31.8767, longitude: 77.1544 },
  { code: "DHM", name: "Gaggal", city: "Dharamshala", countryCode: "IN", latitude: 32.1651, longitude: 76.2634 },
  { code: "DED", name: "Jolly Grant", city: "Dehradun", countryCode: "IN", latitude: 30.1897, longitude: 78.1803 },
  { code: "IXL", name: "Kushok Bakula Rimpochee", city: "Leh", countryCode: "IN", latitude: 34.1359, longitude: 77.5465 },
  { code: "SLV", name: "Shimla", city: "Shimla", countryCode: "IN", latitude: 31.0818, longitude: 77.068 },
  { code: "ATQ", name: "Sri Guru Ram Dass Jee", city: "Amritsar", countryCode: "IN", latitude: 31.7096, longitude: 74.7973 },
  { code: "IXB", name: "Bagdogra", city: "Siliguri", countryCode: "IN", latitude: 26.6812, longitude: 88.3286 },
  { code: "SHL", name: "Shillong", city: "Shillong", countryCode: "IN", latitude: 25.7036, longitude: 91.9787 },
  { code: "GAU", name: "Lokpriya Gopinath Bordoloi", city: "Guwahati", countryCode: "IN", latitude: 26.1061, longitude: 91.5859 },
  { code: "TRV", name: "Trivandrum International", city: "Thiruvananthapuram", countryCode: "IN", latitude: 8.4821, longitude: 76.9201 },
  { code: "CCJ", name: "Calicut International", city: "Kozhikode", countryCode: "IN", latitude: 11.1368, longitude: 75.9553 },
  { code: "MYQ", name: "Mysuru", city: "Mysuru", countryCode: "IN", latitude: 12.23, longitude: 76.6557 },
  { code: "HBX", name: "Hubballi", city: "Hubballi", countryCode: "IN", latitude: 15.3617, longitude: 75.0849 },
  { code: "IXG", name: "Belagavi", city: "Belagavi", countryCode: "IN", latitude: 15.8593, longitude: 74.6183 },
  { code: "CJB", name: "Coimbatore International", city: "Coimbatore", countryCode: "IN", latitude: 11.03, longitude: 77.0434 },
  { code: "PNY", name: "Puducherry", city: "Puducherry", countryCode: "IN", latitude: 11.9689, longitude: 79.812 },
  { code: "IXZ", name: "Veer Savarkar International", city: "Port Blair", countryCode: "IN", latitude: 11.6412, longitude: 92.7297 },
  { code: "LKO", name: "Chaudhary Charan Singh", city: "Lucknow", countryCode: "IN", latitude: 26.7606, longitude: 80.8893 },
  { code: "IXC", name: "Chandigarh", city: "Chandigarh", countryCode: "IN", latitude: 30.6735, longitude: 76.7885 },
  { code: "NAG", name: "Dr. Babasaheb Ambedkar", city: "Nagpur", countryCode: "IN", latitude: 21.0922, longitude: 79.0472 },
  { code: "BBI", name: "Biju Patnaik", city: "Bhubaneswar", countryCode: "IN", latitude: 20.2444, longitude: 85.8178 },
  { code: "IDR", name: "Devi Ahilyabai Holkar", city: "Indore", countryCode: "IN", latitude: 22.7218, longitude: 75.8011 },
  { code: "BKK", name: "Suvarnabhumi", city: "Bangkok", countryCode: "TH", latitude: 13.69, longitude: 100.7501 },
  { code: "DMK", name: "Don Mueang", city: "Bangkok", countryCode: "TH", latitude: 13.9126, longitude: 100.607 },
  { code: "HKT", name: "Phuket International", city: "Phuket", countryCode: "TH", latitude: 8.1132, longitude: 98.3169 },
  { code: "KBV", name: "Krabi", city: "Krabi", countryCode: "TH", latitude: 8.0992, longitude: 98.9862 },
  { code: "DPS", name: "Ngurah Rai", city: "Denpasar", countryCode: "ID", latitude: -8.7482, longitude: 115.1675 },
  { code: "SIN", name: "Changi", city: "Singapore", countryCode: "SG", latitude: 1.3644, longitude: 103.9915 },
  { code: "KUL", name: "Kuala Lumpur International", city: "Kuala Lumpur", countryCode: "MY", latitude: 2.7456, longitude: 101.7099 },
  { code: "DAD", name: "Da Nang International", city: "Da Nang", countryCode: "VN", latitude: 16.0439, longitude: 108.1994 },
  { code: "CMB", name: "Bandaranaike International", city: "Colombo", countryCode: "LK", latitude: 7.1808, longitude: 79.8841 },
  { code: "MLE", name: "Velana International", city: "Malé", countryCode: "MV", latitude: 4.1918, longitude: 73.5291 },
  { code: "KTM", name: "Tribhuvan International", city: "Kathmandu", countryCode: "NP", latitude: 27.6966, longitude: 85.3591 },
  { code: "PKR", name: "Pokhara International", city: "Pokhara", countryCode: "NP", latitude: 28.2011, longitude: 83.982 },
  { code: "DXB", name: "Dubai International", city: "Dubai", countryCode: "AE", latitude: 25.2532, longitude: 55.3657 },
  { code: "DWC", name: "Al Maktoum International", city: "Dubai", countryCode: "AE", latitude: 24.8964, longitude: 55.1614 },
  { code: "AUH", name: "Zayed International", city: "Abu Dhabi", countryCode: "AE", latitude: 24.433, longitude: 54.6511 },
  { code: "DOH", name: "Hamad International", city: "Doha", countryCode: "QA", latitude: 25.2731, longitude: 51.6081 },
  { code: "GYD", name: "Heydar Aliyev", city: "Baku", countryCode: "AZ", latitude: 40.4675, longitude: 50.0467 },
  { code: "TBS", name: "Tbilisi International", city: "Tbilisi", countryCode: "GE", latitude: 41.6692, longitude: 44.9547 },
  { code: "ALA", name: "Almaty International", city: "Almaty", countryCode: "KZ", latitude: 43.3521, longitude: 77.0405 },
  { code: "IST", name: "Istanbul Airport", city: "Istanbul", countryCode: "TR", latitude: 41.2753, longitude: 28.7519 },
  { code: "SAW", name: "Sabiha Gökçen", city: "Istanbul", countryCode: "TR", latitude: 40.8986, longitude: 29.3092 },
  { code: "LIS", name: "Humberto Delgado", city: "Lisbon", countryCode: "PT", latitude: 38.7813, longitude: -9.1359 },
  { code: "PRG", name: "Václav Havel", city: "Prague", countryCode: "CZ", latitude: 50.1008, longitude: 14.26 },
  { code: "FCO", name: "Leonardo da Vinci", city: "Rome", countryCode: "IT", latitude: 41.8003, longitude: 12.2389 },
  { code: "CIA", name: "Ciampino", city: "Rome", countryCode: "IT", latitude: 41.7994, longitude: 12.5949 },
  { code: "BCN", name: "Josep Tarradellas", city: "Barcelona", countryCode: "ES", latitude: 41.2974, longitude: 2.0833 },
  { code: "AMS", name: "Schiphol", city: "Amsterdam", countryCode: "NL", latitude: 52.3105, longitude: 4.7683 },
  { code: "ZRH", name: "Zurich Airport", city: "Zurich", countryCode: "CH", latitude: 47.4647, longitude: 8.5492 },
  { code: "BRN", name: "Bern Airport", city: "Bern", countryCode: "CH", latitude: 46.9141, longitude: 7.4971 },
];

const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export function getAirport(code: string): Airport | undefined {
  return BY_CODE.get(code.toUpperCase());
}

/** Nearest airport to a coordinate, used to derive an origin airport. */
export function nearestAirport(latitude: number, longitude: number): Airport | null {
  let best: Airport | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const airport of AIRPORTS) {
    const d = (airport.latitude - latitude) ** 2 + (airport.longitude - longitude) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = airport;
    }
  }
  return best;
}

/** Best-effort airport for a typed city name when we have no coordinates. */
export function airportForCity(city: string): Airport | null {
  const needle = city.trim().toLowerCase();
  if (!needle) return null;
  return (
    AIRPORTS.find((a) => a.city.toLowerCase() === needle) ??
    AIRPORTS.find((a) => needle.includes(a.city.toLowerCase())) ??
    AIRPORTS.find((a) => a.city.toLowerCase().includes(needle)) ??
    null
  );
}
